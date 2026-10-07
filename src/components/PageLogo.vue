<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'

// App-level logo mark rendered as a character matrix. First load just fades
// the settled mark in quietly (no motion storm on top of the page load).
// Page switches morph: the current icon's glyphs scatter outward in disorder,
// drift through random symbols, then condense into the next page's icon
// ("//" for home) and lock into stable glyphs, with a faint idle shimmer and
// occasional glitch bursts (torn bands, scrambled cells, chromatic fringe)
// afterwards. In-flight glyphs stay dim and churn slowly so the transition
// never out-shouts the content. Scatter points are drawn uniformly across
// the whole viewport — the disorder cloud spans the screen. Sits just under
// the digital-flow rain (z -1 vs the canvas' z 0); pages without an entry
// show nothing.
const route = useRoute()

const MARK_PX = 256 // mark area, centered in the view
const GRID = 24 // character cells per side
const CELL = MARK_PX / GRID
const GLYPH_PX = Math.floor(CELL)
const RASTER_PX = 256 // hidden SvgIcon raster source

const CHAOS_CHARS = '0123456789ABCDEF#@$%&*+=<>/\\|{}[]()^~:;.,?!'
const LOCK_CHARS = '0123456789ABCDEF'
// uniform fill for every glyph — DigitalFlow's cells vary per-cell, but a
// mark with patchy alpha just reads as dirty; below its starting band
// (0.30 + rand * 0.18) since even that midpoint read too dark for a mark
const GLYPH_ALPHA = 0.2

const PAGE_ICONS = {
  Moments: 'image',
  Articles: 'article',
  Repos: 'fork',
  Chats: 'chat-dots',
  Members: 'members'
}

const isHome = computed(() => route.name === 'Home')
const iconName = computed(() => PAGE_ICONS[route.name] || null)
const markKey = computed(() => (isHome.value ? '//' : iconName.value || ''))

const canvasRef = ref(null)
const srcRef = ref(null) // hidden SvgIcon used as the raster source

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let raf = 0
let particles = []
let gen = 0 // discards stale async mask builds on rapid switches
let nextFlickerAt = Infinity
let fadeStart = 0 // load-only: ramp the whole mark up from invisible
// glitch: short data-corruption bursts over the settled mark
let glitchUntil = 0
let nextGlitchAt = Infinity
let glitchBands = [] // {y0, y1, dx, scramble, chroma} — re-rolled mid-burst
let nextBandRoll = 0
let ghostDx = 0 // shared echo offset for the whole mark
let viewW = 0 // canvas CSS-px size (the area below the navbar)
let viewH = 0

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (s) => s[Math.floor(Math.random() * s.length)]
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

function monoStack() {
  return getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace'
}

// uniform over the whole viewport — the disorder cloud spans the screen
function scatterPoint() {
  return { x: Math.random() * viewW, y: Math.random() * viewH }
}

// threshold a supersampled raster of the mark into grid cells
function buildMask(draw) {
  const S = GRID * 2
  const off = document.createElement('canvas')
  off.width = S
  off.height = S
  const octx = off.getContext('2d')
  draw(octx, S)
  const data = octx.getImageData(0, 0, S, S).data
  const cells = []
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      let sum = 0
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          sum += data[(((gy * 2 + dy) * S) + (gx * 2 + dx)) * 4 + 3]
        }
      }
      if (sum / 1020 > 0.35) cells.push({ gx, gy })
    }
  }
  return cells
}

function drawTextMark(ctx, S) {
  ctx.font = `bold ${Math.round(S * 0.6)}px ${monoStack()}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('//', S / 2, S / 2)
}

function rasterIconImage() {
  return new Promise((resolve) => {
    const el = srcRef.value && srcRef.value.$el
    if (!el) return resolve(null)
    let xml = new XMLSerializer().serializeToString(el)
    if (!xml.includes('xmlns')) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  })
}

function makeParticle(sx, sy, vx, vy, tx, ty, dissolve, t0) {
  return {
    sx, sy, vx, vy, tx, ty,
    x: sx, y: sy,
    gx: null, gy: null, // target cell (resize resnap)
    t0,
    // burst out almost together, then gather with per-glyph stagger — kept
    // short so the morph is over before it can compete with the new page
    liftDelay: rand(0, 80),
    liftDur: rand(300, 450),
    formDelay: rand(0, 320),
    formDur: rand(550, 850),
    final: pick(LOCK_CHARS),
    glyph: pick(CHAOS_CHARS),
    nextGlyphAt: 0,
    flickerUntil: 0,
    dissolve
  }
}

// rebuild the particle set for a mark. First load materializes the settled
// glyphs in place; on a switch the current glyph positions become the starts
// — the old icon literally scatters and reforms.
function spawnParticles(cells) {
  const now = performance.now()
  const old = particles.map((p) => ({ x: p.x, y: p.y }))
  const n = cells.length
  const m = old.length
  const list = []
  const ox = (viewW - MARK_PX) / 2
  const oy = (viewH - MARK_PX) / 2

  if (!m) {
    // first load: no morph — quiet fade-in of the formed mark, so nothing
    // competes with the page content that is loading at the same time
    for (const c of cells) {
      const x = ox + (c.gx + 0.5) * CELL
      const y = oy + (c.gy + 0.5) * CELL
      const p = makeParticle(x, y, x, y, x, y, false, now - 10000)
      p.gx = c.gx
      p.gy = c.gy
      list.push(p)
    }
    particles = list
    fadeStart = now
    nextFlickerAt = now + 800
    // no glitch over the quiet load-in — first burst a couple seconds later
    glitchUntil = 0
    nextGlitchAt = now + rand(2000, 4500)
    return
  }

  for (let i = 0; i < n; i++) {
    const from = old[i < m ? i : Math.floor(Math.random() * m)]
    const via = scatterPoint()
    const c = cells[i]
    const p = makeParticle(
      from.x, from.y, via.x, via.y,
      ox + (c.gx + 0.5) * CELL,
      oy + (c.gy + 0.5) * CELL,
      false, now
    )
    p.gx = c.gx
    p.gy = c.gy
    list.push(p)
  }

  // surplus old glyphs drift away to a random screen point and dissolve
  for (let i = n; i < m; i++) {
    const via = scatterPoint()
    const out = scatterPoint()
    list.push(makeParticle(old[i].x, old[i].y, via.x, via.y, out.x, out.y, true, now))
  }

  // noise cloud: a few extra symbols dissolve while the mark condenses
  const extras = Math.round(n * 0.2)
  for (let i = 0; i < extras; i++) {
    const from = scatterPoint()
    const via = scatterPoint()
    const out = scatterPoint()
    list.push(makeParticle(from.x, from.y, via.x, via.y, out.x, out.y, true, now))
  }

  particles = list
  fadeStart = 0
  nextFlickerAt = now + 1600
  // the old mark corrupts for a beat before it scatters
  if (!reduced) startGlitch(now)
}

// glitch bands: horizontal tears across the mark area, re-rolled a few times
// per burst so the tear shimmers in place instead of sliding
function rollGlitchBands() {
  const oy = (viewH - MARK_PX) / 2
  glitchBands = []
  const n = 2 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    const h = CELL * (1 + Math.floor(Math.random() * 3))
    const y0 = oy + Math.random() * (MARK_PX - h)
    glitchBands.push({
      y0,
      y1: y0 + h,
      dx: (Math.random() < 0.5 ? -1 : 1) * rand(4, 22),
      scramble: Math.random() < 0.65,
      chroma: Math.random() < 0.55
    })
  }
  ghostDx = rand(-5, 5)
}

function startGlitch(now) {
  glitchUntil = now + rand(140, 360)
  rollGlitchBands()
  nextBandRoll = now + rand(50, 100)
  nextGlitchAt = glitchUntil + rand(2500, 7500)
}

function drawFrame(now) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, viewW, viewH)
  ctx.font = `bold ${GLYPH_PX}px ${monoStack()}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // DigitalFlow's static base colors (its rain reads the theme per frame too)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const rgb = isDark ? '75, 85, 99' : '107, 114, 128'
  const fadeAlpha = fadeStart ? Math.min(1, (now - fadeStart) / 500) : 1

  // glitch bursts: schedule, and re-roll the tear bands a few times mid-burst
  if (!reduced) {
    if (now < glitchUntil) {
      if (now >= nextBandRoll) {
        rollGlitchBands()
        nextBandRoll = now + rand(50, 110)
      }
    } else if (now >= nextGlitchAt) {
      // hold off while a morph is still flying — the chaos is already there
      const busy = particles.some(
        (p) => !p.dissolve && now < p.t0 + p.liftDelay + p.liftDur + p.formDelay + p.formDur
      )
      if (busy) nextGlitchAt = now + 300
      else startGlitch(now)
    }
  }
  const glitching = !reduced && now < glitchUntil

  for (const p of particles) {
    const lt = Math.min(1, Math.max(0, (now - p.t0 - p.liftDelay) / p.liftDur))
    let alpha = 1

    if (lt < 1) {
      // scattering out: dim, slow churn — drift, not strobe
      const e = easeOut(lt)
      p.x = p.sx + (p.vx - p.sx) * e
      p.y = p.sy + (p.vy - p.sy) * e
      if (now >= p.nextGlyphAt) {
        p.glyph = pick(CHAOS_CHARS)
        p.nextGlyphAt = now + 180 + Math.random() * 140
      }
      alpha = 0.45
    } else {
      const ft = Math.min(1, Math.max(0, (now - p.t0 - p.liftDelay - p.liftDur - p.formDelay) / p.formDur))
      const e = easeOut(ft)
      p.x = p.vx + (p.tx - p.vx) * e
      p.y = p.vy + (p.ty - p.vy) * e

      if (p.dissolve) {
        alpha = (1 - ft) * 0.45
        if (alpha <= 0.02) continue
        if (now >= p.nextGlyphAt) {
          p.glyph = pick(CHAOS_CHARS)
          p.nextGlyphAt = now + 180 + Math.random() * 140
        }
      } else if (ft < 1) {
        // condensing: brighten on landing, churn slows near the cell
        alpha = 0.45 + 0.55 * ft
        if (now >= p.nextGlyphAt) {
          p.glyph = pick(CHAOS_CHARS)
          p.nextGlyphAt = now + (ft < 0.6 ? 150 + Math.random() * 100 : 300 + Math.random() * 200)
        }
      } else if (now < p.flickerUntil) {
        if (now >= p.nextGlyphAt) {
          p.glyph = pick(LOCK_CHARS)
          p.nextGlyphAt = now + 70
        }
      } else {
        p.glyph = p.final
      }
    }
    // every glyph shares one alpha — only the motion factor varies
    const a = GLYPH_ALPHA * alpha * fadeAlpha
    let dx = 0
    let band = null
    if (glitching && !p.dissolve) {
      for (const b of glitchBands) {
        if (p.y >= b.y0 && p.y < b.y1) { band = b; break }
      }
      if (band) {
        dx = band.dx
        // torn cells churn through noise glyphs while displaced
        if (band.scramble && now >= p.nextGlyphAt) {
          p.glyph = pick(CHAOS_CHARS)
          p.nextGlyphAt = now + rand(40, 90)
        }
      }
    }
    if (glitching && !p.dissolve) {
      // whole-mark echo: faint ghost of every glyph at one shared offset
      ctx.fillStyle = `rgba(${rgb},${(a * 0.4).toFixed(3)})`
      ctx.fillText(p.glyph, p.x + dx + ghostDx, p.y)
      if (band && band.chroma) {
        // chromatic tear on displaced bands — glitch accent colors,
        // deliberately outside the theme (like digital-flow's spectrum hues)
        ctx.fillStyle = `rgba(255,70,90,${(a * 0.55).toFixed(3)})`
        ctx.fillText(p.glyph, p.x + dx - 2.5, p.y)
        ctx.fillStyle = `rgba(80,220,255,${(a * 0.55).toFixed(3)})`
        ctx.fillText(p.glyph, p.x + dx + 2.5, p.y)
      }
    }
    ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`
    ctx.fillText(p.glyph, p.x + dx, p.y)
  }

  // settled mark keeps a faint life: a few cells shimmer now and then
  if (!reduced && now >= nextFlickerAt) {
    for (let i = 0; i < 3 && particles.length; i++) {
      const p = particles[Math.floor(Math.random() * particles.length)]
      if (!p.dissolve) {
        p.flickerUntil = now + 150
        p.nextGlyphAt = 0
      }
    }
    nextFlickerAt = now + rand(250, 700)
  }
}

function loop(now) {
  drawFrame(now)
  raf = requestAnimationFrame(loop)
}

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  viewW = canvas.clientWidth
  viewH = canvas.clientHeight
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = viewW * dpr
  canvas.height = viewH * dpr
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
}

// resnap settled glyphs to the recentered mark on resize; drop in-flight noise
let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (!canvasRef.value) return
    setupCanvas()
    const now = performance.now()
    const ox = (viewW - MARK_PX) / 2
    const oy = (viewH - MARK_PX) / 2
    particles = particles.filter((p) => p.gx != null && !p.dissolve)
    for (const p of particles) {
      p.tx = ox + (p.gx + 0.5) * CELL
      p.ty = oy + (p.gy + 0.5) * CELL
      p.x = p.tx
      p.y = p.ty
      p.t0 = now - 10000
      p.glyph = p.final
    }
    drawFrame(now)
  }, 200)
}

async function startMark() {
  const myGen = ++gen
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas || myGen !== gen) return
  setupCanvas()

  let cells
  if (isHome.value) {
    cells = buildMask(drawTextMark)
  } else {
    const img = await rasterIconImage()
    if (myGen !== gen) return
    cells = img ? buildMask((ctx, S) => ctx.drawImage(img, 0, 0, S, S)) : []
  }
  if (myGen !== gen) return

  if (!cells.length) {
    particles = []
    drawFrame(performance.now())
    return
  }
  spawnParticles(cells)

  if (reduced) {
    // no scatter/reform: show the settled mark directly
    const now = performance.now()
    particles = particles.filter((p) => !p.dissolve)
    for (const p of particles) {
      p.t0 = now - 10000
    }
    drawFrame(now)
    return
  }
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(loop)
}

watch(
  markKey,
  (key) => {
    if (!key) {
      gen++
      particles = []
      cancelAnimationFrame(raf)
      raf = 0
      return
    }
    startMark()
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  gen++
  cancelAnimationFrame(raf)
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div v-if="markKey" class="page-logo" aria-hidden="true">
    <canvas ref="canvasRef" class="page-logo__canvas"></canvas>
    <!-- hidden raster source for icon marks (serialized into the mask) -->
    <SvgIcon v-if="iconName" ref="srcRef" :name="iconName" :size="RASTER_PX" class="page-logo__src" />
  </div>
</template>

<style scoped>
.page-logo {
  /* centered in the main area under the navbar */
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* just under the digital-flow rain (z0): the mark sits on the page
     background, the rain streaks over it, and content (z1) scrolls over
     both */
  z-index: -1;
  pointer-events: none;
  user-select: none;
}
.page-logo__canvas {
  /* full main-area surface: glyphs scatter anywhere on screen */
  display: block;
  width: 100%;
  height: 100%;
  /* no CSS tint/opacity: each glyph paints its own rgba matching
     DigitalFlow's static rain colors */
}
.page-logo__src {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
}
</style>

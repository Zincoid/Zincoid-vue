<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useWalkman } from '@/composables/useWalkman'

const { audioEl, isPlaying } = useWalkman()

const canvasRef = ref(null)
let animationId = null

const FONT_SIZE = 12
const CELL_W = 18
const CELL_H = 17
const MARGIN_WIDTH = 140
const HOT_RADIUS = 100

const CHARS = '0123456789ABCDEF'

let cells = []
let timer = null
let mouseX = -9999
let mouseY = -9999
let lastTime = 0

let ctx = null
let analyser = null
let analyserForEl = null
let freqData = null

function ensureAnalyser() {
  const el = audioEl.value
  if (!el) return
  if (analyser && analyserForEl === el) return
  try {
    if (ctx) ctx.close().catch(() => {})
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    const src = ctx.createMediaElementSource(el)
    analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.75
    src.connect(analyser)
    analyser.connect(ctx.destination)
    analyserForEl = el
    freqData = new Uint8Array(analyser.frequencyBinCount)
  } catch { /* ignore */ }
}

function buildCells() {
  const w = canvasRef.value?.width || window.innerWidth
  const h = canvasRef.value?.height || window.innerHeight
  cells = []

  const centerX = Math.floor(w / 2)

  for (let x = 4; x < centerX - 4; x += CELL_W) {
    for (let y = CELL_H; y < h - 4; y += CELL_H) {
      cells.push({ x, y, v: randomChar(), next: Math.random() * 4, alpha: 0.16 + Math.random() * 0.10 })
    }
  }
  for (let x = centerX + 4; x < w - 4; x += CELL_W) {
    for (let y = CELL_H; y < h - 4; y += CELL_H) {
      cells.push({ x, y, v: randomChar(), next: Math.random() * 4, alpha: 0.16 + Math.random() * 0.10 })
    }
  }
}

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

function tick(now) {
  const canvas = canvasRef.value
  if (!canvas) return
  const dt = Math.min((now - lastTime) / 1000, 0.1) // seconds, cap at 100ms
  lastTime = now

  const ctx2d = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height

  let spectrum = false
  if (isPlaying.value && audioEl.value) {
    ensureAnalyser()
    if (analyser) {
      analyser.getByteFrequencyData(freqData)
      spectrum = true
    }
  }

  // Update cells
  for (const cell of cells) {
    const dx = cell.x - mouseX
    const dy = cell.y - mouseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const factor = dist < HOT_RADIUS ? 1 - dist / HOT_RADIUS : 0

    // Speed: 0.5s~4s normally, near cursor 0.03s~0.15s
    const speed = spectrum ? 0.1 + (1 - factor) * 0.4 : 0.3 + (1 - factor) * 4
    cell.next -= dt
    if (cell.next <= 0) {
      cell.v = randomChar()
      cell.next = speed * (0.1 + Math.random() * 0.3)
      // Sudden jump in brightness on change
      cell.alpha = 0.14 + factor * 0.42 + Math.random() * 0.05
    }
  }

  // Draw
  ctx2d.clearRect(0, 0, w, h)
  ctx2d.font = `${FONT_SIZE}px "Courier New", monospace`
  ctx2d.textAlign = 'center'
  ctx2d.textBaseline = 'middle'

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const baseR = isDark ? 75 : 17
  const baseG = isDark ? 85 : 24
  const baseB = isDark ? 99 : 39

  if (spectrum) {
    const bins = freqData.length
    const centerX = w / 2
    const maxBarLen = (centerX - 8) * 0.5
    for (const cell of cells) {
      const isLeft = cell.x < centerX
      const edgeDist = isLeft ? cell.x : w - cell.x
      const rowY = isLeft ? cell.y : h - cell.y
      const idx = Math.min(bins - 1, Math.floor((rowY / h) * bins * 0.6))
      const m = freqData[idx] / 255
      const barLen = m * maxBarLen
      if (edgeDist > barLen) continue
      const ratio = 1 - edgeDist / Math.max(barLen, 1)
      const alpha = 0.12 + Math.pow(ratio, 0.7) * Math.pow(m, 0.6) * 0.85
      const r = Math.round(baseR + (219 - baseR) * m)
      const g = Math.round(baseG + (39 - baseG) * m)
      const b = Math.round(baseB + (119 - baseB) * m)
      ctx2d.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
      ctx2d.fillText(cell.v, cell.x, cell.y)
    }
  } else {
    for (const cell of cells) {
      if (cell.x < MARGIN_WIDTH || cell.x > w - MARGIN_WIDTH) {
        ctx2d.fillStyle = isDark
          ? `rgba(75,85,99,${cell.alpha.toFixed(3)})`
          : `rgba(17,24,39,${cell.alpha.toFixed(3)})`
        ctx2d.fillText(cell.v, cell.x, cell.y)
      }
    }
  }

  // Horizontal fade (skip in spectrum mode so bars stay visible)
  const fadeW = Math.min(MARGIN_WIDTH, w * 0.15)
  ctx2d.save()
  ctx2d.globalCompositeOperation = 'destination-out'
  const gradient = ctx2d.createLinearGradient(0, 0, w, 0)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(fadeW / w, spectrum ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)')
  gradient.addColorStop(1 - fadeW / w, spectrum ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx2d.fillStyle = gradient
  ctx2d.fillRect(0, 0, w, h)
  ctx2d.restore()

  animationId = requestAnimationFrame(tick)
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  buildCells()
}

function onMouseMove(e) {
  mouseX = e.clientX
  mouseY = e.clientY
}

onMounted(() => {
  resize()
  lastTime = performance.now()
  animationId = requestAnimationFrame(tick)
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(resize, 300)
  })
  window.addEventListener('mousemove', onMouseMove)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  clearTimeout(timer)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <canvas ref="canvasRef" class="digital-flow" />
</template>

<style scoped>
.digital-flow {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

@media (max-width: 1275px) {
  .digital-flow {
    display: none;
  }
}
</style>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({ seed: { type: Number, default: 0 } })

const canvasRef = ref(null)
let ro = null

function render() {
  const canvas = canvasRef.value
  const parent = canvas?.parentElement
  if (!canvas || !parent) return
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }
  const c = canvas.getContext('2d')
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.clearRect(0, 0, w, h)

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  c.globalAlpha = isDark ? 0.55 : 0.45
  c.fillStyle = isDark
    ? getComputedStyle(canvas).color
    : 'rgb(34, 122, 74)'
  const dot = 4.5
  const pitch = 8
  const cols = Math.max(1, Math.floor((w - dot - 2) / pitch)) + 1
  const rows = Math.max(1, Math.floor((h - dot - 2) / pitch)) + 1
  const startX = w - dot - (cols - 1) * pitch
  const startY = Math.round((h - dot - (rows - 1) * pitch) / 2)
  // skip dots hidden behind the trailing 新建 button
  const excluded = []
  const canvasRect = canvas.getBoundingClientRect()
  parent.querySelectorAll('.btn--primary').forEach(btn => {
    const r = btn.getBoundingClientRect()
    excluded.push({
      x1: r.left - canvasRect.left - 2,
      y1: r.top - canvasRect.top - 2,
      x2: r.right - canvasRect.left + 2,
      y2: r.bottom - canvasRect.top + 2
    })
  })

  for (let col = 0; col < cols; col++) {
    const p = 0.08 + (col / Math.max(cols - 1, 1)) * 0.85
    for (let row = 0; row < rows; row++) {
      if (Math.random() >= p) continue
      const x = startX + col * pitch
      const y = startY + row * pitch
      const faded = excluded.some(e => x + dot > e.x1 && x < e.x2 && y + dot > e.y1 && y < e.y2)
      c.globalAlpha = faded ? 0.25 : (isDark ? 0.55 : 0.65) + Math.random() * 0.35
      c.fillRect(x, y, dot, dot)
    }
  }

  // horizontal fade toward the title (left)
  const g = c.createLinearGradient(w, 0, w - w * 0.65, 0)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.globalCompositeOperation = 'destination-in'
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
}

let ro2 = null
function onThemeChange() {
  render()
}

let timer = null

function startShuffle() {
  clearInterval(timer)
  timer = setInterval(render, 250)
}

function stopShuffle() {
  clearInterval(timer)
  timer = null
}

onMounted(() => {
  ro2 = new MutationObserver(onThemeChange)
  ro2.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  ro = new ResizeObserver(() => {
    clearTimeout(render._t)
    render._t = setTimeout(render, 120)
  })
  ro.observe(canvasRef.value?.parentElement)
  render()
  startShuffle()
})

onUnmounted(() => {
  stopShuffle()
  ro?.disconnect()
  ro2?.disconnect()
  clearTimeout(render._t)
})

watch(() => props.seed, render)
</script>

<template>
  <canvas ref="canvasRef" class="dot-banner" />
</template>

<style scoped>
.dot-banner {
  position: absolute;
  top: var(--spacing-2xl);
  right: 0;
  bottom: var(--spacing-2xl);
  width: 550px;
  height: calc(100% - var(--spacing-2xl) * 2);
  pointer-events: none;
  color: var(--color-accent);
}
</style>

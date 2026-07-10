<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

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

function buildCells() {
  const w = canvasRef.value?.width || window.innerWidth
  const h = canvasRef.value?.height || window.innerHeight
  cells = []

  const leftEnd = MARGIN_WIDTH
  const rightStart = w - MARGIN_WIDTH

  for (let x = 4; x < leftEnd - 4; x += CELL_W) {
    for (let y = CELL_H; y < h - 4; y += CELL_H) {
      cells.push({ x, y, v: randomChar(), next: Math.random() * 4, alpha: 0.10 + Math.random() * 0.08 })
    }
  }
  for (let x = rightStart + 4; x < w - 4; x += CELL_W) {
    for (let y = CELL_H; y < h - 4; y += CELL_H) {
      cells.push({ x, y, v: randomChar(), next: Math.random() * 4, alpha: 0.10 + Math.random() * 0.08 })
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

  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height

  // Update cells
  for (const cell of cells) {
    const dx = cell.x - mouseX
    const dy = cell.y - mouseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const factor = dist < HOT_RADIUS ? 1 - dist / HOT_RADIUS : 0

    // Speed: 0.5s~4s normally, near cursor 0.03s~0.15s
    const speed = 0.3 + (1 - factor) * 4
    cell.next -= dt
    if (cell.next <= 0) {
      cell.v = randomChar()
      cell.next = speed * (0.1 + Math.random() * 0.3)
      // Sudden jump in brightness on change
      cell.alpha = 0.09 + factor * 0.42 + Math.random() * 0.05
    }
  }

  // Draw
  ctx.clearRect(0, 0, w, h)
  ctx.font = `${FONT_SIZE}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const cell of cells) {
    ctx.fillStyle = `rgba(17,24,39,${cell.alpha.toFixed(3)})`
    ctx.fillText(cell.v, cell.x, cell.y)
  }

  // Horizontal fade
  const fadeW = Math.min(MARGIN_WIDTH, w * 0.15)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  const gradient = ctx.createLinearGradient(0, 0, w, 0)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(fadeW / w, 'rgba(0,0,0,1)')
  gradient.addColorStop(1 - fadeW / w, 'rgba(0,0,0,1)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

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

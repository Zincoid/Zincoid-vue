<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
let intervalId = null

const FONT_SIZE = 13
const CELL_W = 20
const CELL_H = 18
const MARGIN_WIDTH = 140
const TICK_MS = 200

const COLORS = [
  'rgba(17,24,39,0.10)',
  'rgba(17,24,39,0.16)',
  'rgba(17,24,39,0.22)',
  'rgba(75,85,99,0.12)',
  'rgba(75,85,99,0.18)',
]

let cells = []
let timer = null

function buildCells() {
  const w = canvasRef.value?.width || window.innerWidth
  const h = canvasRef.value?.height || window.innerHeight
  cells = []

  const leftEnd = MARGIN_WIDTH
  const rightStart = w - MARGIN_WIDTH

  for (let x = 4; x < leftEnd - 4; x += CELL_W) {
    for (let y = CELL_H; y < h - 4; y += CELL_H) {
      cells.push({ x, y, v: randomDigit(), next: randomDelay() })
    }
  }
  for (let x = rightStart + 4; x < w - 4; x += CELL_W) {
    for (let y = CELL_H; y < h - 4; y += CELL_H) {
      cells.push({ x, y, v: randomDigit(), next: randomDelay() })
    }
  }
}

function randomDigit() {
  const chars = '0123456789ABCDEF'
  return chars[Math.floor(Math.random() * chars.length)]
}

function randomDelay() {
  return TICK_MS + Math.random() * 3000
}

function tick() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  for (const cell of cells) {
    cell.next -= TICK_MS
    if (cell.next <= 0) {
      cell.v = randomDigit()
      cell.next = randomDelay()
    }
  }

  // Redraw
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = `${FONT_SIZE}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const cell of cells) {
    ctx.fillStyle = COLORS[Math.floor(Math.random() * COLORS.length)]
    ctx.fillText(cell.v, cell.x, cell.y)
  }

  // Horizontal fade: visible at edges, transparent toward center
  const w = canvas.width, h = canvas.height
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
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  buildCells()
}

onMounted(() => {
  resize()
  intervalId = setInterval(tick, TICK_MS)
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(resize, 300)
  })
})

onUnmounted(() => {
  clearInterval(intervalId)
  clearTimeout(timer)
  window.removeEventListener('resize', resize)
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

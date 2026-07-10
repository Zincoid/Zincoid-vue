<script setup>
import { ref, reactive, computed, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps({
  src: { type: String, default: '' },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['crop', 'close'])

const workspaceRef = ref(null)
const imgEl = ref(null)
const imgNatural = ref({ w: 0, h: 0 })

const CROP_RADIUS = 150

const offset = reactive({ x: 0, y: 0 })
const zoom = ref(1)
const dragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const offsetStart = reactive({ x: 0, y: 0 })

async function initImage() {
  await nextTick()
  const img = imgEl.value
  if (!img) return
  if (img.complete) {
    onImageLoad()
  } else {
    img.addEventListener('load', onImageLoad, { once: true })
  }
}

function onImageLoad() {
  const img = imgEl.value
  if (!img) return
  imgNatural.value = { w: img.naturalWidth, h: img.naturalHeight }
  const ws = workspaceRef.value
  if (!ws) return
  const wsW = ws.clientWidth
  const wsH = ws.clientHeight
  const fitScale = Math.min(wsW / img.naturalWidth, wsH / img.naturalHeight, 1)
  zoom.value = Math.max(fitScale, 0.1)
  const displayW = img.naturalWidth * zoom.value
  const displayH = img.naturalHeight * zoom.value
  offset.x = (wsW - displayW) / 2
  offset.y = (wsH - displayH) / 2
}

watch(() => props.visible, async (v) => {
  if (v) {
    document.body.style.overflow = 'hidden'
    await initImage()
  } else {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

const imageStyle = computed(() => ({
  width: (imgNatural.value.w * zoom.value) + 'px',
  height: (imgNatural.value.h * zoom.value) + 'px',
  transform: `translate(${offset.x}px, ${offset.y}px)`,
  cursor: dragging.value ? 'grabbing' : 'grab',
  userSelect: 'none'
}))

const maskStyle = computed(() => ({
  width: (CROP_RADIUS * 2) + 'px',
  height: (CROP_RADIUS * 2) + 'px',
  borderRadius: '50%',
  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none'
}))

function startDrag(e) {
  e.preventDefault()
  dragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  offsetStart.x = offset.x
  offsetStart.y = offset.y
}

function onMouseMove(e) {
  if (!dragging.value) return
  offset.x = offsetStart.x + (e.clientX - dragStart.x)
  offset.y = offsetStart.y + (e.clientY - dragStart.y)
}

function stopDrag() {
  dragging.value = false
}

function onWheel(e) {
  e.preventDefault()
  const ws = workspaceRef.value
  if (!ws) return
  const rect = ws.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const oldZoom = zoom.value
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(0.1, Math.min(3, oldZoom + delta))

  // Zoom toward mouse position
  const ratio = newZoom / oldZoom
  offset.x = mx - ratio * (mx - offset.x)
  offset.y = my - ratio * (my - offset.y)

  zoom.value = newZoom
}

function onZoomInput(e) {
  const ws = workspaceRef.value
  if (!ws) return
  const newZoom = parseFloat(e.target.value)
  const cx = ws.clientWidth / 2
  const cy = ws.clientHeight / 2
  const ratio = newZoom / zoom.value
  offset.x = cx - ratio * (cx - offset.x)
  offset.y = cy - ratio * (cy - offset.y)
  zoom.value = newZoom
}

function getCropRect() {
  const displayW = imgNatural.value.w * zoom.value
  const displayH = imgNatural.value.h * zoom.value
  if (!displayW || !displayH) return null

  const ws = workspaceRef.value
  const wsW = ws.clientWidth
  const wsH = ws.clientHeight

  const scaleX = imgNatural.value.w / displayW
  const scaleY = imgNatural.value.h / displayH

  const centerDisplayX = wsW / 2 - offset.x
  const centerDisplayY = wsH / 2 - offset.y

  const cx = centerDisplayX * scaleX
  const cy = centerDisplayY * scaleY
  const r = CROP_RADIUS * scaleX
  const size = Math.round(r * 2)

  return {
    x: Math.round(cx - r),
    y: Math.round(cy - r),
    size
  }
}

function confirm() {
  const rect = getCropRect()
  if (!rect) return
  const img = imgEl.value
  if (!img) return

  const canvas = document.createElement('canvas')
  canvas.width = rect.size
  canvas.height = rect.size
  const ctx = canvas.getContext('2d')

  ctx.drawImage(img, rect.x, rect.y, rect.size, rect.size, 0, 0, rect.size, rect.size)

  canvas.toBlob((blob) => {
    if (blob) emit('crop', blob)
  }, 'image/png')
}

function close() {
  emit('close')
}

// Global mouse listeners
watch(dragging, (v) => {
  if (v) {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
  } else {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', stopDrag)
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="cropper-overlay" @click.self="close">
      <div class="cropper-modal">
        <h3 class="cropper-title">{{ t('common.cropAvatar') }}</h3>

        <div
          ref="workspaceRef"
          class="cropper-workspace"
          @mousedown="startDrag"
          @wheel.prevent="onWheel"
        >
          <img
            v-if="src"
            ref="imgEl"
            :src="src"
            :style="imageStyle"
            class="cropper-image"
            draggable="false"
            alt=""
          />
          <div :style="maskStyle" class="cropper-mask-circle"></div>
        </div>

        <div class="cropper-controls">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.01"
            :value="zoom"
            class="cropper-zoom"
            @input="onZoomInput"
          />
        </div>

        <div class="cropper-actions">
          <button class="btn btn--outline btn--lg" @click="close">{{ t('common.cancel') }}</button>
          <button class="btn btn--primary btn--lg" @click="confirm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {{ t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cropper-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: cropper-fade-in var(--transition-fast);
}

.cropper-modal {
  background: var(--color-surface);
  border-radius: var(--rounded-xl);
  padding: var(--spacing-2xl);
  max-width: 520px;
  width: 90vw;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.cropper-title {
  font-size: var(--text-lg);
  text-align: center;
  margin: 0;
}

.cropper-workspace {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-height: 400px;
  background: #1a1a1a;
  border-radius: var(--rounded-lg);
  overflow: hidden;
  user-select: none;
}

.cropper-image {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  pointer-events: none;
  max-width: none;
  height: auto;
}

.cropper-mask-circle {
  /* rendered via :style for dynamic box-shadow */
}

.cropper-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.cropper-zoom {
  flex: 1;
  accent-color: var(--color-primary);
  height: 4px;
  cursor: pointer;
}

.cropper-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

@keyframes cropper-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

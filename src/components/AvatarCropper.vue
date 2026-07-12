<script setup>
import { ref, reactive, computed, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()

const props = defineProps({
  src: { type: String, default: '' },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['crop', 'close'])

const workspaceRef = ref(null)
const imgEl = ref(null)
const imgNatural = ref({ w: 0, h: 0 })

const cropRadius = ref(150)

const offset = reactive({ x: 0, y: 0 })
const zoom = ref(1)
const zoomMin = ref(0.1)
const dragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const offsetStart = reactive({ x: 0, y: 0 })

function clampOffset() {
  const displayW = imgNatural.value.w * zoom.value
  const displayH = imgNatural.value.h * zoom.value
  const ws = workspaceRef.value
  if (!ws) return
  const wsW = ws.clientWidth
  const wsH = ws.clientHeight

  const minX = wsW / 2 - displayW + cropRadius.value
  const maxX = wsW / 2 - cropRadius.value
  const minY = wsH / 2 - displayH + cropRadius.value
  const maxY = wsH / 2 - cropRadius.value

  offset.x = Math.max(minX, Math.min(maxX, offset.x))
  offset.y = Math.max(minY, Math.min(maxY, offset.y))
}

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

  // Responsive crop circle size
  cropRadius.value = Math.min(150, Math.min(wsW, wsH) * 0.42)

  // Minimum zoom: the crop circle must be tangent to (fit within) the image
  zoomMin.value = (2 * cropRadius.value) / Math.min(img.naturalWidth, img.naturalHeight)
  zoom.value = zoomMin.value

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
  width: (cropRadius.value * 2) + 'px',
  height: (cropRadius.value * 2) + 'px',
  borderRadius: '50%',
  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none'
}))

function getPos(e) {
  if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  return { x: e.clientX, y: e.clientY }
}

function startDrag(e) {
  e.preventDefault()
  dragging.value = true
  const pos = getPos(e)
  dragStart.x = pos.x
  dragStart.y = pos.y
  offsetStart.x = offset.x
  offsetStart.y = offset.y
}

function onMove(e) {
  if (!dragging.value) return
  e.preventDefault()
  const pos = getPos(e)
  offset.x = offsetStart.x + (pos.x - dragStart.x)
  offset.y = offsetStart.y + (pos.y - dragStart.y)
  clampOffset()
}

function stopDrag() {
  dragging.value = false
}

function onWheel(e) {
  e.preventDefault()
  const ws = workspaceRef.value
  if (!ws) return
  const rect = ws.getBoundingClientRect()
  const pos = getPos(e)
  const mx = pos.x - rect.left
  const my = pos.y - rect.top

  const oldZoom = zoom.value
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(zoomMin.value, Math.min(3, oldZoom + delta))

  // Zoom toward pointer position
  const ratio = newZoom / oldZoom
  offset.x = mx - ratio * (mx - offset.x)
  offset.y = my - ratio * (my - offset.y)

  zoom.value = newZoom
  clampOffset()
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
  clampOffset()
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
  const r = cropRadius.value * scaleX
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

// Global mouse/touch listeners
watch(dragging, (v) => {
  if (v) {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', stopDrag)
  } else {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', stopDrag)
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
          @touchstart.prevent="startDrag"
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
          <SvgIcon name="search" />
          <input
            type="range"
            :min="zoomMin"
            max="3"
            step="0.01"
            :value="zoom"
            class="cropper-zoom"
            @input="onZoomInput"
          />
        </div>

        <div class="cropper-actions">
          <button class="btn btn--outline btn--lg" style="flex:1" @click="close">{{ t('common.cancel') }}</button>
          <button class="btn btn--primary btn--lg" style="flex:1" @click="confirm">
            <SvgIcon name="save" :size="16" />
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
  background-image:
    linear-gradient(45deg, #e5e5e5 25%, transparent 25%),
    linear-gradient(-45deg, #e5e5e5 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e5e5e5 75%),
    linear-gradient(-45deg, transparent 75%, #e5e5e5 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  background-color: #f0f0f0;
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
}

@keyframes cropper-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 600px) {
  .cropper-modal {
    padding: var(--spacing-lg);
    gap: var(--spacing-md);
  }
  .cropper-workspace {
    max-height: 300px;
  }
}
</style>

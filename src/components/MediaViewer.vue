<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()

const props = defineProps({
  src: { type: String, default: '' },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
const videoRef = ref(null)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const dragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragBaseX = ref(0)
const dragBaseY = ref(0)

const MIN_SCALE = 1
const MAX_SCALE = 5

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor: scale.value > 1 ? 'grab' : 'zoom-in'
}))

function clampTranslate(x, y) {
  const img = document.querySelector('.viewer-image')
  const baseW = img ? img.offsetWidth : window.innerWidth
  const baseH = img ? img.offsetHeight : window.innerHeight
  const w = baseW * scale.value
  const h = baseH * scale.value
  const maxX = Math.max(0, (w - baseW) / 2)
  const maxY = Math.max(0, (h - baseH) / 2)
  translateX.value = Math.min(maxX, Math.max(-maxX, x))
  translateY.value = Math.min(maxY, Math.max(-maxY, y))
}

function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.2 : 0.25
  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value + delta))
  if (next === MIN_SCALE) { translateX.value = 0; translateY.value = 0 }
  else clampTranslate(translateX.value, translateY.value)
  scale.value = next
}

function onDragStart(e) {
  if (scale.value <= 1) return
  dragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragBaseX.value = translateX.value
  dragBaseY.value = translateY.value
}
function onDragMove(e) {
  if (!dragging.value) return
  clampTranslate(dragBaseX.value + (e.clientX - dragStartX.value), dragBaseY.value + (e.clientY - dragStartY.value))
}
function onDragEnd() {
  dragging.value = false
}

function resetView() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

const mediaType = computed(() => {
  const ext = props.src.split('.').pop().toLowerCase()
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'audio'
  return 'image'
})

watch(() => props.visible, async (v) => {
  if (v) {
    resetView()
    document.body.style.overflow = 'hidden'
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragEnd)
    await nextTick()
    if (videoRef.value) videoRef.value.volume = 0.25
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', onDragEnd)
  }
})

function onClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="viewer-overlay" @click.self="onClose">
      <div class="viewer-toolbar">
        <a :href="src" download class="viewer-btn" :title="t('common.download')">
          <SvgIcon name="download" :size="20" />
        </a>
        <button class="viewer-btn" @click="onClose" :title="t('common.close')">
          <SvgIcon name="close" :size="20" />
        </button>
      </div>
      <img v-if="mediaType === 'image'" :src="src" class="viewer-content viewer-image" alt="" :style="imageStyle" @mousedown.prevent="onDragStart" @dblclick="resetView" @click.stop />
      <video ref="videoRef" v-else-if="mediaType === 'video'" :src="src" class="viewer-content viewer-video" controls autoplay @click.stop></video>
      <audio v-else :src="src" class="viewer-audio" controls autoplay @click.stop></audio>
    </div>
  </Teleport>
</template>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: viewer-fade-in var(--transition-fast);
}

.viewer-toolbar {
  position: absolute;
  top: var(--spacing-xl);
  right: var(--spacing-xl);
  display: flex;
  gap: var(--spacing-sm);
}
.viewer-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--rounded-full);
  background: rgba(255, 255, 255, 0.15);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast);
  border: none;
  text-decoration: none;
}
.viewer-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.viewer-content {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: var(--rounded-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.viewer-image {
  object-fit: contain;
  transform-origin: center center;
  will-change: transform;
  transition: transform 0.08s ease-out;
  user-select: none;
  -webkit-user-drag: none;
}
.viewer-video {
  width: auto;
  max-width: 90vw;
  max-height: 90vh;
}
.viewer-audio {
  width: 400px;
  max-width: 90vw;
}

@keyframes viewer-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

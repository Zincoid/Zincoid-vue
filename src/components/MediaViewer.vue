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

const mediaType = computed(() => {
  const ext = props.src.split('.').pop().toLowerCase()
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'audio'
  return 'image'
})

watch(() => props.visible, async (v) => {
  if (v) {
    document.body.style.overflow = 'hidden'
    await nextTick()
    if (videoRef.value) videoRef.value.volume = 0.25
  } else {
    document.body.style.overflow = ''
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
      <img v-if="mediaType === 'image'" :src="src" class="viewer-content viewer-image" alt="" @click.stop />
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

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: { type: String, required: true }
})

const poster = ref('')
const loaded = ref(false)
const el = ref(null)
const videoEl = ref(null)

let observer = null

function onSeeked() {
  const video = videoEl.value
  if (!video || !video.videoWidth) return
  try {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    poster.value = canvas.toDataURL('image/jpeg', 0.8)
  } catch { /* ignore */ }
  loaded.value = true
}

function onPlay() {
  const video = videoEl.value
  if (!video) return
  video.pause()
  if (video.readyState >= 2) {
    video.currentTime = 1
  }
}

function onLoadedData() {
  const video = videoEl.value
  if (!video) return
  if (video.readyState >= 2) {
    video.currentTime = 1
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const video = videoEl.value
      if (video) {
        video.src = props.src
      }
      observer.disconnect()
    }
  }, { rootMargin: '200px' })
  if (el.value) observer.observe(el.value)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div ref="el" class="video-thumb" :class="{ 'video-thumb--loaded': loaded }">
    <img v-if="poster" :src="poster" class="video-thumb__poster" alt="" />
    <div class="video-thumb__overlay">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </div>
    <video
      ref="videoEl"
      class="video-thumb__video"
      preload="auto"
      playsinline
      muted
      autoplay
      @play="onPlay"
      @loadeddata="onLoadedData"
      @seeked="onSeeked"
    ></video>
  </div>
</template>

<style scoped>
.video-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: var(--rounded-md);
  overflow: hidden;
  cursor: pointer;
}

.video-thumb__poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.7;
}

.video-thumb__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 1;
}

.video-thumb__overlay svg {
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
}

.video-thumb__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
}
</style>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { useConfig } from '@/composables/useConfig'
import { musicAPI } from '@/api'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
const { getMessage } = useError()
const { load: loadConfig, get: getConfig } = useConfig()

const open = ref(false)
const listOpen = ref(false)
const tracks = ref([])
const currentIndex = ref(-1)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const error = ref('')

const listTracks = ref([])
const listPage = ref(1)
const listPages = ref(1)
const listSize = ref(10)
const listLoading = ref(false)

const navbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 64
const posX = ref(16)
const posY = ref(navbarH + 16)
const dragging = ref(false)
let dragStart = null
let moved = false

const audioRef = ref(null)

const currentTrack = computed(() => tracks.value[currentIndex.value] || null)
const progress = computed(() => {
  if (!duration.value) return 0
  return Math.min((currentTime.value / duration.value) * 100, 100)
})

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

async function loadTracks() {
  try {
    const res = await musicAPI.list(1, 100)
    tracks.value = res.data?.data?.records || []
    if (currentIndex.value === -1 && tracks.value.length) currentIndex.value = 0
  } catch (e) {
    if (e?.response?.status !== 401) error.value = getMessage(e, 'walkman.loadFailed')
  }
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

async function loadList(pageNum) {
  listLoading.value = true
  try {
    const res = await musicAPI.list(pageNum, listSize.value)
    const data = res.data?.data || {}
    listTracks.value = data.records || []
    listPages.value = data.pages || 1
    listPage.value = pageNum
  } catch (e) {
    if (e?.response?.status !== 401) error.value = getMessage(e, 'walkman.loadFailed')
  } finally {
    listLoading.value = false
  }
}

function toggleList() {
  listOpen.value = !listOpen.value
  if (listOpen.value && !listTracks.value.length) {
    loadList(1)
  }
}

function playListTrack(track) {
  const idx = tracks.value.findIndex(t => t.id === track.id)
  if (idx !== -1) playTrack(idx)
}

function playTrack(index) {
  if (index < 0 || index >= tracks.value.length) return
  currentIndex.value = index
  audioRef.value.play()
}

function toggle() {
  if (!currentTrack.value) {
    if (tracks.value.length) playTrack(0)
    return
  }
  if (audioRef.value.paused) {
    audioRef.value.play()
  } else {
    audioRef.value.pause()
  }
}

function next() {
  if (!tracks.value.length) return
  playTrack((currentIndex.value + 1) % tracks.value.length)
}

function prev() {
  if (!tracks.value.length) return
  const index = currentIndex.value <= 0 ? tracks.value.length - 1 : currentIndex.value - 1
  playTrack(index)
}

function seek(e) {
  if (!duration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1))
  audioRef.value.currentTime = ratio * duration.value
}

function onTimeUpdate() {
  currentTime.value = audioRef.value.currentTime
}

function onLoadedMetadata() {
  duration.value = audioRef.value.duration
}

function onEnded() {
  next()
}

function onPointerDown(e) {
  dragging.value = true
  moved = false
  dragStart = { x: e.clientX, y: e.clientY, left: posX.value, top: posY.value }
  e.currentTarget.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  if (!dragging.value || !dragStart) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
  posX.value = Math.max(0, Math.min(window.innerWidth - 44, dragStart.left + dx))
  posY.value = Math.max(0, Math.min(window.innerHeight - 44, dragStart.top + dy))
}

function onPointerUp() {
  dragging.value = false
  dragStart = null
}

function onFabClick() {
  if (moved) return
  open.value = !open.value
}

onMounted(async () => {
  await loadConfig()
  listSize.value = parseInt(getConfig('page_size', '10'))
  loadTracks()
})
</script>

<template>
  <div class="walkman" :style="{ left: posX + 'px', top: posY + 'px' }">
    <audio
        ref="audioRef"
        :src="currentTrack?.url"
        preload="metadata"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMetadata"
        @ended="onEnded"
        @play="playing = true"
        @pause="playing = false"
    />
    <button
        class="walkman__fab"
        :class="{ 'walkman__fab--playing': playing, 'walkman__fab--dragging': dragging }"
        :title="open ? t('walkman.collapse') : t('walkman.expand')"
        @click="onFabClick"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
    >
      <span v-if="playing" class="walkman__eq"><i></i><i></i><i></i></span>
      <SvgIcon v-else name="audio" :size="20" />
    </button>
    <Transition name="walkman-pop">
      <div v-if="open" class="walkman__dock">
        <div class="walkman__panel">
          <span class="walkman__name">{{ currentTrack?.fileName || t('walkman.empty') }}</span>
          <span class="walkman__time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
          <div class="walkman__bar" @click="seek">
            <div class="walkman__bar-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="walkman__controls">
            <button class="walkman__btn" :disabled="!tracks.length" :title="t('walkman.prev')" @click="prev">
              <SvgIcon name="prev" :size="13" />
            </button>
            <button class="walkman__btn walkman__btn--toggle" :disabled="!tracks.length" :title="playing ? t('walkman.pause') : t('walkman.play')" @click="toggle">
              <SvgIcon :name="playing ? 'pause' : 'play'" :size="13" />
            </button>
            <button class="walkman__btn" :disabled="!tracks.length" :title="t('walkman.next')" @click="next">
              <SvgIcon name="next" :size="13" />
            </button>
            <button class="walkman__btn" :class="{ 'walkman__btn--active': listOpen }" :title="t('walkman.list')" @click="toggleList">
              <SvgIcon name="list" :size="13" />
            </button>
          </div>
          <span v-if="error" class="walkman__error" :title="error">{{ error }}</span>
        </div>
        <Transition name="walkman-list">
          <div v-if="listOpen" class="walkman__list">
            <div class="walkman__list-scroll">
              <button
                  v-for="tr in listTracks"
                  :key="tr.id"
                  class="walkman__track"
                  :class="{ 'walkman__track--active': tr.id === currentTrack?.id }"
                  @click="playListTrack(tr)"
              >
                <span class="walkman__track-name">{{ tr.fileName }}</span>
                <span class="walkman__track-size">{{ formatSize(tr.fileSize) }}</span>
              </button>
            </div>
            <div class="walkman__list-pager">
              <button class="walkman__page-btn" :disabled="listPage <= 1 || listLoading" @click="loadList(listPage - 1)">&#8249;</button>
              <span class="walkman__page-info">{{ listPage }} / {{ listPages }}</span>
              <button class="walkman__page-btn" :disabled="listPage >= listPages || listLoading" @click="loadList(listPage + 1)">&#8250;</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.walkman {
  position: fixed;
  left: var(--spacing-md);
  top: 80px;
  z-index: 40;
}

.walkman__fab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-full);
  background: transparent;
  color: #db2777;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: background var(--transition-fast), transform var(--transition-fast);
}
.walkman__fab:hover { background: rgba(236, 72, 153, 0.15); transform: scale(1.06); }
.walkman__fab--dragging { cursor: grabbing; }
.walkman__fab--playing { box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.15); }

.walkman__eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}
.walkman__eq i {
  width: 3px;
  background: #db2777;
  border-radius: var(--rounded-full);
  animation: walkman-eq 0.9s ease-in-out infinite;
}
.walkman__eq i:nth-child(1) { height: 60%; }
.walkman__eq i:nth-child(2) { height: 100%; animation-delay: 0.2s; }
.walkman__eq i:nth-child(3) { height: 40%; animation-delay: 0.4s; }
@keyframes walkman-eq {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

.walkman__dock {
  position: absolute;
  left: calc(100% + var(--spacing-md));
  top: 50%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-width: 340px;
}

.walkman__panel {
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-full);
  white-space: nowrap;
}

.walkman-pop-enter-active,
.walkman-pop-leave-active {
  transition: opacity var(--transition-normal), transform var(--transition-normal);
  transform-origin: left center;
}
.walkman-pop-enter-from,
.walkman-pop-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.walkman-list-enter-active,
.walkman-list-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  transform-origin: top center;
}
.walkman-list-enter-from,
.walkman-list-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.walkman__name {
  font-size: 11px;
  color: var(--color-text-heading);
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
}

.walkman__time {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  white-space: nowrap;
}

.walkman__bar {
  flex: 1;
  min-width: 56px;
  height: 3px;
  border-radius: var(--rounded-full);
  background: var(--color-border);
  cursor: pointer;
  overflow: hidden;
}

.walkman__bar-fill {
  height: 100%;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  transition: width 0.2s linear;
}

.walkman__controls {
  display: flex;
  align-items: center;
  gap: 1px;
}

.walkman__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-full);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.walkman__btn:hover { color: var(--color-text-heading); background: var(--color-bg-alt); }
.walkman__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.walkman__btn--toggle {
  width: 24px;
  height: 24px;
}
.walkman__btn--toggle:hover { color: var(--color-text-heading); background: var(--color-bg-alt); }
.walkman__btn--active { color: #db2777; background: rgba(236, 72, 153, 0.12); }

.walkman__list {
  margin-top: var(--spacing-xs);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  overflow: hidden;
}

.walkman__list-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.walkman__track {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: transparent;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
}
.walkman__track:hover { background: var(--color-bg-alt); color: var(--color-text-heading); }
.walkman__track--active { color: #db2777; background: rgba(236, 72, 153, 0.1); }

.walkman__track-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.walkman__track-size {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.walkman__list-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-top: 1px solid var(--color-border-light);
}

.walkman__page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.walkman__page-btn:hover { color: var(--color-text-heading); background: var(--color-bg-alt); }
.walkman__page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.walkman__page-info {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.walkman__error {
  font-size: var(--text-xs);
  color: var(--color-danger);
}
</style>

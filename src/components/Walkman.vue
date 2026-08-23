<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
const currentTrack = ref(null)
const currentIndex = ref(-1)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const error = ref('')
const volume = ref(0.25)
const muted = ref(false)

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

const progress = computed(() => {
  if (!duration.value) return 0
  return Math.min((currentTime.value / duration.value) * 100, 100)
})

const nameOuterRef = ref(null)
const nameInnerRef = ref(null)
const nameOverflow = ref(false)
const nameDistance = ref(0)

function checkNameOverflow() {
  const inner = nameInnerRef.value
  const outer = nameOuterRef.value
  if (!inner || !outer) {
    nameOverflow.value = false
    return
  }
  const innerW = inner.scrollWidth
  const outerW = outer.clientWidth
  nameOverflow.value = innerW > outerW
  nameDistance.value = Math.max(innerW - outerW, 0)
}

watch([currentTrack, open], () => nextTick(checkNameOverflow), { flush: 'post' })

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

async function loadTracks() {
  await loadList(1)
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

function displayName(fileName) {
  return fileName?.replace(/\.[^.]+$/, '') || fileName
}

async function loadList(pageNum) {
  listLoading.value = true
  try {
    const res = await musicAPI.list(pageNum, listSize.value)
    const data = res.data?.data || {}
    const records = data.records || []
    listTracks.value = records
    tracks.value = records
    listPages.value = data.pages || 1
    listPage.value = pageNum
    if (currentTrack.value) {
      currentIndex.value = records.findIndex(t => t.id === currentTrack.value.id)
    } else if (tracks.value.length) {
      currentIndex.value = 0
    }
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
  let idx = tracks.value.findIndex(t => t.id === track.id)
  if (idx === -1) {
    tracks.value = [...tracks.value, track]
    idx = tracks.value.length - 1
  }
  playTrack(idx)
}

function toggleTrack(track) {
  if (track.id === currentTrack.value?.id) {
    toggle()
  } else {
    playListTrack(track)
  }
}

function playTrack(index) {
  if (index < 0 || index >= tracks.value.length) return
  currentIndex.value = index
  currentTrack.value = tracks.value[index]
  nextTick(() => audioRef.value.play())
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

async function next() {
  if (!tracks.value.length) return
  if (currentIndex.value < tracks.value.length - 1) {
    playTrack(currentIndex.value + 1)
    return
  }
  const target = listPage.value < listPages.value ? listPage.value + 1 : 1
  await loadList(target)
  if (tracks.value.length) playTrack(0)
}

async function prev() {
  if (!tracks.value.length) return
  if (currentIndex.value > 0) {
    playTrack(currentIndex.value - 1)
    return
  }
  const target = listPage.value > 1 ? listPage.value - 1 : listPages.value
  await loadList(target)
  if (tracks.value.length) playTrack(tracks.value.length - 1)
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

watch(volume, v => {
  if (audioRef.value) audioRef.value.volume = v
})

function toggleMute() {
  muted.value = !muted.value
  audioRef.value.volume = muted.value ? 0 : volume.value
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
  if (audioRef.value) audioRef.value.volume = volume.value
  await loadList(1)
  if (!currentTrack.value && tracks.value.length) {
    currentTrack.value = tracks.value[0]
  }
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
          <span ref="nameOuterRef" class="walkman__name" :class="{ 'walkman__name--scroll': nameOverflow }">
            <span
                ref="nameInnerRef"
                class="walkman__name-inner"
                :style="nameOverflow ? { '--distance': nameDistance + 'px' } : null"
            >{{ displayName(currentTrack?.fileName) || t('walkman.empty') }}</span>
          </span>
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
          <div class="walkman__volume">
            <button class="walkman__btn" :title="muted ? t('walkman.unmute') : t('walkman.mute')" @click="toggleMute">
              <SvgIcon :name="muted ? 'volume-muted' : 'volume'" :size="13" />
            </button>
            <input
                v-model.number="volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="walkman__volume-slider"
                :style="{ '--fill': (muted ? 0 : volume * 100) + '%' }"
                @input="muted = false"
            />
          </div>
          <span v-if="error" class="walkman__error" :title="error">{{ error }}</span>
        </div>
        <Transition name="walkman-list">
          <div v-if="listOpen" class="walkman__list">
            <div v-if="listTracks.length" class="walkman__list-scroll">
              <div
                  v-for="tr in listTracks"
                  :key="tr.id"
                  class="walkman__track"
                  :class="{ 'walkman__track--active': tr.id === currentTrack?.id }"
                  @click="playListTrack(tr)"
              >
                <span class="walkman__track-name">{{ displayName(tr.fileName) }}</span>
                <button
                    class="walkman__track-play"
                    @click.stop="toggleTrack(tr)"
                >
                  <SvgIcon :name="tr.id === currentTrack?.id && playing ? 'pause' : 'play'" :size="10" />
                </button>
                <a
                    class="walkman__track-download"
                    :href="tr.url"
                    :download="tr.fileName"
                    @click.stop
                >
                  <SvgIcon name="download" :size="12" />
                </a>
              </div>
            </div>
            <div v-else class="walkman__list-empty">{{ t('walkman.empty') }}</div>
            <div class="walkman__list-pager">
              <button class="walkman__page-btn" :disabled="listPage <= 1 || listLoading" @click="loadList(listPage - 1)">&#8249;</button>
              <span class="walkman__page-info">{{ listPage }} / {{ listPages }} · {{ t('walkman.pageSize', { size: listSize }) }}</span>
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
  position: relative;
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
  opacity: 0.55;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: background var(--transition-fast), transform var(--transition-fast), opacity var(--transition-fast);
}
.walkman__fab:hover { background: rgba(236, 72, 153, 0.15); transform: scale(1.06); opacity: 1; }
.walkman__fab--dragging { cursor: grabbing; }
.walkman__fab--playing::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid #db2777;
  border-radius: var(--rounded-full);
  pointer-events: none;
  animation: walkman-ripple 1.8s ease-out infinite;
}
@keyframes walkman-ripple {
  0% { transform: scale(0.5); border-width: 1px; opacity: 0.5; }
  100% { transform: scale(1.0); border-width: 5px; opacity: 0; }
}

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
  max-width: 420px;
}

.walkman__panel {
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
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
  white-space: nowrap;
  font-family: var(--font-mono);
  margin-right: var(--spacing-sm);
}
.walkman__name-inner {
  display: inline-block;
  white-space: nowrap;
}
.walkman__name--scroll .walkman__name-inner {
  animation: walkman-marquee 10s linear infinite;
}
@keyframes walkman-marquee {
  0%, 10% { transform: translateX(0); }
  45% { transform: translateX(calc(-1 * var(--distance))); }
  55% { transform: translateX(calc(-1 * var(--distance))); }
  90%, 100% { transform: translateX(0); }
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

.walkman__volume {
  display: flex;
  align-items: center;
  gap: 2px;
}

.walkman__volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 40px;
  height: 3px;
  border-radius: var(--rounded-full);
  background: linear-gradient(to right, #be185d var(--fill, 0%), var(--color-border) var(--fill, 0%));
  cursor: pointer;
}
.walkman__volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 8px;
  height: 8px;
  border-radius: var(--rounded-full);
  background: #ec4899;
  cursor: pointer;
}
.walkman__volume-slider::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border: none;
  border-radius: var(--rounded-full);
  background: #ec4899;
  cursor: pointer;
}

.walkman__list {
  margin-top: -10px;
  margin-left: 10px;
  width: calc(100% - 20px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-xl);
  overflow: hidden;
}

.walkman__list-scroll {
  max-height: 128px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs);
  border-right: 4px solid transparent;
}
.walkman__list-scroll::-webkit-scrollbar { width: 4px; }
.walkman__list-scroll::-webkit-scrollbar-track { margin: 6px 0; }
.walkman__list-scroll::-webkit-scrollbar-thumb { background: var(--color-border); }

.walkman__track {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--rounded-md);
  background: transparent;
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-body);
  transition: background var(--transition-fast);
}
.walkman__track:hover { background: var(--color-bg-alt); color: var(--color-text-heading); }
[data-theme="dark"] .walkman__track:hover { background: #23252f; }
.walkman__track--active { color: #db2777; background: rgba(236, 72, 153, 0.1); border-radius: var(--rounded-md); }

.walkman__track-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  padding-right: 48px;
}

.walkman__track-play {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.walkman__track:hover .walkman__track-play { color: var(--color-text-secondary); }
.walkman__track-play:hover { color: #3b82f6; background: rgba(59, 130, 246, 0.12); }
.walkman__track--active .walkman__track-play:hover { color: var(--color-warning); background: var(--color-warning-bg); }

.walkman__track-download {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--rounded-sm);
  color: var(--color-text-tertiary);
  transition: color var(--transition-fast), background var(--transition-fast);
}
.walkman__track:hover .walkman__track-download { color: var(--color-text-secondary); }
.walkman__track-download:hover { color: #22c55e; background: rgba(34, 197, 94, 0.12); }

.walkman__track-size {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.walkman__list-empty {
  padding: var(--spacing-lg) var(--spacing-md);
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.walkman__list-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 27px;
  padding: 0 var(--spacing-sm);
  border-top: 1px solid var(--color-border-light);
}

.walkman__page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: color var(--transition-fast), background var(--transition-fast);
}
.walkman__page-btn:hover { color: var(--color-text-heading); background: var(--color-bg-alt); }
.walkman__page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.walkman__page-info {
  font-size: 10px;
  line-height: 1;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.walkman__error {
  font-size: var(--text-xs);
  color: var(--color-danger);
}
</style>

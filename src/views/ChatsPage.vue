<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useConfirm } from '@/composables/useConfirm'
import { useError } from '@/composables/useError'
import { useMention, insertAtCursor } from '@/composables/useMention'
import { useFileDrop } from '@/composables/useFileDrop'
import { parseMentions } from '@/composables/useMentionLink'
import { chatAPI, fileAPI, configAPI } from '@/api'
import { formatDate } from '@/utils/format'
import MediaViewer from '@/components/MediaViewer.vue'
import MentionDropdown from '@/components/MentionDropdown.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import FileDropOverlay from '@/components/FileDropOverlay.vue'

const { t } = useI18n()
const { getMessage } = useError()
const auth = useAuthStore()
const mention = useMention()
const { confirm } = useConfirm()

const messages = ref([])
const parsedMessages = computed(() => messages.value.map(m => ({ ...m, parsedContent: parseMentions(m.content) })))
const content = ref('')
const sending = ref(false)
const loading = ref(true)
const loadingDone = ref(false)
const page = ref(1)
const hasMore = ref(true)
const chatEl = ref(null)
const uploadFile = ref(null)
const uploading = ref(false)
const previewSrc = ref(null)
const previewOpen = ref(false)
const chatTextarea = ref(null)

const pollSize = ref(50)

const lastScrollTop = ref(0)
const inputAway = ref(false)
let scrollRunway = 0

const atBottom = ref(true)

function updateAtBottom() {
  // 60px threshold — the same one the SSE handlers use to decide auto-scroll
  atBottom.value = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 60
}

// ── live updates over SSE (replaces the old 3s polling) ──
let es = null
let streamOff = false // set on unmount so a pending restart can't reopen

function appendMsg(msg) {
  // id-dedupe: the SSE broadcast reaches the sender too, and the POST
  // response already showed the message — either side may land first
  if (!msg?.id || messages.value.some(m => m.id === msg.id)) return
  messages.value.push(msg)
}

function startStream() {
  stopStream()
  if (streamOff) return
  es = new EventSource('/api/chats/public/stream')
  // 'connected' also fires after a reconnect — pull whatever was missed meanwhile
  es.addEventListener('connected', () => catchUp())
  es.addEventListener('message', (e) => {
    let msg
    try { msg = JSON.parse(e.data) } catch { return }
    const before = messages.value.length
    appendMsg(msg)
    if (messages.value.length !== before) {
      const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 60
      if (nearBottom) scrollBottom()
      nextTick(updateAtBottom)
    }
  })
  es.addEventListener('delete', (e) => {
    const id = Number(e.data)
    messages.value = messages.value.filter(m => m.id !== id)
  })
  es.onerror = () => {
    // transient drops reconnect on their own; only a fatal close needs a nudge
    if (es?.readyState === EventSource.CLOSED && !streamOff) setTimeout(startStream, 3000)
  }
}

function stopStream() {
  if (es) { es.close(); es = null }
}

function onChatScroll() {
  const st = window.scrollY
  const delta = st - lastScrollTop.value
  lastScrollTop.value = st
  // accumulate ~24px of travel before flipping the dock — single-pixel wheel
  // nudges used to retrigger it mid-scroll, and rapid toggling reads jumpy no
  // matter how smooth the transition itself is
  if (Math.sign(delta) !== Math.sign(scrollRunway)) scrollRunway = 0
  scrollRunway += delta
  if (scrollRunway <= -24) {
    inputAway.value = true
    scrollRunway = 0
  } else if (scrollRunway >= 24) {
    inputAway.value = false
    scrollRunway = 0
  }
  updateAtBottom()
}

onMounted(async () => {
  try {
    const { data } = await configAPI.get()
    const max = parseInt(data.data?.message_max_count)
    if (max > 0) pollSize.value = max
  } catch (e) { /* use default 50 */ }
  await fetchMessages()
  startStream()
  window.addEventListener('scroll', onChatScroll, { passive: true })
  window.addEventListener('resize', updateAtBottom)
  nextTick(updateAtBottom)
})

onUnmounted(() => {
  streamOff = true
  stopStream()
  window.removeEventListener('scroll', onChatScroll)
  window.removeEventListener('resize', updateAtBottom)
})

async function fetchMessages() {
  try {
    const { data } = await chatAPI.getList(page.value, pollSize.value)
    const list = data.data?.records || []
    if (list.length === 0) hasMore.value = false
    messages.value = [...list, ...messages.value]
  } catch (e) {
    // ignore
  } finally {
    loading.value = false
    nextTick(updateAtBottom)
  }
}

function scrollBottom() {
  nextTick(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  })
}

function onLoadingDone() {
  loadingDone.value = true
  nextTick(updateAtBottom)
}

// gap-fill after a (re)connect: merge the newest page into the list by id
async function catchUp() {
  try {
    const { data } = await chatAPI.getList(1, pollSize.value)
    const list = data.data?.records || []
    const existingIds = new Set(messages.value.map(m => m.id))
    const newMsgs = list.filter(m => !existingIds.has(m.id))
    if (newMsgs.length > 0) {
      messages.value.push(...newMsgs)
      const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 60
      if (nearBottom) scrollBottom()
      nextTick(updateAtBottom)
    }
  } catch (e) { /* ignore */ }
}

async function handleSend() {
  if (!content.value.trim() && !uploadFile.value) return
  sending.value = true
  try {
    let fileUrl = null
    if (uploadFile.value) {
      uploading.value = true
      const { data } = await fileAPI.upload(uploadFile.value)
      fileUrl = data.data?.url
      uploadFile.value = null
      uploading.value = false
    }
    const { data } = await chatAPI.send(content.value.trim() || null, fileUrl)
    appendMsg(data.data) // SSE may have delivered it first — appendMsg dedupes
    content.value = ''
    scrollBottom()
  } catch (e) {
    // ignore
  } finally {
    sending.value = false
  }
}

function onChatInput(e) {
  content.value = e.target.value
  mention.onInput(e.target)
}

// the @ tool button: type an @ at the caret so the mention dropdown opens
function insertMentionChar() {
  insertAtCursor(chatTextarea.value, '@')
  nextTick(() => mention.onInput(chatTextarea.value))
}

// emoji picker (comment composer style): popover grid above the input pill
const emojiOpen = ref(false)
const EMOJIS = [
  '😀', '😄', '😂', '🤣', '😊', '😍', '😘', '😜',
  '🤔', '😅', '😭', '🥺', '😏', '😉', '😎', '🥳',
  '🤗', '😴', '👍', '👏', '🙏', '💪', '❤️', '🔥',
  '✨', '🎉', '💡', '⭐', '🚀', '🌱', '☕', '🎵'
]

function insertEmoji(emoji) {
  emojiOpen.value = false
  insertAtCursor(chatTextarea.value, emoji)
}

function onEsc() {
  mention.close()
  emojiOpen.value = false
}

// clicking outside closes the emoji popover
function onDocPointerDown(e) {
  if (!emojiOpen.value) return
  if (e.target.closest?.('.chat-input__emoji-panel, .chat-input__tool--emoji')) return
  emojiOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocPointerDown))

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) uploadFile.value = f
}

// drag & drop attach — one file per message, same as the file picker
const { dragOver } = useFileDrop({
  enabled: () => auth.isLoggedIn,
  onFiles: (files) => { uploadFile.value = files[0] }
})

function isImage(path) {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(path)
}

function isVideo(path) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(path)
}

function isAudio(path) {
  return /\.(mp3|wav|aac|flac|ogg)(\?|$)/i.test(path)
}

// Dead media: a message's file can be a shadow reference to a file owned by
// other content (AI messages), and the original owner deleting/editing that
// content removes the disk file — the URL then 404s. Keyed by URL so every
// message sharing the dead file flips together. Replace-on-write for reactivity.
const mediaBroken = ref(new Set())

function markMediaBroken(url) {
  if (mediaBroken.value.has(url)) return
  mediaBroken.value = new Set(mediaBroken.value).add(url)
}

function canDelete(msg) {
  return auth.isLoggedIn && (auth.user?.id === msg.userId || auth.isAdmin)
}

async function handleDelete(msg) {
  if (!await confirm(t('chat.deleteConfirm'))) return
  try {
    await chatAPI.delete(msg.id)
    messages.value = messages.value.filter(m => m.id !== msg.id)
  } catch (e) { /* ignore */ }
}

// the hover @ button: type a complete @mention into the composer and focus it
// (trailing space keeps the mention dropdown from opening on the finished name)
function mentionUser(msg) {
  if (!msg.username) return
  insertAtCursor(chatTextarea.value, '@' + msg.username + ' ')
}

function openPreview(src) {
  previewSrc.value = src
  previewOpen.value = true
}
</script>

<template>
  <div class="chats container">
    <div class="header">
      <div class="page-header">
        <h1 class="page-header__title"># {{ t('chat.title') }}<span class="cursor">_</span></h1>
        <p class="page-header__subtitle">{{ t('chat.subtitle') }}</p>
      </div>
    </div>

    <div class="chat-box" ref="chatEl">
      <LoadingSpinner :visible="loading" @done="onLoadingDone" />
      <template v-if="loadingDone">
        <div v-for="msg in parsedMessages" :key="msg.id" class="chat-msg" :class="{ 'chat-msg--mine': auth.user?.id === msg.userId }">
          <router-link :to="`/members/${msg.userId}`" class="chat-msg__avatar">
            <img v-if="msg.userAvatar" :src="msg.userAvatar" alt="" />
            <span v-else>{{ (msg.userNickname || '?')[0] }}</span>
          </router-link>
          <div class="chat-msg__body">
            <div class="chat-msg__meta">
              <span class="chat-msg__author">{{ msg.userNickname }}</span>
              <router-link v-if="msg.username" :to="`/members/@${msg.username}`" class="chat-msg__handle">@{{ msg.username }}</router-link>
              <span class="chat-msg__time">{{ formatDate(msg.createdAt) }}</span>
            </div>
            <div v-if="msg.content" class="chat-msg__content">
              <template v-for="(part, i) in msg.parsedContent" :key="i">
                <router-link v-if="part.link" :to="`/members/@${part.username}`" class="mention-link">{{ part.text }}</router-link>
                <span v-else>{{ part.text }}</span>
              </template>
            </div>
            <div v-if="msg.file" class="chat-msg__file">
              <div v-if="mediaBroken.has(msg.file)" class="chat-msg__file-broken">
                <SvgIcon name="attach" :size="14" />
                <span>{{ t('chat.fileUnavailable') }}</span>
              </div>
              <img
                v-else-if="isImage(msg.file)"
                :src="msg.file"
                class="chat-msg__img"
                @click="openPreview(msg.file)"
                @error="markMediaBroken(msg.file)"
                alt=""
              />
              <div
                v-else-if="isVideo(msg.file)"
                class="chat-msg__video-card"
                @click="openPreview(msg.file)"
              >
                <video
                  :src="msg.file"
                  preload="metadata"
                  @loadedmetadata="(e) => e.target.currentTime = 1"
                  @error="markMediaBroken(msg.file)"
                ></video>
                <div class="chat-msg__video-play">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div
                v-else-if="isAudio(msg.file)"
                class="chat-msg__audio"
                @click="openPreview(msg.file)"
              >
                <!-- silent probe: the card shows no player, so this is the only
                     load attempt that can 404 before the user opens the preview -->
                <audio :src="msg.file" preload="metadata" hidden @error="markMediaBroken(msg.file)"></audio>
                <SvgIcon name="audio" :size="32" />
                <span>Audio</span>
              </div>
              <!-- plain download link: no load attempt to fail, a dead file can
                   only surface as the browser's 404 after the click -->
              <a v-else :href="msg.file" target="_blank" class="chat-msg__file-link">
                <SvgIcon name="file" />
                {{ t('common.download') }}
              </a>
            </div>
            <!-- hover actions: outside the bubble on its outer side, bottom-
                 anchored — right of the bubble for others' messages (and the @
                 mention next to delete), left for mine -->
            <div class="chat-msg__actions">
              <button
                v-if="msg.username && auth.user?.id !== msg.userId"
                class="chat-msg__action chat-msg__action--at"
                :title="t('chat.mentionTitle')"
                @click="mentionUser(msg)"
              ><SvgIcon name="at" :size="14" /></button>
              <button
                v-if="canDelete(msg)"
                class="chat-msg__action chat-msg__action--delete"
                :title="t('common.delete')"
                @click="handleDelete(msg)"
              ><SvgIcon name="trash" :size="14" /></button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="chat-dock">
      <div v-if="auth.isLoggedIn" class="chat-input-area" :class="{ 'chat-dock--away': inputAway }">
        <div class="chat-input__row">
          <div class="chat-input__field">
            <textarea
              ref="chatTextarea"
              :value="content"
              class="chat-input__textarea"
              :placeholder="t('chat.placeholder')"
              rows="2"
              @input="onChatInput"
              @keydown.esc="onEsc"
              @keydown.enter.exact.prevent="handleSend"
            ></textarea>
            <div v-if="uploadFile" class="chat-input__file-tag" :title="uploadFile.name">
              <SvgIcon name="attach" :size="12" />
              <span class="chat-input__file-name">{{ uploadFile.name }}</span>
              <button class="chat-file-remove" @click="uploadFile = null">&times;</button>
            </div>
            <!-- attach + emoji + @ tools: inside the pill on the right (comment composer style) -->
            <div class="chat-input__tools">
              <label class="chat-input__tool" :class="{ 'chat-input__tool--disabled': uploading }">
                <SvgIcon name="attach" :size="18" />
                <input type="file" @change="onFileChange" accept="image/*,video/*,audio/*" />
              </label>
              <button
                type="button"
                class="chat-input__tool chat-input__tool--emoji"
                :class="{ 'chat-input__tool--active': emojiOpen }"
                :title="t('chat.emojiTitle')"
                :aria-label="t('chat.emojiTitle')"
                @click="emojiOpen = !emojiOpen"
              >
                <SvgIcon name="smile" :size="18" />
              </button>
              <button
                type="button"
                class="chat-input__tool"
                :title="t('chat.mentionTitle')"
                :aria-label="t('chat.mentionTitle')"
                @click="insertMentionChar"
              >
                <SvgIcon name="at" :size="18" />
              </button>
            </div>
            <!-- small emoji popover above the pill -->
            <div v-if="emojiOpen" class="chat-input__emoji-panel">
              <button
                v-for="emoji in EMOJIS"
                :key="emoji"
                type="button"
                class="chat-input__emoji-item"
                @click="insertEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
          </div>
          <MentionDropdown
            :suggestions="mention.suggestions"
            :pos="mention.mentionPos"
            @select="(username) => mention.insert(chatTextarea, username)"
          />
          <button class="btn btn--primary chat-send-btn" :disabled="sending || (!content.trim() && !uploadFile)" @click="handleSend">
            <SvgIcon name="send" :size="18" />
          </button>
        </div>
      </div>
      <p v-else class="chat-login-hint" :class="{ 'chat-dock--away': inputAway }">
        {{ t('chat.loginHint') }} <router-link to="/login">{{ t('auth.login') }}</router-link>
      </p>
      <!-- kept after the v-if/v-else pair (Vue needs them adjacent); order:-1
           lifts it above the bar in the dock column -->
      <button
        class="chat-scroll-bottom-btn"
        :class="{ 'chat-scroll-bottom-btn--hidden': atBottom }"
        @click="scrollBottom"
        title="Scroll to bottom"
      >
        <SvgIcon name="chevron-down" :size="16" />
      </button>
    </div>

    <!-- drag & drop hint (window-level handlers; pointer-events: none so the
         drop still reaches them) -->
    <FileDropOverlay :visible="dragOver" />

    <MediaViewer :visible="previewOpen" :src="previewSrc" @close="previewOpen = false; previewSrc = null" />
  </div>
</template>

<style scoped>
.chats {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - var(--navbar-height) - var(--spacing-4xl));
  /* 240px: clears the dock plus the scroll-to-bottom button stacked on top */
  padding-bottom: 240px;
}

/* ── Message area ── */

.chat-box {
  flex: 1;
  /* transparent: the bubbles carry their own surface — this panel used to
     paint --color-bg (same as the page) and only hid the page-logo watermark */
  border-radius: var(--rounded-xl);
  overflow-y: auto;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  scroll-behavior: smooth;
}

.chat-box::-webkit-scrollbar { width: 4px; }
.chat-box::-webkit-scrollbar-track { background: transparent; }
.chat-box::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

/* ── Message bubble ── */

.chat-msg {
  /* full-width band so hover reaches the whole row — the bubble itself is
     capped by max-width on .chat-msg__body */
  display: flex;
  gap: var(--spacing-sm);
  animation: fadeInUp 0.25s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.chat-msg--mine {
  flex-direction: row-reverse;
}

.chat-msg__avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--rounded-full);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  border: 2px solid var(--color-border-light);
  transition: transform var(--transition-fast);
}
.chat-msg__avatar:hover { transform: scale(1.08); }
.chat-msg__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.chat-msg__avatar:has(img) {
  background: transparent;
}

.chat-msg__body {
  background: color-mix(in srgb, var(--color-surface) 60%, transparent);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  min-width: 0;
  max-width: 75%;
  position: relative;
}
.chat-msg--mine .chat-msg__body {
  background: var(--color-primary-light);
}

.chat-msg__meta {
  display: flex;
  gap: var(--spacing-sm);
  align-items: baseline;
  margin-bottom: 3px;
}
.chat-msg__author {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-primary);
}
.chat-msg--mine .chat-msg__author { color: #db2777; }
.chat-msg__handle {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
}
.chat-msg__handle:hover {
  color: var(--color-primary);
}
.chat-msg__time {
  font-size: 10px;
  color: var(--color-text-tertiary, #999);
  letter-spacing: .02em;
}

/* hover actions: outside the bubble on its outer side, bottom-anchored —
   right of the bubble for others' messages, left for mine */
.chat-msg__actions {
  position: absolute;
  bottom: 0;
  left: 100%;
  margin-left: var(--spacing-xs);
  display: flex;
  gap: var(--spacing-xxs);
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.chat-msg--mine .chat-msg__actions {
  left: auto;
  right: 100%;
  margin-left: 0;
  margin-right: var(--spacing-xs);
}
.chat-msg:hover .chat-msg__actions {
  opacity: 1;
}
.chat-msg__action {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 22px;
  padding: 0 2px;
  border-radius: var(--rounded-sm);
  font-size: 14px;
  line-height: 1;
  color: var(--color-text-tertiary, #999);
  transition: color var(--transition-fast), background var(--transition-fast);
}
.chat-msg__action:hover {
  color: var(--color-primary);
  background: var(--color-primary-light);
}
.chat-msg__action--delete:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.chat-msg__content {
  font-size: var(--text-sm);
  line-height: 1.6;
  word-break: break-word;
  color: var(--color-text);
}

/* ── Attachments ── */

.chat-msg__file {
  margin-top: var(--spacing-xs);
  overflow: hidden;
  border-radius: var(--rounded-md);
}

.chat-msg__img {
  display: block;
  max-width: 260px;
  max-height: 200px;
  border-radius: var(--rounded-md);
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}
.chat-msg__img:hover { border-color: var(--color-card-hover); transform: scale(1.01); }

.chat-msg__video-card {
  position: relative;
  max-width: 280px;
  aspect-ratio: 16 / 9;
  background: var(--color-bg);
  border-radius: var(--rounded-md);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast);
}
.chat-msg__video-card video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 0;
  outline: 0;
}
.chat-msg__video-card:hover { border-color: var(--color-card-hover); }

.chat-msg__video-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-msg__video-play svg {
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
}

.chat-msg__audio {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--rounded-md);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-card-hover);
  border: 2px solid transparent;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}
.chat-msg__audio:hover { border-color: var(--color-card-hover); color: #f472b6; }

.chat-msg__file-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-bg);
  padding: 6px 12px;
  border-radius: var(--rounded-md);
  transition: background var(--transition-fast);
}
.chat-msg__file-link:hover { background: var(--color-border-light); }

/* dead media placeholder (shadow-referenced file was deleted upstream) */
.chat-msg__file-broken {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px dashed var(--color-border);
  border-radius: var(--rounded-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* ── Input area ── */

/* fixed dock slot shared by the input bar / login hint and the scroll-to-bottom
   button: the bar anchors the bottom edge of the slot, the button floats
   above it (flex column, order -1) */
.chat-dock {
  position: fixed;
  bottom: 108px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(var(--content-max-width) - 2 * var(--spacing-xl));
  max-width: calc(100% - 2 * var(--spacing-xl));
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 50;
  /* the slot spans button + bar; let clicks fall through the empty space */
  pointer-events: none;
}
.chat-dock > * {
  pointer-events: auto;
}

/* no panel chrome behind the bar — the frosted glass lives on the pieces
   themselves (.chat-input__field, .chat-send-btn) */

/* attachment chip: inside the input pill, right of the text (truncates) */
.chat-input__file-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 1;
  min-width: 0;
  max-width: 45%;
  font-size: var(--text-xs);
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 4px 10px;
  border-radius: var(--rounded-full);
  font-weight: var(--weight-medium);
}
.chat-input__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.chat-file-remove {
  color: var(--color-text-secondary);
  font-size: 16px;
  padding: 0 2px;
  line-height: 1;
  transition: color var(--transition-fast);
}
.chat-file-remove:hover { color: var(--color-danger); }

.chat-input__row {
  display: flex;
  position: relative;
  gap: var(--spacing-sm);
  align-items: flex-end;
}

/* attach + @ tools: flat icon buttons inside the pill on the right —
   same visual language as the comment composer tools */
.chat-input__tools {
  display: flex;
  align-items: center;
  gap: var(--spacing-xxs);
  flex-shrink: 0;
}
.chat-input__tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--rounded-full);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.chat-input__tool:hover,
.chat-input__tool--active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.chat-input__tool--disabled { opacity: 0.4; pointer-events: none; }
.chat-input__tool input { display: none; }

/* emoji popover: floats above the pill, same grid language as the comment
   composer panel (no shadow) */
.chat-input__emoji-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + var(--spacing-xs));
  display: grid;
  grid-template-columns: repeat(8, 30px);
  gap: 2px;
  padding: var(--spacing-xs);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  z-index: 10;
}
.chat-input__emoji-item {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rounded-sm);
  font-size: 17px;
  line-height: 1;
  transition: background var(--transition-fast);
}
.chat-input__emoji-item:hover {
  background: var(--color-primary-light);
}

/* the pill chrome lives on the field wrapper so the attachment chip can sit
   inside the box, right of the text */
.chat-input__field {
  position: relative; /* anchor for the emoji popover */
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-sm) 0 var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-full);
  /* frosted pill — glass moved here from the old dock panel */
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  backdrop-filter: blur(12px);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.chat-input__field:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(249, 168, 212, 0.12);
}
.chat-input__textarea {
  flex: 1;
  min-width: 0;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-sm);
  line-height: 1.4;
  resize: none;
  height: 42px;
  font-family: inherit;
  overflow-y: auto;
  scrollbar-width: none;
}
.chat-input__textarea:focus {
  outline: none;
}

.chat-scroll-bottom-btn {
  /* lifted above the bar (DOM order keeps Vue's v-if/v-else adjacency) */
  order: -1;
  align-self: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: var(--rounded-full);
  display: flex;
  align-items: center;
  justify-content: center;
  /* glass, same material as the dock */
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: opacity 0.25s ease, color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}
.chat-scroll-bottom-btn:hover {
  /* same color, one step deeper — surface darkened 20% at the same 70% glass
     (surface 56% + black 14% + transparent 30% ⇒ 80/20 color mix, α 0.7) */
  background: color-mix(in srgb, var(--color-surface) 56%, black 14%, transparent 30%);
  border-color: var(--color-border);
  color: var(--color-text-heading);
}
/* at the bottom of the page there is nothing to jump to — fade it out in place */
.chat-scroll-bottom-btn.chat-scroll-bottom-btn--hidden {
  opacity: 0;
  pointer-events: none;
}

.chat-send-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  padding: 0;
  border-radius: var(--rounded-full);
  display: flex;
  align-items: center;
  justify-content: center;
  /* frosted version of btn--primary's ink (#111827) */
  background: color-mix(in srgb, #111827 70%, transparent);
  border-color: transparent;
  backdrop-filter: blur(12px);
}
.chat-send-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #1f2937 70%, transparent);
}
.chat-send-btn:disabled {
  /* frosted neutral instead of the global solid disabled fill */
  background: color-mix(in srgb, var(--color-border-light) 70%, transparent);
}

/* ── Login hint ── */

.chat-login-hint {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-full);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(12px);
}
[data-theme="dark"] .chat-login-hint {
  background: rgba(26, 29, 39, 0.7);
}

.chat-login-hint a {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}

/* ── Dock show/hide (input bar + login hint share one motion) ── */
/* soft slide + fade: long ease-out curve so the dock settles instead of
   snapping; opacity keeps the travel from reading as a hard-edged slide */
.chat-input-area,
.chat-login-hint {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
.chat-input-area.chat-dock--away,
.chat-login-hint.chat-dock--away {
  transform: translateY(200px);
  opacity: 0;
  pointer-events: none;
}
.mention-link {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}
.mention-link:hover {
  text-decoration: underline;
}

</style>

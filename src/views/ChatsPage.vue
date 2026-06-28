<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { chatAPI, fileAPI } from '@/api'
import { formatDate } from '@/utils/format'
import MediaViewer from '@/components/MediaViewer.vue'

const { t } = useI18n()
const { getMessage } = useError()
const auth = useAuthStore()

const messages = ref([])
const content = ref('')
const sending = ref(false)
const loading = ref(true)
const page = ref(1)
const hasMore = ref(true)
const chatEl = ref(null)
const uploadFile = ref(null)
const uploading = ref(false)
const previewSrc = ref(null)
const previewOpen = ref(false)

const live = ref(true)
let pollTimer = null

function startPoll() {
  stopPoll()
  pollTimer = setInterval(pollNew, 3000)
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

watch(live, (v) => {
  if (v) startPoll()
  else stopPoll()
})

onMounted(async () => {
  await fetchMessages()
  scrollBottom()
  startPoll()
})

onUnmounted(() => stopPoll())

async function fetchMessages() {
  try {
    const { data } = await chatAPI.getList(page.value)
    const list = data.data?.records || []
    if (list.length === 0) hasMore.value = false
    messages.value = [...list, ...messages.value]
  } catch (e) {
    // ignore
  } finally {
    loading.value = false
  }
}

function scrollBottom() {
  nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
  })
}

async function pollNew() {
  try {
    const { data } = await chatAPI.getList(1, 50)
    const list = data.data?.records || []
    const existingIds = new Set(messages.value.map(m => m.id))
    const newMsgs = list.filter(m => !existingIds.has(m.id))
    if (newMsgs.length > 0) {
      messages.value.push(...newMsgs)
      const atBottom = chatEl.value && chatEl.value.scrollTop + chatEl.value.clientHeight >= chatEl.value.scrollHeight - 60
      if (atBottom) scrollBottom()
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
    messages.value.push(data.data)
    content.value = ''
    scrollBottom()
  } catch (e) {
    // ignore
  } finally {
    sending.value = false
  }
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) uploadFile.value = f
}

function isImage(path) {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(path)
}

function isVideo(path) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(path)
}

function isAudio(path) {
  return /\.(mp3|wav|aac|flac|ogg)(\?|$)/i.test(path)
}

function openPreview(src) {
  previewSrc.value = src
  previewOpen.value = true
}
</script>

<template>
  <div class="chats container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('chat.title') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('chat.subtitle') }}</p>
    </div>

    <div class="chat-box" ref="chatEl">
      <p v-if="loading" class="chat-loading">{{ t('common.loading') }}</p>
      <template v-else>
        <div v-for="msg in messages" :key="msg.id" class="chat-msg" :class="{ 'chat-msg--mine': auth.user?.id === msg.userId }">
          <router-link :to="`/members/${msg.userId}`" class="chat-msg__avatar">
            <img v-if="msg.userAvatar" :src="msg.userAvatar" alt="" />
            <span v-else>{{ (msg.userNickname || '?')[0] }}</span>
          </router-link>
          <div class="chat-msg__body">
            <div class="chat-msg__meta">
              <span class="chat-msg__author">{{ msg.userNickname }}</span>
              <span class="chat-msg__time">{{ formatDate(msg.createdAt) }}</span>
            </div>
            <div v-if="msg.content" class="chat-msg__content">{{ msg.content }}</div>
            <div v-if="msg.file" class="chat-msg__file">
              <img
                v-if="isImage(msg.file)"
                :src="msg.file"
                class="chat-msg__img"
                @click="openPreview(msg.file)"
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <span>Audio</span>
              </div>
              <a v-else :href="msg.file" target="_blank" class="chat-msg__file-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                {{ t('common.download') }}
              </a>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="auth.isLoggedIn" class="chat-input-area">
      <div v-if="uploadFile" class="chat-input__file-tag">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        {{ uploadFile.name }}
        <button class="chat-file-remove" @click="uploadFile = null">&times;</button>
      </div>
      <div class="chat-input__row">
        <button class="chat-live-toggle" :class="{ 'chat-live-toggle--on': live }" @click="live = !live" :title="live ? 'Live on' : 'Live off'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </button>
        <label class="chat-input__file-btn" :class="{ 'chat-input__file-btn--disabled': uploading }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <input type="file" @change="onFileChange" accept="image/*,video/*" />
        </label>
        <textarea
          v-model="content"
          class="chat-input__textarea"
          :placeholder="t('chat.placeholder')"
          rows="2"
          @keydown.enter.exact.prevent="handleSend"
        ></textarea>
        <button class="btn btn--primary chat-send-btn" :disabled="sending || (!content.trim() && !uploadFile)" @click="handleSend">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
    <p v-else class="chat-login-hint">
      {{ t('chat.loginHint') }} <router-link to="/login">{{ t('auth.login') }}</router-link>
    </p>

    <MediaViewer :visible="previewOpen" :src="previewSrc" @close="previewOpen = false; previewSrc = null" />
  </div>
</template>

<style scoped>
.chats {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - var(--navbar-height) - var(--spacing-4xl));
  padding-bottom: 200px;
}

/* ── Message area ── */

.chat-box {
  flex: 1;
  background: var(--color-bg);
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

.chat-loading {
  text-align: center;
  color: var(--color-text-secondary);
  margin: auto;
  font-size: var(--text-sm);
}

/* ── Message bubble ── */

.chat-msg {
  display: flex;
  gap: var(--spacing-sm);
  max-width: 75%;
  animation: fadeInUp 0.25s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.chat-msg--mine {
  align-self: flex-end;
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

.chat-msg__body {
  background: var(--color-surface);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  min-width: 0;
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
.chat-msg__time {
  font-size: 10px;
  color: var(--color-text-tertiary, #999);
  letter-spacing: .02em;
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
.chat-msg__img:hover { border-color: #f9a8d4; transform: scale(1.01); }

.chat-msg__video-card {
  position: relative;
  max-width: 280px;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: var(--rounded-md);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast);
}
.chat-msg__video-card:hover { border-color: #f9a8d4; }
.chat-msg__video-card video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.85;
}

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
  color: #f9a8d4;
  border: 2px solid transparent;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}
.chat-msg__audio:hover { border-color: #f9a8d4; color: #f472b6; }

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

/* ── Input area ── */

.chat-input-area {
  position: fixed;
  bottom: 108px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(var(--content-max-width) - 2 * var(--spacing-xl));
  max-width: calc(100% - 2 * var(--spacing-xl));
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-xl);
  z-index: 50;
  padding: var(--spacing-md);
  border-radius: 28px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.chat-input__file-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 4px 12px;
  border-radius: var(--rounded-full);
  margin-bottom: var(--spacing-sm);
  font-weight: var(--weight-medium);
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
  gap: var(--spacing-sm);
  align-items: flex-end;
}

.chat-live-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--color-text-tertiary, #999);
  cursor: pointer;
  border-radius: var(--rounded-full);
  transition: all var(--transition-fast);
  flex-shrink: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
}
.chat-live-toggle:hover {
  color: var(--color-text-secondary);
  border-color: var(--color-text-secondary);
}
.chat-live-toggle--on {
  color: #f9a8d4;
  border-color: #f9a8d4;
  background: rgba(249, 168, 212, 0.08);
}
.chat-live-toggle--on:hover {
  color: #f472b6;
  border-color: #f472b6;
  background: rgba(249, 168, 212, 0.15);
}

.chat-input__file-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--rounded-full);
  transition: all var(--transition-fast);
  flex-shrink: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
}
.chat-input__file-btn:hover {
  color: #f9a8d4;
  border-color: #f9a8d4;
  background: rgba(249, 168, 212, 0.08);
}
.chat-input__file-btn--disabled { opacity: 0.4; pointer-events: none; }
.chat-input__file-btn input { display: none; }

.chat-input__textarea {
  flex: 1;
  padding: 10px var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-full);
  font-size: var(--text-sm);
  line-height: 1.4;
  background: var(--color-bg);
  color: var(--color-text);
  resize: none;
  height: 42px;
  font-family: inherit;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.chat-input__textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(249, 168, 212, 0.12);
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
}

/* ── Login hint ── */

.chat-login-hint {
  position: fixed;
  bottom: 108px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(var(--content-max-width) - 2 * var(--spacing-xl));
  max-width: calc(100% - 2 * var(--spacing-xl));
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  padding: var(--spacing-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-xl);
  z-index: 50;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.chat-login-hint a {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}
</style>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'

const props = defineProps({
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  url: { type: String, required: true }
})

const { t } = useI18n()
const open = ref(false)
const copied = ref(false)
const wechatCopied = ref(false)
let copyTimer = null
let wechatCopyTimer = null

function onDocClick(e) {
  if (open.value && !e.target.closest('.share-wrap')) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
  if (wechatCopyTimer) clearTimeout(wechatCopyTimer)
  document.removeEventListener('click', onDocClick)
})

function shareToQQ() {
  const shareUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(props.url)}&title=${encodeURIComponent(props.title)}&summary=${encodeURIComponent(props.text)}`
  window.open(shareUrl, '_blank', 'width=600,height=500')
  open.value = false
}

function shareToQQZone() {
  const shareUrl = `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(props.url)}&title=${encodeURIComponent(props.title)}&summary=${encodeURIComponent(props.text)}`
  window.open(shareUrl, '_blank', 'width=600,height=500')
  open.value = false
}

function shareToWeibo() {
  const shareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(props.url)}&title=${encodeURIComponent(props.title)}`
  window.open(shareUrl, '_blank', 'width=600,height=500')
  open.value = false
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

async function shareToWechat() {
  try {
    await navigator.clipboard.writeText(props.url)
    wechatCopied.value = true
    if (wechatCopyTimer) clearTimeout(wechatCopyTimer)
    wechatCopyTimer = setTimeout(() => { wechatCopied.value = false }, 2000)
  } catch {}
}

function toggleDrop() {
  open.value = !open.value
}
</script>

<template>
  <div class="share-wrap" @click.stop>
    <button class="share-btn" :class="{ 'share-btn--open': open }" @click="toggleDrop" :title="t('share.forward')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    </button>
    <Transition name="drop">
      <div v-if="open" class="share-drop">
        <button class="share-drop__item" @click="shareToQQ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{{ t('share.qq') }}</span>
        </button>
        <button class="share-drop__item" @click="shareToQQZone">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12,2.5 15,10 23,10 16.5,15 19,22.5 12,18 5,22.5 7.5,15 1,10 9,10"/>
            <text x="12" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor" stroke="none">z</text>
          </svg>
          <span>{{ t('share.qqZone') }}</span>
        </button>
        <button class="share-drop__item" @click="shareToWechat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{{ wechatCopied ? t('share.copied') : t('share.wechat') }}</span>
        </button>
        <button class="share-drop__item" @click="shareToWeibo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
          <span>{{ t('share.weibo') }}</span>
        </button>
        <button class="share-drop__item" @click="copyLink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span>{{ copied ? t('share.copied') : t('share.copyLink') }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.share-wrap {
  position: relative;
  display: inline-flex;
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: 1;
}
.share-btn:hover,
.share-btn--open {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.share-drop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  box-shadow: inset 0 0 0 1px var(--color-border);
  z-index: 100;
}

.share-drop__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm);
  border: none;
  border-radius: var(--rounded-sm);
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background .12s ease;
  text-align: left;
}
.share-drop__item:hover {
  background: var(--color-primary-light);
}

.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

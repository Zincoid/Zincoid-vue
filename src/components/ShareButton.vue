<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'

const props = defineProps({
  title: { type: String, default: '' },
  text: { type: String, default: '' },
  url: { type: String, required: true },
  image: { type: String, default: '' }
})

const { t } = useI18n()
const open = ref(false)
const copied = ref(false)
const wechatCopied = ref(false)
let copyTimer = null
let wechatCopyTimer = null

function fullImageUrl(img) {
  if (!img) return ''
  if (img.startsWith('http')) return img
  return `${location.origin}${img}`
}

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
  const shareUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(props.url)}&title=${encodeURIComponent(props.title)}&summary=${encodeURIComponent(props.text)}&pics=${encodeURIComponent(fullImageUrl(props.image))}`
  window.open(shareUrl, '_blank', 'width=600,height=500')
  open.value = false
}

function shareToX() {
  const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(props.url)}&text=${encodeURIComponent(props.title)}`
  window.open(shareUrl, '_blank', 'width=600,height=400')
  open.value = false
}

function shareToQQZone() {
  const shareUrl = `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(props.url)}&title=${encodeURIComponent(props.title)}&summary=${encodeURIComponent(props.text)}&pics=${encodeURIComponent(fullImageUrl(props.image))}`
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
          <svg width="18" height="18" viewBox="-2 0 17 16" fill="currentColor">
            <path d="M6.048 3.323c.022.277-.13.523-.338.55-.21.026-.397-.176-.419-.453-.022-.277.13-.523.338-.55.21-.026.397.176.42.453Zm2.265-.24c-.603-.146-.894.256-.936.333-.027.048-.008.117.037.15.045.035.092.025.119-.003.361-.39.751-.172.829-.129l.011.007c.053.024.147.028.193-.098.023-.063.017-.11-.006-.142-.016-.023-.089-.08-.247-.118Z"/>
            <path fill-rule="evenodd" d="M11.727 6.719c0-.022.01-.375.01-.557 0-3.07-1.45-6.156-5.015-6.156-3.564 0-5.014 3.086-5.014 6.156 0 .182.01.535.01.557l-.72 1.795a25.85 25.85 0 0 0-.534 1.508c-.68 2.187-.46 3.093-.292 3.113.36.044 1.401-1.647 1.401-1.647 0 .979.504 2.256 1.594 3.179-.408.126-.907.319-1.228.556-.29.213-.253.43-.201.518.228.386 3.92.246 4.985.126 1.065.12 4.756.26 4.984-.126.052-.088.088-.305-.2-.518-.322-.237-.822-.43-1.23-.557 1.09-.922 1.594-2.2 1.594-3.178 0 0 1.041 1.69 1.401 1.647.168-.02.388-.926-.292-3.113a25.78 25.78 0 0 0-.534-1.508l-.72-1.795ZM9.773 5.53c-.13-.286-1.431-.605-3.042-.605h-.017c-1.611 0-2.913.319-3.042.605a.096.096 0 0 0-.01.04c0 .022.008.04.018.056.11.159 1.554.943 3.034.943h.017c1.48 0 2.924-.784 3.033-.943a.095.095 0 0 0 .008-.096Zm-4.32-.989c-.483.022-.896-.529-.922-1.229-.026-.7.344-1.286.828-1.308.483-.022.896.529.922 1.23.027.7-.344 1.286-.827 1.307Zm2.538 0c.483.022.896-.529.922-1.229.026-.7-.344-1.286-.827-1.308-.484-.022-.896.529-.923 1.23-.026.7.344 1.285.828 1.307ZM2.928 8.99a10.674 10.674 0 0 0-.097 2.284c.146 2.45 1.6 3.99 3.846 4.012h.091c2.246-.023 3.7-1.562 3.846-4.011.054-.9 0-1.663-.097-2.285-1.312.26-2.669.41-3.786.396h-.017c-.297.003-.611-.005-.937-.023v2.148c-1.106.154-2.21-.068-2.21-.068V9.107a22.93 22.93 0 0 1-.639-.117Z"/>
          </svg>
          <span>{{ t('share.qq') }}</span>
        </button>
        <button class="share-drop__item" @click="shareToQQZone">
          <svg width="18" height="18" viewBox="0 0 1024 1024" fill="currentColor">
            <path d="M504.768 24.224c-5.216 2.144-19.872 17.728-19.872 21.28 0 1.184-22.944 49.888-51.072 108.064S381.568 262.56 380.16 266.592c-1.184 3.776-3.328 8.288-4.256 9.696-1.184 1.408-7.808 14.176-14.88 28.384-7.552 15.616-15.616 28.608-20.096 32.16-10.88 9.216-3.552 8.288-221.312 32.64C21.248 380.576 10.368 382.24 4.48 387.68c-4.256 3.776-5.92 17.504-2.848 25.536 0.96 2.112 43.264 42.336 94.112 89.376 160.768 148.48 150.368 138.08 150.368 149.184 0 5.44-3.296 25.056-7.104 43.968-4.032 18.912-12.992 66.208-20.32 105.216s-15.84 83.712-18.912 99.296c-16.32 83.232-16.544 85.6-8.032 94.592 8.032 8.512 17.248 7.552 41.6-4.736 22.688-11.584 24.832-12.768 69.504-39.008 16.32-9.472 37.6-21.76 47.296-27.2s27.648-16.064 39.712-23.392 22.464-13.248 23.168-13.248c0.48 0 7.808-4.256 16.064-9.472s15.84-9.44 16.8-9.44c0.96 0 9.472-4.736 18.912-10.624 22.464-13.952 41.856-21.056 52.96-18.912 4.736 0.96 16.064 5.44 25.056 10.4 23.648 12.544 172.608 98.368 218.944 126.016 39.488 23.648 51.072 28.128 64.544 24.576 8.992-2.144 11.584-15.136 8.512-40.896-1.408-11.584-3.552-24.608-4.736-29.088-1.888-7.552-9.696-49.408-28.608-154.4-8.736-49.888-8.736-50.848 10.88-58.176 27.2-10.176 39.968-19.136 35.008-24.128-1.664-1.664-16.8 0.256-48.224 5.92-58.4 10.624-70.464 12.288-132.16 17.984-70.208 6.624-135.008 8.032-221.568 4.96-67.616-2.368-148-8.288-152.512-11.104-3.552-2.368-1.888-9.696 3.552-14.432 2.848-2.592 38.784-28.384 79.68-57.44 128.16-90.784 211.392-150.848 218.24-157.248 11.808-11.104 10.88-11.584-38.304-17.984-77.792-9.92-98.112-11.584-224.864-17.504-42.336-1.888-80.64-4.256-85.12-4.96-46.336-7.808 189.856-29.088 289.632-26.016 65.504 1.888 142.592 7.328 187.968 13.248 42.336 5.664 44.928 6.144 44.928 10.88 0 3.776-4.48 7.104-104.032 75.648-40.896 28.384-84.416 58.4-96.704 66.912-12.064 8.512-24.576 17.248-27.424 19.136-13.248 8.992-57.696 39.968-69.984 48.928-7.808 5.664-13.952 11.808-13.952 13.728 0 4.48 11.584 7.328 47.296 11.584 94.816 11.104 271.2 17.248 279.008 9.472 1.664-1.664 1.408-6.848-1.184-17.728-1.888-8.288-3.552-16.096-3.552-17.248 0-3.328 40.192-43.52 95.744-95.52 146.816-137.6 150.144-140.928 150.144-151.808 0-9.472-7.808-17.984-19.392-20.8-5.664-1.408-39.488-5.216-75.2-8.736-35.712-3.328-75.2-7.104-87.488-8.288-12.288-1.408-38.304-4.032-57.92-6.144-74.944-7.552-97.888-10.4-103.328-12.992-10.4-4.736-20.096-24.128-91.744-185.376C537.824 44.8 533.344 35.584 526.24 29.216c-5.888-5.44-15.104-7.552-21.504-4.96z"/>
          </svg>
          <span>{{ t('share.qqZone') }}</span>
        </button>
        <button class="share-drop__item" @click="shareToWechat">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.176 14.429c-2.665 0-4.826-1.8-4.826-4.018 0-2.22 2.159-4.02 4.824-4.02S16 8.191 16 10.411c0 1.21-.65 2.301-1.666 3.036a.324.324 0 0 0-.12.366l.218.81a.616.616 0 0 1 .029.117.166.166 0 0 1-.162.162.177.177 0 0 1-.092-.03l-1.057-.61a.519.519 0 0 0-.256-.074.509.509 0 0 0-.142.021 5.668 5.668 0 0 1-1.576.22ZM9.064 9.542a.647.647 0 1 0 .557-1 .645.645 0 0 0-.646.647.615.615 0 0 0 .09.353Zm3.232.001a.646.646 0 1 0 .546-1 .645.645 0 0 0-.644.644.627.627 0 0 0 .098.356Z"/>
            <path d="M0 6.826c0 1.455.781 2.765 2.001 3.656a.385.385 0 0 1 .143.439l-.161.6-.1.373a.499.499 0 0 0-.032.14.192.192 0 0 0 .193.193c.039 0 .077-.01.111-.029l1.268-.733a.622.622 0 0 1 .308-.088c.058 0 .116.009.171.025a6.83 6.83 0 0 0 1.625.26 4.45 4.45 0 0 1-.177-1.251c0-2.936 2.785-5.02 5.824-5.02.05 0 .1 0 .15.002C10.587 3.429 8.392 2 5.796 2 2.596 2 0 4.16 0 6.826Zm4.632-1.555a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0Zm3.875 0a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0Z"/>
          </svg>
          <span>{{ wechatCopied ? t('share.copied') : t('share.wechat') }}</span>
        </button>
        <button class="share-drop__item" @click="shareToWeibo">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.878 1.093a4.23 4.23 0 0 1 4.031 1.305 4.225 4.225 0 0 1 .886 4.14v.001a.612.612 0 0 1-1.166-.377 3.01 3.01 0 0 0-3.495-3.873.611.611 0 1 1-.256-1.196Z"/>
            <path fill-rule="evenodd" d="M3.753 9.465c.548-1.11 1.972-1.74 3.233-1.411 1.304.338 1.971 1.568 1.437 2.764-.541 1.221-2.095 1.875-3.416 1.449-1.271-.411-1.812-1.67-1.254-2.802Zm2.658.567c.16.066.365-.009.458-.168.088-.16.03-.34-.129-.397-.156-.062-.353.013-.446.168-.09.154-.041.333.117.397Zm-1.607 1.314c.413.188.963.009 1.219-.4.252-.413.12-.883-.296-1.062-.41-.172-.94.005-1.194.402-.256.4-.135.874.271 1.06Z"/>
            <path fill-rule="evenodd" d="m12.014 7.238.005.001c.919.285 1.941.974 1.939 2.188 0 2.007-2.895 4.535-7.246 4.535C3.393 13.962 0 12.352 0 9.708c0-1.385.876-2.985 2.384-4.493C4.4 3.199 6.751 2.28 7.634 3.165c.39.392.427 1.065.177 1.87-.132.405.38.182.38.182 1.63-.682 3.051-.722 3.57.02.278.397.252.951-.004 1.594-.116.293.035.34.257.407Zm-10.4 3.101c.172 1.738 2.46 2.936 5.109 2.674 2.647-.26 4.656-1.883 4.482-3.623-.17-1.738-2.458-2.937-5.107-2.674-2.647.263-4.656 1.883-4.484 3.623Z"/>
            <path d="M13.295 3.855a2.056 2.056 0 0 0-1.962-.634.526.526 0 1 0 .219 1.031 1.008 1.008 0 0 1 1.17 1.296.528.528 0 0 0 1.005.325 2.062 2.062 0 0 0-.432-2.018Z"/>
          </svg>
          <span>{{ t('share.weibo') }}</span>
        </button>
        <button class="share-drop__item" @click="shareToX">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4l11.73 16h4.27L8.27 4H4z"/>
            <path d="M4 20l6.5-8"/>
            <path d="M18 4l-6.5 8"/>
          </svg>
          <span>{{ t('share.x') }}</span>
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

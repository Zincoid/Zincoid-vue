<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { useConfig } from '@/composables/useConfig'
import { useMention } from '@/composables/useMention'
import { momentAPI, fileAPI } from '@/api'
import MomentCard from '@/components/MomentCard.vue'
import Pagination from '@/components/Pagination.vue'
import MentionDropdown from '@/components/MentionDropdown.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { t } = useI18n()
const { getMessage } = useError()
const auth = useAuthStore()
const mention = useMention()
const { load: loadConfig, get: getConfig } = useConfig()

const moments = ref([])
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const pageSize = ref(10)
const pinnedFirst = ref(false)
const loading = ref(true)
const loadingDone = ref(false)
const showEditor = ref(false)

// Post form
const newContent = ref('')
const newImageFiles = ref([])
const newImagePreviews = ref([])
const posting = ref(false)
const momentTextarea = ref(null)

onMounted(async () => {
  await loadConfig()
  fetchMoments()
})

async function fetchMoments() {
  loading.value = true
  try {
    pageSize.value = parseInt(getConfig('page_size', '10'))
    const { data } = await momentAPI.getTimeline(page.value, pageSize.value, pinnedFirst.value)
    moments.value = data.data.records || []
    pages.value = data.data.pages || 1
    total.value = data.data.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function onPageChange(p) {
  page.value = p
  fetchMoments()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onMomentInput(e) {
  newContent.value = e.target.value
  mention.onInput(e.target)
}

function handleUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  newImageFiles.value.push(file)
  const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image'
  newImagePreviews.value.push({ url: URL.createObjectURL(file), type })
  e.target.value = ''
}

function removeImage(i) {
  newImageFiles.value.splice(i, 1)
  URL.revokeObjectURL(newImagePreviews.value[i].url)
  newImagePreviews.value.splice(i, 1)
}

async function submitMoment() {
  if (!newContent.value.trim() && !newImageFiles.value.length) return
  posting.value = true
  try {
    const urls = []
    for (const file of newImageFiles.value) {
      const { data } = await fileAPI.upload(file)
      urls.push(data.data.url)
    }
    await momentAPI.create({
      content: newContent.value.trim(),
      images: urls
    })
    newContent.value = ''
    newImageFiles.value = []
    newImagePreviews.value = []
    showEditor.value = false
    page.value = 1
    await fetchMoments()
  } catch (err) {
    if (err?.response?.status !== 401) alert(getMessage(err, 'moment.postFailed'))
  } finally {
    posting.value = false
  }
}
</script>

<template>
  <div class="timeline container">
    <div class="header">
      <div class="page-header">
        <h1 class="page-header__title"># {{ t('moment.title') }}<span class="cursor">_</span></h1>
        <p class="page-header__subtitle">{{ t('moment.subtitle') }}</p>
      </div>
      <button v-if="auth.isLoggedIn" class="btn btn--primary" @click="showEditor = !showEditor">
        <svg v-if="!showEditor" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        {{ showEditor ? t('common.cancel') : t('moment.new') }}
      </button>
    </div>

    <!-- Editor -->
    <div v-if="showEditor" class="editor">
      <textarea
        ref="momentTextarea"
        :value="newContent"
        class="editor__input"
        :placeholder="t('moment.placeholder')"
        rows="3"
        @input="onMomentInput"
        @keydown.esc="mention.close()"
      ></textarea>
      <MentionDropdown
        :suggestions="mention.suggestions"
        :pos="mention.mentionPos"
        @select="(username) => mention.insert(momentTextarea, username)"
      />

      <div v-if="newImagePreviews.length" class="editor__images">
        <div v-for="(item, i) in newImagePreviews" :key="i" class="editor__image-wrap">
          <img v-if="item.type === 'image'" :src="item.url" alt="" />
          <div v-else-if="item.type === 'video'" class="editor__video-preview">
            <video :src="item.url" muted></video>
            <div class="editor__play-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div v-else class="editor__audio-preview">
            <div class="editor__audio-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
          </div>
          <button class="editor__remove" @click="removeImage(i)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="editor__actions">
        <label class="btn btn--outline btn--sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          {{ t('moment.attach') }}
          <input type="file" accept="image/*,video/*,audio/*" class="hidden-input" @change="handleUpload" />
        </label>
        <button
          class="btn btn--primary btn--sm"
          :disabled="(!newContent.trim() && !newImageFiles.length) || posting"
          @click="submitMoment"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          {{ posting ? t('common.posting') : t('moment.post') }}
        </button>
      </div>
    </div>

    <!-- Timeline -->
    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone">
      <div v-if="moments.length" class="timeline-list">
        <MomentCard v-for="m in moments" :key="m.id" :moment="m" />
      </div>
      <p v-else class="empty-state">{{ t('moment.empty') }}</p>
    </template>

    <Pagination v-if="loadingDone" :page="page" :pages="pages" :total="total" :size="pageSize" @change="onPageChange" />
  </div>

  <button
    class="pin-fab"
    :class="{ 'pin-fab--active': pinnedFirst }"
    :title="t('moment.pinnedFirst')"
    @click="pinnedFirst = !pinnedFirst; page = 1; fetchMoments()"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 17v5"/>
      <path v-if="pinnedFirst" d="M15 9.34V7h1a2 2 0 0 0 0-4H7.89"/><path v-if="pinnedFirst" d="m2 2 20 20"/><path v-if="pinnedFirst" d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h7.32"/>
      <path v-else d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z"/>
    </svg>
  </button>
</template>

<style scoped>
.timeline { padding-bottom: var(--spacing-4xl); }
.header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-lg); }

.editor { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); padding: var(--spacing-lg); margin-bottom: var(--spacing-xl); display: flex; flex-direction: column; gap: var(--spacing-md); position: relative; }
.editor__input { width: 100%; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--rounded-md); font-size: var(--text-sm); line-height: var(--leading-normal); background: var(--color-bg); color: var(--color-text); resize: vertical; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.editor__input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-light); }
.editor__images { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.editor__image-wrap { position: relative; width: 80px; height: 80px; }
.editor__image-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--rounded-md); }
.editor__remove { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: var(--rounded-full); background: var(--color-danger); color: white; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.editor__actions { display: flex; gap: var(--spacing-sm); align-items: center; justify-content: flex-end; }
.editor__actions .btn { flex: 1; }
.editor__video-preview { position: relative; width: 100%; height: 100%; background: #000; border-radius: var(--rounded-md); overflow: hidden; display: flex; align-items: center; justify-content: center; }
.editor__video-preview video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
.editor__play-icon { position: relative; width: 28px; height: 28px; border-radius: var(--rounded-full); background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; color: white; }
.editor__play-icon svg { margin-left: 2px; }
.editor__audio-preview { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--color-bg-alt); border-radius: var(--rounded-md); color: var(--color-text-secondary); }
.editor__audio-icon { width: 28px; height: 28px; border-radius: var(--rounded-full); background: var(--color-border); display: flex; align-items: center; justify-content: center; }
.hidden-input { display: none; }

.timeline-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
</style>

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
import SvgIcon from '@/components/SvgIcon.vue'
import UploadProgress from '@/components/UploadProgress.vue'

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
const newVisibility = ref(0)
const posting = ref(false)
const uploadState = ref({
  total: 0,
  uploaded: 0,
  currentFile: 0,
  currentProgress: 0
})
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
  const totalFiles = newImageFiles.value.length
  uploadState.value = { total: totalFiles, uploaded: 0, currentFile: 0, currentProgress: 0 }
  try {
    const urls = []
    for (let i = 0; i < newImageFiles.value.length; i++) {
      uploadState.value.currentFile = i + 1
      uploadState.value.currentProgress = 0
      const file = newImageFiles.value[i]
      let uploadData
      try {
        const { data } = await fileAPI.upload(file, null, null, (e) => {
          if (e.total) {
            uploadState.value.currentProgress = Math.round((e.loaded / e.total) * 100)
          }
        })
        uploadData = data
      } catch (err) {
        if (err?.response?.status !== 401) alert(getMessage(err, 'common.uploadFailed'))
        return
      }
      urls.push(uploadData.data.url)
      uploadState.value.uploaded = i + 1
    }
    await momentAPI.create({
      content: newContent.value.trim(),
      images: urls,
      visibility: newVisibility.value
    })
    newContent.value = ''
    newImageFiles.value = []
    newImagePreviews.value = []
    newVisibility.value = 0
    showEditor.value = false
    page.value = 1
    await fetchMoments()
  } catch (err) {
    if (err?.response?.status !== 401) alert(getMessage(err, 'moment.postFailed'))
  } finally {
    posting.value = false
    uploadState.value = { total: 0, uploaded: 0, currentFile: 0, currentProgress: 0 }
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
        <SvgIcon v-if="!showEditor" name="plus" />
        <SvgIcon v-else name="close" />
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

      <div class="editor__meta-row">
        <div class="visibility-toggle">
          <button
            class="visibility-btn"
            :class="{ 'visibility-btn--active': newVisibility === 0 }"
            @click="newVisibility = 0"
            type="button"
          >
            <SvgIcon name="world" :size="14" />
            {{ t('visibility.public') }}
          </button>
          <button
            class="visibility-btn"
            :class="{ 'visibility-btn--active': newVisibility === 1 }"
            @click="newVisibility = 1"
            type="button"
          >
            <SvgIcon name="lock" :size="14" />
            {{ t('visibility.private') }}
          </button>
        </div>

        <UploadProgress
          v-if="uploadState.total > 0"
          :total="uploadState.total"
          :uploaded="uploadState.uploaded"
          :current-progress="uploadState.currentProgress"
        />
      </div>

      <div v-if="newImagePreviews.length" class="editor__images">
        <div v-for="(item, i) in newImagePreviews" :key="i" class="editor__image-wrap">
          <img v-if="item.type === 'image'" :src="item.url" alt="" />
          <div v-else-if="item.type === 'video'" class="editor__video-preview">
            <video :src="item.url" muted></video>
            <div class="editor__play-icon">
              <SvgIcon name="play" :size="18" />
            </div>
          </div>
          <div v-else class="editor__audio-preview">
            <div class="editor__audio-icon">
              <SvgIcon name="audio" :size="18" />
            </div>
          </div>
          <button class="editor__remove" @click="removeImage(i)">
            <SvgIcon name="close" :size="10" />
          </button>
        </div>
      </div>

      <div class="editor__actions">
        <label class="btn btn--outline btn--sm">
          <SvgIcon name="attach" />
          {{ t('moment.attach') }}
          <input type="file" accept="image/*,video/*,audio/*" class="hidden-input" @change="handleUpload" />
        </label>
        <button
          class="btn btn--primary btn--sm"
          :disabled="(!newContent.trim() && !newImageFiles.length) || posting"
          @click="submitMoment"
        >
          <SvgIcon name="send" />
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
.header .page-header { flex: 1; min-width: 0; }
.header .btn { flex-shrink: 0; }

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

.editor__meta-row { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-md); flex-wrap: wrap; }

.visibility-toggle { display: flex; gap: var(--spacing-sm); }
.visibility-btn { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--rounded-md); background: var(--color-surface); color: var(--color-text-secondary); font-size: var(--text-xs); cursor: pointer; transition: all var(--transition-fast); }
.visibility-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.visibility-btn--active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
</style>

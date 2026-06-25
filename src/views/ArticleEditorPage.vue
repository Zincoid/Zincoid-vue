<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { articleAPI, fileAPI } from '@/api'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const { t } = useI18n()
const { getMessage } = useError()

const route = useRoute()
const router = useRouter()
const isEdit = ref(!!route.params.id)

const form = ref({
  title: '',
  contentMd: '',
  summary: '',
  coverImage: '',
  status: 1
})

const mdEditor = ref(null)
const error = ref('')
const publishing = ref(false)
const coverFile = ref(null)
const coverPreview = ref('')

onMounted(async () => {
  if (isEdit.value) {
    try {
      const { data } = await articleAPI.getDetail(route.params.id)
      const a = data.data
      form.value = {
        title: a.title || '',
        contentMd: a.contentMd || '',
        summary: a.summary || '',
        coverImage: a.coverImage || '',
        status: 1
      }
    } catch (e) {
      error.value = t('article.loadFailed')
    }
  }
})

function handleCoverUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

async function save() {
  if (!form.value.title.trim() || !form.value.contentMd.trim()) {
    error.value = t('article.titleRequired')
    return
  }
  publishing.value = true
  error.value = ''
  try {
    const contentMd = await mdEditor.value.resolveImages(form.value.contentMd)
    if (coverFile.value) {
      const { data } = await fileAPI.upload(coverFile.value, 'ARTICLE', null)
      form.value.coverImage = data.data.url
    }
    const payload = { ...form.value, contentMd }
    if (isEdit.value) {
      await articleAPI.update(route.params.id, payload)
    } else {
      const { data } = await articleAPI.create(payload)
      router.push(`/articles/${data.data.id}`)
      return
    }
    router.push(`/articles/${route.params.id}`)
  } catch (err) {
    error.value = getMessage(err, 'article.saveFailed')
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <div class="editor-page container">
    <h1># {{ isEdit ? t('article.editorTitle') : t('article.newTitle') }}<span class="cursor">_</span></h1>

    <div class="fields">
      <div class="field">
        <label>{{ t('article.titleField') }}</label>
        <input v-model="form.title" class="field__input" />
      </div>

      <div class="field">
        <label>{{ t('article.summary') }}</label>
        <input v-model="form.summary" class="field__input" />
      </div>

      <div class="field">
        <div class="cover-label-row">
          <label class="field__label">{{ t('article.cover') }}</label>
          <label class="btn btn--outline btn--sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {{ t('article.upload') }}
            <input type="file" accept="image/*" class="hidden-input" @change="handleCoverUpload" />
          </label>
        </div>
        <img v-if="coverPreview || form.coverImage" :src="coverPreview || form.coverImage" class="cover-preview" />
      </div>

      <div class="field">
        <label>{{ t('article.content') }}</label>
        <MarkdownEditor ref="mdEditor" v-model="form.contentMd" />
      </div>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div class="actions">
      <router-link to="/articles" class="btn btn--outline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        {{ t('common.cancel') }}
      </router-link>
      <button class="btn btn--primary" :disabled="publishing" @click="save">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        {{ publishing ? t('article.publishing') : (isEdit ? t('common.update') : t('article.publish')) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-page { padding: var(--spacing-2xl) 0 var(--spacing-4xl); }
h1 { margin-bottom: var(--spacing-2xl); }
.fields { display: flex; flex-direction: column; gap: var(--spacing-xl); margin-bottom: var(--spacing-xl); }
.field { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.field label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); }
.cover-label-row { display: flex; justify-content: space-between; align-items: center; }
.cover-preview { width: 200px; height: 112px; object-fit: cover; border-radius: var(--rounded-md); border: 1px solid var(--color-border); margin-top: var(--spacing-sm); }
.hidden-input { display: none; }

.error-msg { margin-bottom: var(--spacing-lg); }

.actions { display: flex; gap: var(--spacing-md); justify-content: flex-end; }
.actions .btn { flex: 1; }
</style>

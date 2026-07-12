<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { articleAPI, fileAPI } from '@/api'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import SvgIcon from '@/components/SvgIcon.vue'

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
  visibility: 0
})

const mdEditor = ref(null)
const error = ref('')
const publishing = ref(false)
const coverFile = ref(null)
const coverPreview = ref('')
const coverRemoved = ref(false)

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
        visibility: a.visibility != null ? a.visibility : 0
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
  coverRemoved.value = false
}

function removeCover() {
  coverFile.value = null
  coverPreview.value = ''
  form.value.coverImage = ''
  coverRemoved.value = true
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
    if (coverRemoved.value) {
      form.value.coverImage = ''
    } else if (coverFile.value) {
      const { data } = await fileAPI.upload(coverFile.value)
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
            <SvgIcon name="upload" />
            {{ t('article.upload') }}
            <input type="file" accept="image/*" class="hidden-input" @change="handleCoverUpload" />
          </label>
        </div>
        <div v-if="coverPreview || form.coverImage" class="cover-preview-wrap">
          <img :src="coverPreview || form.coverImage" class="cover-preview" />
          <button class="cover-preview-remove" @click="removeCover" title="Remove cover">&times;</button>
        </div>
      </div>

      <div class="field">
        <div class="cover-label-row">
          <label class="field__label">{{ t('article.visibility') }}</label>
        </div>
        <div class="visibility-toggle">
          <button
            class="visibility-btn"
            :class="{ 'visibility-btn--active': form.visibility === 0 }"
            @click="form.visibility = 0"
            type="button"
          >
            <SvgIcon name="world" :size="14" />
            {{ t('visibility.public') }}
          </button>
          <button
            class="visibility-btn"
            :class="{ 'visibility-btn--active': form.visibility === 1 }"
            @click="form.visibility = 1"
            type="button"
          >
            <SvgIcon name="lock" :size="14" />
            {{ t('visibility.private') }}
          </button>
        </div>
      </div>

      <div class="field">
        <label>{{ t('article.content') }}</label>
        <MarkdownEditor ref="mdEditor" v-model="form.contentMd" />
      </div>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <div class="actions">
      <router-link to="/articles" class="btn btn--outline">
        <SvgIcon name="close" :size="16" />
        {{ t('common.cancel') }}
      </router-link>
      <button class="btn btn--primary" :disabled="publishing" @click="save">
        <SvgIcon name="save" :size="16" />
        {{ publishing ? t('article.publishing') : (isEdit ? t('common.update') : t('article.publish')) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-page { padding-top: var(--spacing-2xl); padding-bottom: var(--spacing-4xl); }
h1 { margin-bottom: var(--spacing-2xl); }
.fields { display: flex; flex-direction: column; gap: var(--spacing-xl); margin-bottom: var(--spacing-xl); }
.field { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.field label { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); }
.cover-label-row { display: flex; justify-content: space-between; align-items: center; }
.cover-preview-wrap { position: relative; display: inline-block; margin-top: var(--spacing-sm); }
.cover-preview { max-width: 200px; max-height: 200px; object-fit: contain; border-radius: var(--rounded-md); border: 1px solid var(--color-border); background: var(--color-bg-alt); display: block; }
.cover-preview-remove { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: var(--rounded-full); background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 14px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.cover-preview-remove:hover { background: var(--color-red, #e74c3c); color: #fff; border-color: var(--color-red, #e74c3c); }
.hidden-input { display: none; }

.error-msg { margin-bottom: var(--spacing-lg); }

.actions { display: flex; gap: var(--spacing-md); justify-content: flex-end; }
.actions .btn { flex: 1; }

.visibility-toggle { display: flex; gap: var(--spacing-sm); }
.visibility-btn { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--rounded-md); background: var(--color-surface); color: var(--color-text-secondary); font-size: var(--text-xs); cursor: pointer; transition: all var(--transition-fast); }
.visibility-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.visibility-btn--active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
</style>

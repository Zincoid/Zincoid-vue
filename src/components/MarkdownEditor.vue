<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { fileAPI } from '@/api'
import { marked } from 'marked'

const { t } = useI18n()
const { getMessage } = useError()

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const previewMode = ref(false)
const pendingFiles = ref([])
const pendingPreviews = ref([])
const textareaRef = ref(null)

const effectivePlaceholder = computed(() => props.placeholder || t('common.mdPlaceholder'))

const html = computed(() => {
  if (!props.modelValue) return ''
  return marked(props.modelValue)
})

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function insertAtCursor(md) {
  const ta = textareaRef.value
  if (!ta) return props.modelValue ? props.modelValue + '\n' + md : md
  const pos = ta.selectionStart
  const before = props.modelValue.slice(0, pos)
  const after = props.modelValue.slice(pos)
  const sep = before && !before.endsWith('\n') ? '\n' : ''
  return before + sep + md + after
}

function handleUploadImage(e) {
  const file = e.target.files[0]
  if (!file) return
  const blobUrl = URL.createObjectURL(file)
  pendingFiles.value.push(file)
  pendingPreviews.value.push(blobUrl)
  const md = `![${file.name}](${blobUrl})`
  emit('update:modelValue', insertAtCursor(md))
  e.target.value = ''
}

function removePending(idx) {
  const blobUrl = pendingPreviews.value[idx]
  const content = props.modelValue.replace(`![${pendingFiles.value[idx].name}](${blobUrl})`, '').replace(/\n{2,}/g, '\n\n').trimStart()
  URL.revokeObjectURL(blobUrl)
  pendingFiles.value.splice(idx, 1)
  pendingPreviews.value.splice(idx, 1)
  emit('update:modelValue', content)
}

async function resolveImages(content) {
  if (!pendingFiles.value.length) return content
  let resolved = content
  for (let i = 0; i < pendingFiles.value.length; i++) {
    const { data } = await fileAPI.upload(pendingFiles.value[i], 'ARTICLE', null)
    resolved = resolved.replace(pendingPreviews.value[i], data.data.url)
  }
  pendingPreviews.value.forEach(p => URL.revokeObjectURL(p))
  pendingFiles.value = []
  pendingPreviews.value = []
  return resolved
}

defineExpose({ resolveImages })
</script>

<template>
  <div class="md-editor">
    <div class="md-editor__toolbar">
      <div class="md-editor__tabs">
        <button
          class="md-editor__tab"
          :class="{ 'md-editor__tab--active': !previewMode }"
          @click="previewMode = false"
        >
          {{ t('common.edit') }}
        </button>
        <button
          class="md-editor__tab"
          :class="{ 'md-editor__tab--active': previewMode }"
          @click="previewMode = true"
        >
          {{ t('common.preview') }}
        </button>
      </div>
      <label class="md-editor__upload-btn" :title="t('common.addImage')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <input type="file" accept="image/*" class="hidden-input" @change="handleUploadImage" />
      </label>
    </div>

    <div class="md-editor__body">
      <textarea
        ref="textareaRef"
        v-show="!previewMode"
        class="md-editor__textarea"
        :value="modelValue"
        :placeholder="effectivePlaceholder"
        @input="onInput"
      ></textarea>
      <div
        v-show="previewMode"
        class="md-editor__preview markdown-body"
        v-html="html"
      ></div>
    </div>

    <div v-if="!previewMode && pendingPreviews.length" class="md-editor__thumbs">
      <div v-for="(preview, i) in pendingPreviews" :key="i" class="md-editor__thumb-item">
        <img :src="preview" alt="" />
        <button class="md-editor__thumb-remove" @click="removePending(i)" title="Remove">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.md-editor {
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  overflow: hidden;
  background: var(--color-surface);
}

.md-editor__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-alt);
}

.md-editor__tabs {
  display: flex;
}

.md-editor__tab {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}
.md-editor__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.md-editor__body {
  min-height: 300px;
}

.md-editor__textarea {
  width: 100%;
  min-height: 350px;
  padding: var(--spacing-lg);
  border: none;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.8;
  color: var(--color-text);
  background: var(--color-surface);
  resize: vertical;
}
.md-editor__textarea:focus {
  outline: none;
}

.md-editor__preview {
  min-height: 350px;
  padding: var(--spacing-lg) var(--spacing-xl);
}

.md-editor__preview :deep(h1) { font-size: var(--text-2xl); margin: var(--spacing-xl) 0 var(--spacing-md); border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-sm); }
.md-editor__preview :deep(h2) { font-size: var(--text-xl); margin: var(--spacing-lg) 0 var(--spacing-sm); }
.md-editor__preview :deep(h3) { font-size: var(--text-lg); margin: var(--spacing-md) 0 var(--spacing-sm); }
.md-editor__preview :deep(p) { margin-bottom: var(--spacing-md); line-height: var(--leading-relaxed); }
.md-editor__preview :deep(ul), .md-editor__preview :deep(ol) { padding-left: var(--spacing-xl); margin-bottom: var(--spacing-md); }
.md-editor__preview :deep(li) { margin-bottom: var(--spacing-xs); }
.md-editor__preview :deep(img) { max-width: 100%; border-radius: var(--rounded-md); margin: var(--spacing-md) 0; }
.md-editor__preview :deep(pre) { margin: var(--spacing-md) 0; border-radius: var(--rounded-md); }
.md-editor__preview :deep(code) { font-family: var(--font-mono); font-size: 0.9em; }
.md-editor__preview :deep(blockquote) { border-left: 3px solid var(--color-primary); padding-left: var(--spacing-md); margin: var(--spacing-md) 0; color: var(--color-text-secondary); }

.md-editor__upload-btn {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-md);
  margin-right: var(--spacing-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  transition: all var(--transition-fast);
}
.md-editor__upload-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.md-editor__thumbs {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-alt);
}

.md-editor__thumb-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: var(--rounded-md);
  overflow: hidden;
  flex-shrink: 0;
}
.md-editor__thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.md-editor__thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: var(--rounded-full);
  background: rgba(0,0,0,0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}

.hidden-input { display: none; }
</style>

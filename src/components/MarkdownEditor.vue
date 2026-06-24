<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { marked } from 'marked'

const { t } = useI18n()

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const previewMode = ref(false)

const effectivePlaceholder = computed(() => props.placeholder || t('common.mdPlaceholder'))

const html = computed(() => {
  if (!props.modelValue) return ''
  return marked(props.modelValue)
})

function togglePreview() {
  previewMode.value = !previewMode.value
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<template>
  <div class="md-editor">
    <div class="md-editor__toolbar">
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

    <div class="md-editor__body">
      <textarea
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
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-alt);
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
</style>

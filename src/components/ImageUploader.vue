<script setup>
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { fileAPI } from '@/api'

const { t } = useI18n()

const emit = defineEmits(['uploaded'])

const uploading = ref(false)

async function handleUpload(e) {
  const file = e.target.files[0]
  if (!file) return

  uploading.value = true
  try {
    const { data } = await fileAPI.upload(file)
    emit('uploaded', data.data.url)
  } catch (err) {
    alert(t('common.failed') + ': ' + (err.response?.data?.message || err.message))
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}
</script>

<template>
  <label class="uploader" :class="{ 'uploader--loading': uploading }">
    <input
      type="file"
      accept="image/*"
      class="uploader__input"
      @change="handleUpload"
      :disabled="uploading"
    />
    <span class="uploader__icon">+</span>
    <span class="uploader__text">{{ uploading ? t('common.uploading') : t('common.uploadImage') }}</span>
  </label>
</template>

<style scoped>
.uploader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  width: 120px;
  height: 120px;
  border: 2px dashed var(--color-border);
  border-radius: var(--rounded-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-direction: column;
}
.uploader:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.uploader--loading {
  opacity: 0.6;
  pointer-events: none;
}

.uploader__input {
  display: none;
}

.uploader__icon {
  font-size: var(--text-2xl);
  color: var(--color-text-secondary);
}

.uploader__text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
</style>

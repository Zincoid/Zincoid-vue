<script setup>
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps({
  total: { type: Number, default: 0 },
  uploaded: { type: Number, default: 0 },
  currentProgress: { type: Number, default: 0 }
})
</script>

<template>
  <div class="upload-progress">
    <span class="upload-progress__label">{{ t('common.uploading') }}</span>
    <div class="upload-progress__bars">
      <div class="progress-bar progress-bar--light">
        <div class="progress-bar__fill" :style="{ width: currentProgress + '%' }"></div>
      </div>
      <div class="progress-bar progress-bar--dark">
        <div class="progress-bar__fill" :style="{ width: (total ? (uploaded / total) * 100 : 0) + '%' }"></div>
      </div>
    </div>
    <span class="upload-progress__text">{{ uploaded }}/{{ total }} {{ currentProgress }}%</span>
  </div>
</template>

<style scoped>
.upload-progress { display: flex; gap: 6px; align-items: center; }
.upload-progress__label { font-size: var(--text-xs); color: var(--color-text-secondary); white-space: nowrap; }
.upload-progress__bars { display: flex; flex-direction: column; }
.upload-progress__text { font-size: var(--text-xs); color: var(--color-text); white-space: nowrap; width: 64px; text-align: right; }
.progress-bar { width: 64px; height: 3px; background: var(--color-border); overflow: hidden; }
.progress-bar__fill { height: 100%; transition: width 0.1s ease; }
.progress-bar--dark .progress-bar__fill { background: var(--color-primary); }
.progress-bar--light .progress-bar__fill { background: var(--color-primary); opacity: 0.5; }
</style>

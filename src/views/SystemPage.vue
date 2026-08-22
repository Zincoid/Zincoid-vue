<script setup>
import { useI18n } from '@/composables/useI18n'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
</script>

<template>
  <div class="system-info">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('system.pageTitle') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('system.subtitle') }}</p>
    </div>

    <div class="system-info__placeholder">
      <SvgIcon name="server" :size="36" />
      <p>{{ t('system.comingSoon') }}</p>
    </div>
  </div>
</template>

<style scoped>
.system-info .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.system-info .page-header__subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--spacing-xs); }

.system-info__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl) 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  border: 1px dashed var(--color-border);
  border-radius: var(--rounded-lg);
  background: var(--color-surface);
}
</style>

<script setup>
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <div class="system">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('system.pageTitle') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('system.subtitle') }}</p>
    </div>
  </div>
</template>

<style scoped>
.system .page-header {
  padding-top: var(--spacing-xs);
  margin-bottom: var(--spacing-xl);
}

.system .page-header__subtitle {
  font-size: var(--text-sm);
}
</style>

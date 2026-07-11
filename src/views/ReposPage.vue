<script setup>
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <div class="repo container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('repo.pageTitle') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('repo.placeholder') }}</p>
    </div>
  </div>
</template>

<style scoped>
.repo {
  padding-bottom: var(--spacing-4xl);
}
</style>

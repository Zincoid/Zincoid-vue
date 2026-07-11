<script setup>
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
</script>

<template>
  <div class="data-management">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('personal.dataTab') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('personal.dataPlaceholder') }}</p>
    </div>

    <p class="data-management__desc">{{ t('personal.dataDesc') }}</p>

    <router-link
      v-if="auth.user"
      :to="`/members/@${auth.user.username}`"
      class="btn btn--primary"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      {{ t('personal.viewMe') }}
    </router-link>
  </div>
</template>

<style scoped>
.data-management .page-header {
  padding-top: var(--spacing-xs);
  margin-bottom: var(--spacing-xl);
}

.data-management .page-header__subtitle {
  font-size: var(--text-sm);
}

.data-management__desc {
  font-size: var(--text-base);
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
}
</style>

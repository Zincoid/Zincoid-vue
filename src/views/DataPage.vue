<script setup>
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
const auth = useAuthStore()
</script>

<template>
  <div class="data-management">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('data.pageTitle') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('data.subtitle') }}</p>
    </div>

    <p class="data-management__desc">{{ t('data.desc') }}</p>

    <router-link
      v-if="auth.user"
      :to="`/members/@${auth.user.username}`"
      class="btn btn--primary"
    >
      <SvgIcon name="user" :size="16" />
      {{ t('data.viewMe') }}
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

<script setup>
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()

const tabs = computed(() => {
  const items = [
    { to: '/personal/profile', key: 'profileTab', icon: 'profile' },
    { to: '/personal/data', key: 'dataTab', icon: 'data' },
    { to: '/personal/access', key: 'accessTab', icon: 'auth' }
  ]
  if (auth.isAdmin) {
    items.push({ to: '/personal/system', key: 'systemTab', icon: 'admin' })
  }
  return items
})
</script>

<template>
  <div class="personal container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('personal.pageTitle') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('personal.subtitle') }}</p>
    </div>

    <div class="personal-layout">
      <nav class="personal-sidebar">
        <router-link
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="personal-sidebar__item"
          active-class="personal-sidebar__item--active"
        >
          <svg v-if="tab.icon === 'profile'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <svg v-else-if="tab.icon === 'data'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          <svg v-else-if="tab.icon === 'admin'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <svg v-else-if="tab.icon === 'auth'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          <span>{{ t(`personal.${tab.key}`) }}</span>
        </router-link>
      </nav>

      <div class="personal-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
.personal {
  padding-bottom: var(--spacing-4xl);
}

.personal-layout {
  display: flex;
  gap: var(--spacing-2xl);
  align-items: flex-start;
}

/* ── Sidebar ── */
.personal-sidebar {
  flex-shrink: 0;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding-top: var(--spacing-sm);
}

.personal-sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  border-radius: var(--rounded-md);
  transition: all var(--transition-fast);
}

.personal-sidebar__item:hover {
  color: var(--color-text-heading);
  background: var(--color-bg-alt);
}

.personal-sidebar__item--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

/* ── Content ── */
.personal-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 700px) {
  .personal-layout {
    flex-direction: column;
    align-items: stretch;
  }

  .personal-sidebar {
    width: 100%;
    flex-direction: row;
    gap: var(--spacing-xs);
    padding-top: 0;
  }

  .personal-sidebar__item {
    flex: 1;
    justify-content: center;
  }
}
</style>

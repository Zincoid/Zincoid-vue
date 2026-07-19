<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
const auth = useAuthStore()

const tabs = computed(() => {
  const items = [
    { to: '/personal/profile', key: 'profileTab', icon: 'profile' },
    { to: '/personal/data', key: 'dataTab', icon: 'data' },
    { to: '/personal/access', key: 'accessTab', icon: 'auth' },
    { to: '/personal/system', key: 'systemTab', icon: 'admin' }
  ]
  if (auth.isAdmin) {
    items.push({ to: '/personal/manage', key: 'manageTab', icon: 'lock' })
  }
  return items
})

const sidebarRef = ref(null)
const scrollable = ref(false)

function checkScrollable() {
  if (!sidebarRef.value) return
  scrollable.value = sidebarRef.value.scrollWidth > sidebarRef.value.clientWidth
}

onMounted(() => {
  checkScrollable()
  window.addEventListener('resize', checkScrollable)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScrollable)
})
</script>

<template>
  <div class="personal container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('personal.pageTitle') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('personal.subtitle') }}</p>
    </div>

    <div class="personal-layout">
      <nav ref="sidebarRef" class="personal-sidebar" :class="{ 'personal-sidebar--scrollable': scrollable }">
        <router-link
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="personal-sidebar__item"
          active-class="personal-sidebar__item--active"
        >
          <SvgIcon v-if="tab.icon === 'profile'" name="user" :size="16" />
          <SvgIcon v-else-if="tab.icon === 'data'" name="database" :size="16" />
          <SvgIcon v-else-if="tab.icon === 'admin'" name="settings" :size="16" />
          <SvgIcon v-else-if="tab.icon === 'lock'" name="lock" :size="16" />
          <SvgIcon v-else-if="tab.icon === 'auth'" name="key" :size="16" />
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
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .personal-sidebar::-webkit-scrollbar {
    display: none;
  }

  .personal-sidebar--scrollable {
    mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
  }

  .personal-sidebar__item {
    flex: 1 0 auto;
    justify-content: center;
    white-space: nowrap;
  }
}
</style>

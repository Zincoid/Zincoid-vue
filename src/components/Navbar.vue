<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import { useI18n } from '@/composables/useI18n'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const locale = useLocaleStore()
const { t } = useI18n()
const menuOpen = ref(false)

const navLinks = computed(() => {
  const links = [
    { to: '/moments', label: t('nav.moments'), icon: 'moments' },
    { to: '/articles', label: t('nav.articles'), icon: 'articles' },
    { to: '/members', label: t('nav.members'), icon: 'members' }
  ]
  if (auth.isAdmin) {
    links.push({ to: '/manage', label: t('nav.manage'), icon: 'admin' })
  }
  return links
})

function isActive(path) {
  return route.path.startsWith(path)
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar__inner">
      <router-link to="/" class="navbar__brand">
        <span class="navbar__brand-text">Zincoid</span>
        <span class="navbar__brand-text navbar__brand-text--light">'s</span>
      </router-link>

      <button class="navbar__burger" :class="{ 'navbar__burger--open': menuOpen }" @click="toggleMenu" :aria-expanded="menuOpen">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="navbar__menu" :class="{ 'navbar__menu--open': menuOpen }">
        <ul class="navbar__links">
          <li v-for="link in navLinks" :key="link.to">
            <router-link
              :to="link.to"
              class="navbar__item"
              :class="{
                'navbar__item--active': isActive(link.to),
                'navbar__item--moments': link.icon === 'moments',
                'navbar__item--articles': link.icon === 'articles',
                'navbar__item--members': link.icon === 'members',
                'navbar__item--admin': link.icon === 'admin'
              }"
            >
              <svg v-if="link.icon === 'moments'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <svg v-else-if="link.icon === 'articles'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <svg v-else-if="link.icon === 'members'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <svg v-else-if="link.icon === 'admin'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              {{ link.label }}
            </router-link>
          </li>
        </ul>

        <div class="navbar__actions">
          <template v-if="auth.isLoggedIn">
            <router-link to="/profile" class="navbar__item navbar__item--profile" :class="{ 'navbar__item--active': isActive('/profile') }">
              <img
                v-if="auth.user?.avatar"
                :src="auth.user.avatar"
                class="navbar__avatar"
                alt=""
              />
              <span v-else class="navbar__avatar-placeholder">{{ (auth.user?.nickname || 'U')[0] }}</span>
              <span class="navbar__nickname">{{ auth.user?.nickname }}</span>
            </router-link>
            <button class="navbar__item navbar__item--logout" @click="auth.logout(); closeMenu()">
              <svg class="navbar__signin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {{ t('nav.logout') }}
            </button>
          </template>
          <router-link v-else to="/login" class="navbar__item navbar__item--signin" :class="{ 'navbar__item--active': isActive('/login') || isActive('/register') }">
            <svg class="navbar__signin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            {{ t('nav.signIn') }}
          </router-link>
          <button class="navbar__item navbar__lang-btn navbar__lang-btn--desktop" @click="locale.toggleLocale()">
            <svg class="navbar__signin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {{ t('nav.lang') }}
          </button>
        </div>
        <div class="navbar__footer">
          <button class="navbar__item" @click="locale.toggleLocale()">
            <svg class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {{ t('nav.lang') }}
          </button>
          <button v-if="auth.isLoggedIn" class="navbar__item navbar__item--logout-mobile" @click="auth.logout(); closeMenu()">
            <svg class="navbar__signin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--navbar-height);
  border-bottom: 1px solid var(--color-border);
  z-index: 100;
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.6);
}
[data-theme="dark"] .navbar {
  background: rgba(26, 29, 39, 0.6);
}

.navbar__inner {
  display: flex;
  align-items: center;
  height: 100%;
  max-width: 100%;
}

.navbar__brand {
  display: flex;
  align-items: center;
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-heading);
  letter-spacing: -0.3px;
  flex-shrink: 0;
  min-width: 140px;
  padding-left: var(--spacing-xl);
  padding-right: var(--spacing-3xl);
  height: 100%;
  border-bottom: 2px solid rgba(0, 0, 0, 0.25);
}
.navbar__brand-text--light {
  font-weight: var(--weight-light);
  color: var(--color-text-secondary);
}

.navbar__burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: var(--spacing-xs);
  margin-left: auto;
  margin-right: var(--spacing-md);
  z-index: 101;
}
.navbar__burger span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--color-text-heading);
  border-radius: var(--rounded-full);
  transition: transform var(--transition-fast), opacity var(--transition-fast);
  transform-origin: center;
}
.navbar__burger--open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.navbar__burger--open span:nth-child(2) {
  opacity: 0;
}
.navbar__burger--open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.navbar__menu {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
}

.navbar__links {
  display: flex;
  height: 100%;
}

.navbar__actions {
  display: flex;
  height: 100%;
  margin-left: auto;
}

.navbar__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  height: 100%;
  min-width: 110px;
  padding: 0 var(--spacing-xl);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text);
  border-bottom: 2px solid transparent;
  padding-top: 4px;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.navbar__item:hover {
  color: var(--color-text-heading);
  background: var(--color-bg-alt);
}
.navbar__item--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-bottom-color: var(--color-primary);
}
.navbar__item--moments { border-bottom: 2px solid rgba(219, 39, 119, 0.25); }
.navbar__item--articles { border-bottom: 2px solid rgba(22, 163, 74, 0.25); }
.navbar__item--members { border-bottom: 2px solid rgba(37, 99, 235, 0.25); }
.navbar__item--admin { border-bottom: 2px solid rgba(107, 33, 168, 0.25); }
.navbar__item--moments.navbar__item--active {
  color: #db2777;
  background: rgba(219, 39, 119, 0.08);
  border-bottom: 4px solid #db2777;
}
.navbar__item--articles.navbar__item--active {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
  border-bottom: 4px solid #16a34a;
}
.navbar__item--members.navbar__item--active {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border-bottom: 4px solid #2563eb;
}
.navbar__item--admin.navbar__item--active {
  color: #6b21a8;
  background: rgba(107, 33, 168, 0.08);
  border-bottom: 4px solid #6b21a8;
}
.navbar__item--profile.navbar__item--active,
.navbar__item--signin.navbar__item--active {
  color: #111827;
  background: rgba(17, 27, 39, 0.08);
  border-bottom: 4px solid #111827;
}

.navbar__nav-icon {
  flex-shrink: 0;
  margin-right: var(--spacing-xs);
}

.navbar__signin-icon {
  flex-shrink: 0;
  margin-right: var(--spacing-xs);
}


.navbar__nickname {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar__avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--rounded-full);
  object-fit: cover;
}

.navbar__footer {
  display: none;
}

.navbar__avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.navbar__item--logout:hover,
.navbar__item--logout-mobile:hover {
  color: var(--color-danger);
}

@media (max-width: 960px) {
  .navbar__brand { border-bottom: none; }
  .navbar__burger {
    display: flex;
  }

  .navbar__menu {
    position: absolute;
    top: var(--navbar-height);
    right: var(--spacing-lg);
    margin-top: var(--spacing-sm);
    min-width: 220px;
    flex-direction: column;
    align-items: stretch;
    height: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--rounded-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--spacing-sm);
    opacity: 0;
    pointer-events: none;
    transform: translateY(-8px);
    transition: opacity var(--transition-fast), transform var(--transition-fast);
    z-index: 102;
  }

  .navbar__menu--open {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .navbar__links {
    flex-direction: column;
    height: auto;
    width: 100%;
    order: 1;
    align-items: stretch;
    gap: 4px;
  }
  .navbar__links li {
    width: 100%;
  }

  .navbar__actions {
    flex-direction: column;
    height: auto;
    width: 100%;
    order: 0;
    margin-left: 0;
    padding-bottom: var(--spacing-xs);
    margin-bottom: var(--spacing-xs);
    border-bottom: 1px solid var(--color-border);
    align-items: stretch;
  }

  .navbar__item {
    display: flex;
    height: auto;
    width: 100%;
    font-size: var(--text-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: none;
    justify-content: flex-start;
    border-radius: var(--rounded-md);
    min-width: auto;
  }
  .navbar__item--active {
    border-bottom: none;
    width: 100%;
  }
  .navbar__item--moments.navbar__item--active { border-bottom: none; border-left: 4px solid #db2777; }
  .navbar__item--articles.navbar__item--active { border-bottom: none; border-left: 4px solid #16a34a; }
  .navbar__item--members.navbar__item--active { border-bottom: none; border-left: 4px solid #2563eb; }
  .navbar__item--admin.navbar__item--active { border-bottom: none; border-left: 4px solid #6b21a8; }
  .navbar__item--logout {
    display: none;
  }
  .navbar__lang-btn--desktop {
    display: none;
  }
  .navbar__nickname {
    max-width: none;
  }

  .navbar__footer {
    display: flex;
    flex-direction: column;
    width: 100%;
    order: 2;
    border-top: 1px solid var(--color-border);
    margin-top: var(--spacing-xs);
    padding-top: var(--spacing-xs);
    gap: 4px;
  }
  .navbar__footer .navbar__item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-family: inherit;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    line-height: var(--leading-normal);
    color: var(--color-text);
    background: none;
    border: none;
    border-radius: var(--rounded-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .navbar__footer .navbar__item:hover {
    color: var(--color-text-heading);
    background: var(--color-bg-alt);
  }
  .navbar__footer .navbar__item--logout-mobile {
    color: #e5534b;
  }
  .navbar__footer .navbar__item--logout-mobile:hover {
    color: var(--color-danger);
  }
}
</style>

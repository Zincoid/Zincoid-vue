<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import { useI18n } from '@/composables/useI18n'
import { notificationAPI } from '@/api'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const locale = useLocaleStore()
const { t } = useI18n()
const menuOpen = ref(false)
const unreadCount = ref(0)
const notifOpen = ref(false)
const notifications = ref([])
const notifLoading = ref(false)

function fetchUnreadCount() {
  if (!auth.isLoggedIn) return
  notificationAPI.getUnreadCount().then(res => {
    unreadCount.value = res.data?.data ?? 0
  }).catch(() => {})
}

function fetchNotifications() {
  if (!auth.isLoggedIn) return
  notifLoading.value = true
  notificationAPI.getList().then(res => {
    notifications.value = res.data?.data ?? []
  }).catch(() => {}).finally(() => {
    notifLoading.value = false
  })
}

watch(() => auth.isLoggedIn, (val) => {
  if (val) fetchUnreadCount()
}, { immediate: true })

function toggleNotif() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) fetchNotifications()
}

function closeNotif() {
  notifOpen.value = false
}

function goNotification(n) {
  closeNotif()
  const name = n.relatedType === 0 ? 'MomentDetail' : 'ArticleDetail'
  router.push({ name, params: { id: n.relatedId } })
}

function deleteOne(n) {
  notificationAPI.delete(n.id).then(() => {
    notifications.value = notifications.value.filter(x => x.id !== n.id)
    if (!n.isRead) unreadCount.value = Math.max(0, unreadCount.value - 1)
  }).catch(() => {})
}

function markAllRead() {
  notificationAPI.markRead().then(() => {
    unreadCount.value = 0
    notifications.value.forEach(x => x.isRead = true)
  }).catch(() => {})
}

function deleteAll() {
  if (notifications.value.length === 0) return
  notificationAPI.deleteAll().then(() => {
    notifications.value = []
    unreadCount.value = 0
  }).catch(() => {})
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return t('common.justNow') || '刚刚'
  if (diff < 3600000) { const m = Math.floor(diff / 60000); return m + ' ' + (m === 1 ? t('common.minAgo1') || '1 minute ago' : t('common.minAgo') || 'minutes ago') }
  if (diff < 86400000) { const h = Math.floor(diff / 3600000); return h + ' ' + (h === 1 ? t('common.hourAgo1') || '1 hour ago' : t('common.hourAgo') || 'hours ago') }
  if (diff < 604800000) { const d = Math.floor(diff / 86400000); return d + ' ' + (d === 1 ? t('common.dayAgo1') || '1 day ago' : t('common.dayAgo') || 'days ago') }
  return d.toLocaleDateString()
}

const navLinks = computed(() => {
  const links = [
    { to: '/moments', label: t('nav.moments'), icon: 'moments' },
    { to: '/articles', label: t('nav.articles'), icon: 'articles' },
    { to: '/chats', label: t('nav.chats'), icon: 'chats' },
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

      <div class="navbar__mobile-actions">
        <button v-if="auth.isLoggedIn" class="navbar__notif-mobile-bell" @click.stop="toggleNotif">
          <svg v-if="notifOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="unreadCount > 0" class="navbar__notif-mobile-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>

        <button class="navbar__burger" :class="{ 'navbar__burger--open': menuOpen }" @click="toggleMenu" :aria-expanded="menuOpen">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

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
                'navbar__item--chats': link.icon === 'chats',
                'navbar__item--members': link.icon === 'members',
                'navbar__item--admin': link.icon === 'admin'
              }"
            >
              <svg v-if="link.icon === 'moments'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <svg v-else-if="link.icon === 'articles'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <svg v-else-if="link.icon === 'chats'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <svg v-else-if="link.icon === 'members'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <svg v-else-if="link.icon === 'admin'" class="navbar__nav-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              {{ link.label }}
            </router-link>
          </li>
        </ul>

        <div class="navbar__actions">
          <template v-if="auth.isLoggedIn">
            <div class="navbar__notif">
              <button class="navbar__notif-bell" @click.stop="toggleNotif">
                <svg v-if="notifOpen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span v-if="unreadCount > 0" class="navbar__notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
              </button>
            </div>
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
    <div v-if="notifOpen" class="navbar__notif-dropdown">
      <div class="navbar__notif-dropdown-header">
        <span class="navbar__notif-dropdown-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          {{ t('notification.title') }}
        </span>
        <div class="navbar__notif-header-actions">
          <button v-if="notifications.length > 0" class="navbar__notif-deleteall" @click="deleteAll">
            {{ t('notification.deleteAll') }}
          </button>
          <button v-if="unreadCount > 0" class="navbar__notif-markread" @click="markAllRead">
            {{ t('notification.markRead') }}
          </button>
        </div>
      </div>
      <div class="navbar__notif-dropdown-body">
        <p v-if="notifLoading" class="navbar__notif-empty">{{ t('common.loading') }}</p>
        <p v-else-if="notifications.length === 0" class="navbar__notif-empty">{{ t('notification.empty') }}</p>
        <div v-else class="navbar__notif-list">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="navbar__notif-item"
            :class="{ 'navbar__notif-item--unread': !n.isRead }"
            @click="goNotification(n)"
          >
            <img v-if="n.senderAvatar" :src="n.senderAvatar" class="navbar__notif-sender-avatar" />
            <span v-else class="navbar__notif-sender-placeholder">{{ (n.senderNickname || '?')[0] }}</span>
            <div class="navbar__notif-item-body">
              <div class="navbar__notif-item-text">
                <strong>{{ n.senderNickname }}</strong>
                {{ n.isReply
                  ? (n.relatedType === 0 ? t('notification.repliedMoment') : t('notification.repliedArticle'))
                  : (n.relatedType === 0 ? t('notification.commentedMoment') : t('notification.commentedArticle')) }}
              </div>
              <div class="navbar__notif-item-snippet" v-if="n.commentSnippet">{{ n.commentSnippet }}</div>
              <div class="navbar__notif-item-time">{{ formatTime(n.createdAt) }}</div>
            </div>
            <button class="navbar__notif-item-delete" @click.stop="deleteOne(n)" :title="t('common.delete')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="notifOpen" class="navbar__notif-backdrop" @click="closeNotif"></div>
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

.navbar__mobile-actions {
  display: none;
  margin-left: auto;
  align-items: center;
  gap: var(--spacing-xs);
}

.navbar__notif-mobile-bell {
  position: relative;
  padding: var(--spacing-xs);
  margin-right: var(--spacing-lg);
  margin-top: 5px;
  color: var(--color-text);
  z-index: 101;
}

.navbar__notif-mobile-badge {
  position: absolute;
  top: -1px;
  right: -2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: var(--color-danger);
  color: #fff;
  font-size: 9px;
  font-weight: var(--weight-bold);
  border-radius: var(--rounded-full);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding-top: 1px;
}

.navbar__burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: var(--spacing-xs);
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
  background: rgba(128, 128, 128, 0.15);
}
.navbar__item--active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-bottom-color: var(--color-primary);
}
.navbar__item--moments { border-bottom: 2px solid rgba(219, 39, 119, 0.25); }
.navbar__item--articles { border-bottom: 2px solid rgba(22, 163, 74, 0.25); }
.navbar__item--chats { border-bottom: 2px solid rgba(245, 158, 11, 0.25); }
.navbar__item--members { border-bottom: 2px solid rgba(37, 99, 235, 0.25); }
.navbar__item--admin { border-bottom: 2px solid rgba(107, 33, 168, 0.25); }
.navbar__item--moments.navbar__item--active {
  color: #db2777;
  background: rgba(219, 39, 119, 0.12);
  border-bottom: 4px solid #db2777;
}
.navbar__item--articles.navbar__item--active {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.12);
  border-bottom: 4px solid #16a34a;
}
.navbar__item--chats.navbar__item--active {
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  border-bottom: 4px solid #f59e0b;
}
.navbar__item--members.navbar__item--active {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.12);
  border-bottom: 4px solid #2563eb;
}
.navbar__item--admin.navbar__item--active {
  color: #6b21a8;
  background: rgba(107, 33, 168, 0.12);
  border-bottom: 4px solid #6b21a8;
}
.navbar__item--profile.navbar__item--active,
.navbar__item--signin.navbar__item--active {
  color: #111827;
  background: rgba(17, 27, 39, 0.12);
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

/* notification */
.navbar__notif {
  position: relative;
  display: flex;
  align-items: center;
  margin-right: var(--spacing-md);
}

.navbar__notif-bell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 var(--spacing-md) 0 var(--spacing-lg);
  color: var(--color-text);
  transition: color var(--transition-fast);
}
.navbar__notif-bell:hover {
  color: #f9a8d4;
}

.navbar__notif-badge {
  position: absolute;
  top: 16px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: var(--color-danger);
  color: #fff;
  font-size: 9px;
  font-weight: var(--weight-bold);
  border-radius: var(--rounded-full);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.navbar__notif-dropdown {
  position: fixed;
  top: calc(var(--navbar-height) + 8px);
  right: var(--spacing-lg);
  width: 400px;
  max-width: calc(100vw - 2 * var(--spacing-lg));
  max-height: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  z-index: 103;
}

.navbar__notif-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  margin: 0 var(--spacing-sm);
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
}

.navbar__notif-dropdown-title {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.navbar__notif-header-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.navbar__notif-deleteall {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  border-radius: var(--rounded-md);
  transition: all var(--transition-fast);
}
.navbar__notif-deleteall:hover {
  color: var(--color-danger);
  background: rgba(239, 68, 68, 0.06);
}

.navbar__notif-markread {
  font-size: var(--text-xs);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--rounded-md);
  transition: background var(--transition-fast);
}
.navbar__notif-markread:hover {
  background: var(--color-primary-light);
}

.navbar__notif-dropdown-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.navbar__notif-empty {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  padding: var(--spacing-xl) 0;
}

.navbar__notif-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.navbar__notif-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--rounded-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.navbar__notif-item:hover {
  background: var(--color-bg-alt);
}
.navbar__notif-item--unread {
  position: relative;
}
.navbar__notif-item--unread::before {
  content: '';
  position: absolute;
  top: 9px;
  left: 6px;
  width: 8px;
  height: 8px;
  border-radius: var(--rounded-full);
  background: var(--color-danger);
}

.navbar__notif-sender-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  flex-shrink: 0;
}

.navbar__notif-sender-placeholder {
  width: 32px;
  height: 32px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  flex-shrink: 0;
}

.navbar__notif-item-body {
  flex: 1;
  min-width: 0;
}

.navbar__notif-item-text {
  font-size: var(--text-sm);
  line-height: 1.4;
  word-break: break-word;
}

.navbar__notif-item-snippet {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: 2px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar__notif-item-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.navbar__notif-item-delete {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  border-radius: var(--rounded-full);
  opacity: 0;
  transition: opacity var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}
.navbar__notif-item:hover .navbar__notif-item-delete {
  opacity: 1;
}
.navbar__notif-item-delete:hover {
  color: var(--color-danger);
  background: rgba(229, 83, 75, 0.1);
}

.navbar__notif-backdrop {
  position: fixed;
  inset: 0;
  z-index: 102;
}

@media (max-width: 960px) {
  .navbar__brand { border-bottom: none; }
  .navbar__mobile-actions {
    display: flex;
  }
  .navbar__notif {
    display: none;
  }
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
  .navbar__item--chats.navbar__item--active { border-bottom: none; border-left: 4px solid #f59e0b; }
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

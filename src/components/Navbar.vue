<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'
import { useI18n } from '@/composables/useI18n'
import { useConfig } from '@/composables/useConfig'
import { notificationAPI } from '@/api'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const locale = useLocaleStore()
const { t } = useI18n()
const { load: loadConfig, get: getConfig } = useConfig()
loadConfig()
const menuOpen = ref(false)
const unreadCount = ref(0)
const notifOpen = ref(false)
const notifications = ref([])
const notifLoading = ref(false)
const notifLoadingDone = ref(false)
const broadcastMessage = ref(null)
const broadcastSender = ref(null)
const notifPage = ref(1)
const notifPages = ref(1)
const notifTotal = ref(0)
const notifLoadingMore = ref(false)

function fetchUnreadCount() {
  if (!auth.isLoggedIn) return
  notificationAPI.getUnreadCount().then(res => {
    unreadCount.value = res.data?.data ?? 0
  }).catch(() => {})
}

function fetchNotifications() {
  if (!auth.isLoggedIn) return
  notifLoading.value = true
  notifLoadingDone.value = false
  notifPage.value = 1
  const size = parseInt(getConfig('page_size', '5'))
  notificationAPI.getList(1, size).then(res => {
    const data = res.data?.data
    notifications.value = data?.records ?? []
    notifPages.value = data?.pages ?? 1
    notifTotal.value = data?.total ?? 0
  }).catch(() => {}).finally(() => {
    notifLoading.value = false
  })
}

function loadMore() {
  if (notifLoadingMore.value || notifPage.value >= notifPages.value) return
  notifLoadingMore.value = true
  const nextPage = notifPage.value + 1
  const size = parseInt(getConfig('page_size', '5'))
  notificationAPI.getList(nextPage, size).then(res => {
    const data = res.data?.data
    notifications.value.push(...(data?.records ?? []))
    notifPage.value = nextPage
    notifPages.value = data?.pages ?? 1
    notifTotal.value = data?.total ?? 0
  }).catch(() => {}).finally(() => {
    notifLoadingMore.value = false
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
  if (!n.isRead) {
    notificationAPI.markOne(n.id).then(() => {
      n.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }).catch(() => {})
  }
  if (n.relatedType === 5) { broadcastMessage.value = n.snippet; broadcastSender.value = n.senderNickname; return }
  if (n.relatedType === 7) { router.push(`/members/${n.relatedId}`); return }
  if (n.relatedType === 8) { router.push('/personal/access'); return }
  if (n.relatedType === 9 || n.relatedType === 10) { router.push(`/repos/${n.relatedId}`); return }
  if (n.targetType === 3) {
    router.push('/chats')
    return
  }
  const name = n.targetType === 4 ? 'RepoDetail' : n.targetType === 0 ? 'MomentDetail' : 'ArticleDetail'
  if (n.targetId == null) return
  router.push({ name, params: { id: n.targetId } })
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
    fetchNotifications()
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
    { to: '/repos', label: t('nav.repos'), icon: 'repos' },
    { to: '/chats', label: t('nav.chats'), icon: 'chats' },
    { to: '/members', label: t('nav.members'), icon: 'members' }
  ]
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
          <SvgIcon v-if="notifOpen" name="chevron-up" :size="20" />
          <SvgIcon v-else name="bell" :size="20" />
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
                'navbar__item--repos': link.icon === 'repos'
              }"
            >
              <SvgIcon v-if="link.icon === 'moments'" name="image" class="navbar__nav-icon" />
              <SvgIcon v-else-if="link.icon === 'articles'" name="article" class="navbar__nav-icon" />
              <SvgIcon v-else-if="link.icon === 'chats'" name="chat" class="navbar__nav-icon" />
              <SvgIcon v-else-if="link.icon === 'members'" name="members" class="navbar__nav-icon" />
              <SvgIcon v-else-if="link.icon === 'repos'" name="fork" class="navbar__nav-icon" />
              <span class="navbar__label">{{ link.label }}</span>
            </router-link>
          </li>
        </ul>

        <div class="navbar__actions">
          <template v-if="auth.isLoggedIn">
            <div class="navbar__notif">
              <button class="navbar__notif-bell" @click.stop="toggleNotif">
                <SvgIcon v-if="notifOpen" name="chevron-up" :size="16" />
                <SvgIcon v-else name="bell" :size="16" />
                <span v-if="unreadCount > 0" class="navbar__notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
              </button>
            </div>
            <router-link to="/personal/profile" class="navbar__item navbar__item--profile" :class="{ 'navbar__item--active': isActive('/personal') }">
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
              <SvgIcon name="logout" class="navbar__signin-icon" />
              {{ t('nav.logout') }}
            </button>
          </template>
          <router-link v-else to="/login" class="navbar__item navbar__item--signin" :class="{ 'navbar__item--active': isActive('/login') || isActive('/register') }">
            <SvgIcon name="login" class="navbar__signin-icon" />
            {{ t('nav.signIn') }}
          </router-link>
          <button class="navbar__item navbar__lang-btn navbar__lang-btn--desktop" @click="locale.toggleLocale()">
            <SvgIcon name="lang" class="navbar__signin-icon" />
            {{ t('nav.lang') }}
          </button>
        </div>
        <div class="navbar__footer">
          <button class="navbar__item" @click="locale.toggleLocale()">
            <SvgIcon name="lang" class="navbar__nav-icon" />
            {{ t('nav.lang') }}
          </button>
          <button v-if="auth.isLoggedIn" class="navbar__item navbar__item--logout-mobile" @click="auth.logout(); closeMenu()">
            <SvgIcon name="logout" class="navbar__signin-icon" />
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </div>
    <Transition name="notif-drop">
      <div v-if="notifOpen" class="navbar__notif-dropdown">
      <div class="navbar__notif-dropdown-header">
        <span class="navbar__notif-dropdown-title">
          <SvgIcon name="bell" />
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
        <LoadingSpinner :visible="notifLoading" @done="notifLoadingDone = true" />
        <template v-if="notifLoadingDone">
          <p v-if="notifications.length === 0" class="navbar__notif-empty">{{ t('notification.empty') }}</p>
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
                {{ n.relatedType === 5
                  ? t('notification.system')
                  : n.relatedType === 7
                    ? t('notification.registered')
                    : n.relatedType === 8
                      ? t('notification.accessRequest')
                      : n.relatedType === 9
                        ? t('notification.accessGranted')
                        : n.relatedType === 10
                          ? t('notification.accessRejected')
                          : n.relatedType === 6
                            ? (n.targetType === 0 ? t('notification.likedMoment') : n.targetType === 4 ? t('notification.likedRepo') : t('notification.likedArticle'))
                    : n.relatedType === 2
                      ? t('notification.mentionedMoment')
                      : n.relatedType === 3
                        ? (n.targetType === 0 ? t('notification.mentionedCommentMoment') : n.targetType === 4 ? t('notification.mentionedCommentRepo') : t('notification.mentionedCommentArticle'))
                        : n.relatedType === 4
                          ? t('notification.mentionedChat')
                          : n.relatedType === 1
                            ? (n.targetType === 0 ? t('notification.repliedMoment') : n.targetType === 4 ? t('notification.repliedRepo') : t('notification.repliedArticle'))
                            : (n.targetType === 0 ? t('notification.commentedMoment') : n.targetType === 4 ? t('notification.commentedRepo') : t('notification.commentedArticle')) }}
              </div>
              <div class="navbar__notif-item-snippet" v-if="n.snippet">{{ n.snippet }}</div>
              <div class="navbar__notif-item-time">{{ formatTime(n.createdAt) }}</div>
            </div>
            <button class="navbar__notif-item-delete" @click.stop="deleteOne(n)" :title="t('common.delete')">
              <SvgIcon name="trash" :size="12" />
            </button>
          </div>
        </div>
          <button
            v-if="notifPage < notifPages"
            class="navbar__notif-loadmore"
            :disabled="notifLoadingMore"
            @click="loadMore"
          >{{ notifLoadingMore ? t('common.loading') : t('common.loadMore') }}</button>
        </template>
      </div>
    </div>
    </Transition>
    <Transition name="notif-fade">
      <div v-if="notifOpen" class="navbar__notif-backdrop" @click="closeNotif"></div>
    </Transition>
  </nav>
  <Teleport to="body">
    <Transition name="broadcast">
      <div v-if="broadcastMessage" class="broadcast-overlay" @click.self="broadcastMessage = null">
        <div class="broadcast-modal">
          <div class="broadcast-modal__bar"></div>
          <button class="broadcast-modal__close" @click="broadcastMessage = null">
            <SvgIcon name="close" :size="16" />
          </button>
          <div class="broadcast-modal__icon">
            <SvgIcon name="bell" :size="28" />
          </div>
          <h3 class="broadcast-modal__title">{{ t('notification.system') }}</h3>
          <p class="broadcast-modal__sender" v-if="broadcastSender">{{ broadcastSender }}</p>
          <p class="broadcast-modal__body">{{ broadcastMessage }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
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
.navbar__item--repos { border-bottom: 2px solid rgba(107, 33, 168, 0.25); }
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
.navbar__item--repos.navbar__item--active {
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
  padding: var(--spacing-md) var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  border-right: 4px solid transparent;
}
.navbar__notif-dropdown-body::-webkit-scrollbar { width: 4px; }
.navbar__notif-dropdown-body::-webkit-scrollbar-track {
  margin: 6px 0;
}
.navbar__notif-dropdown-body::-webkit-scrollbar-thumb {
  background: var(--color-border);
}

.navbar__notif-empty {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  padding: var(--spacing-xl) 0;
}

.navbar__notif-loadmore {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  margin-top: var(--spacing-sm);
  font-size: var(--text-xs);
  font-family: inherit;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.navbar__notif-loadmore:hover {
  background: var(--color-primary-light);
}
.navbar__notif-loadmore:disabled {
  opacity: 0.5;
  cursor: default;
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

.notif-drop-enter-active,
.notif-drop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.notif-drop-enter-from,
.notif-drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.notif-fade-enter-active,
.notif-fade-leave-active {
  transition: opacity 0.2s ease;
}
.notif-fade-enter-from,
.notif-fade-leave-to {
  opacity: 0;
}

.navbar__links .navbar__label {
  overflow: hidden;
  max-width: 200px;
  opacity: 1;
  transition: max-width 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
}
.navbar__links .navbar__nav-icon {
  transition: margin-right 0.2s ease;
}
@media (max-width: 1275px) {
  .navbar__links .navbar__item {
    min-width: auto;
    padding: 0 var(--spacing-lg);
    gap: 0;
  }
  .navbar__links .navbar__nav-icon {
    margin-right: 0;
  }
  .navbar__links .navbar__label {
    max-width: 0;
    opacity: 0;
  }
}

@media (max-width: 857px) {
  .navbar__links .navbar__item {
    min-width: auto;
    padding: var(--spacing-sm) var(--spacing-md);
    gap: var(--spacing-sm);
  }
  .navbar__links .navbar__nav-icon {
    margin-right: var(--spacing-xs);
  }
  .navbar__links .navbar__label {
    display: inline;
    max-width: 200px;
    opacity: 1;
  }
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
  .navbar__item--repos.navbar__item--active { border-bottom: none; border-left: 4px solid #6b21a8; }
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

.broadcast-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}
.broadcast-modal {
  background: var(--color-surface);
  border-radius: var(--rounded-xl);
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  max-width: 420px;
  width: 100%;
  position: relative;
  overflow: hidden;
  padding: var(--spacing-2xl) var(--spacing-xl) var(--spacing-xl);
}
.broadcast-modal__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #f9a8d4, #db2777);
}
.broadcast-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  border-radius: var(--rounded-full);
  transition: all var(--transition-fast);
}
.broadcast-modal__close:hover {
  color: var(--color-text);
  background: var(--color-bg-alt);
}
.broadcast-modal__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--rounded-full);
  background: rgba(219, 39, 119, 0.12);
  color: #db2777;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
}
.broadcast-modal__title {
  text-align: center;
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--color-text-heading);
  margin-bottom: var(--spacing-xs);
}
.broadcast-modal__sender {
  text-align: center;
  font-size: var(--text-sm);
  color: #db2777;
  font-weight: var(--weight-medium);
  margin-bottom: var(--spacing-lg);
}
.broadcast-modal__body {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  background: var(--color-bg-alt);
  border-radius: var(--rounded-md);
  padding: var(--spacing-md) var(--spacing-lg);
}
.broadcast-enter-active,
.broadcast-leave-active {
  transition: opacity .2s ease;
}
.broadcast-enter-active .broadcast-modal,
.broadcast-leave-active .broadcast-modal {
  transition: transform .2s ease;
}
.broadcast-enter-from,
.broadcast-leave-to {
  opacity: 0;
}
.broadcast-enter-from .broadcast-modal,
.broadcast-leave-to .broadcast-modal {
  transform: scale(0.95);
}
</style>

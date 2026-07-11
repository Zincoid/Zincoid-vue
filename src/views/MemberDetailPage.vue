<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userAPI, momentAPI, articleAPI, repoAPI } from '@/api'
import { useI18n } from '@/composables/useI18n'
import { useConfig } from '@/composables/useConfig'
import MomentCard from '@/components/MomentCard.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import { formatDate } from '@/utils/format'
import ContactButtons from '@/components/ContactButtons.vue'
import Pagination from '@/components/Pagination.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { t } = useI18n()
const { load: loadConfig, get: getConfig } = useConfig()

const skillColors = [
  { bg: '#dbeafe', fg: '#2563eb' },
  { bg: '#dcfce7', fg: '#16a34a' },
  { bg: '#fce7f3', fg: '#db2777' },
  { bg: '#fef3c7', fg: '#d97706' },
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#cffafe', fg: '#0891b2' },
  { bg: '#fee2e2', fg: '#dc2626' },
  { bg: '#e0e7ff', fg: '#4f46e5' },
]

const route = useRoute()
const router = useRouter()
const user = ref(null)
const userId = ref(null)
const moments = ref([])
const articles = ref([])
const repos = ref([])
const repoType = ref(null)
const tab = ref('moments')
const loading = ref(true)
const loadingDone = ref(false)
const notFound = ref(false)
const banned = ref(false)
const pinnedMoments = ref(false)
const pinnedArticles = ref(false)
const tabLoading = ref(false)

const mPage = ref(1); const mPages = ref(1); const mTotal = ref(0)
const aPage = ref(1); const aPages = ref(1); const aTotal = ref(0)
const rPage = ref(1); const rPages = ref(1); const rTotal = ref(0)
const pageSize = ref(10)

onMounted(async () => {
  try {
    await loadConfig()
    pageSize.value = parseInt(getConfig('page_size', '10'))
    const username = route.params.username
    const userPromise = username
      ? userAPI.getByUsername(username)
      : userAPI.getDetail(route.params.id)
    const uRes = await userPromise
    user.value = uRes.data.data
    userId.value = uRes.data.data.id
    await Promise.all([fetchMoments(), fetchArticles(), fetchRepos()])
  } catch (e) {
    const code = e.response?.data?.code
    notFound.value = code === 404
    banned.value = code === 403
  } finally {
    loading.value = false
  }
})

async function fetchMoments() {
  tabLoading.value = true
  const { data } = await momentAPI.getByUser(userId.value, mPage.value, pageSize.value, pinnedMoments.value)
  moments.value = data.data.records || []
  mPages.value = data.data.pages || 1
  mTotal.value = data.data.total || 0
  tabLoading.value = false
}

async function fetchArticles() {
  tabLoading.value = true
  const { data } = await articleAPI.getByUser(userId.value, aPage.value, pageSize.value, pinnedArticles.value)
  articles.value = data.data.records || []
  aPages.value = data.data.pages || 1
  aTotal.value = data.data.total || 0
  tabLoading.value = false
}

async function fetchRepos() {
  tabLoading.value = true
  const { data } = await repoAPI.getByUser(userId.value, rPage.value, pageSize.value, repoType.value)
  repos.value = data.data.records || []
  rPages.value = data.data.pages || 1
  rTotal.value = data.data.total || 0
  tabLoading.value = false
}

function switchRepoType(type) {
  repoType.value = type
  rPage.value = 1
  fetchRepos()
}

function onMPage(p) { mPage.value = p; fetchMoments() }
function onAPage(p) { aPage.value = p; fetchArticles() }
function onRPage(p) { rPage.value = p; fetchRepos() }

function togglePinned() {
  if (tab.value === 'moments') {
    pinnedMoments.value = !pinnedMoments.value
    mPage.value = 1
    fetchMoments()
  } else if (tab.value === 'articles') {
    pinnedArticles.value = !pinnedArticles.value
    aPage.value = 1
    fetchArticles()
  }
}

const typeColors = { null: '#6b7280', 0: '#16a34a', 1: '#db2777', 2: '#2563eb' }
function typeLabel(type) {
  const map = { 0: t('repo.code'), 1: t('repo.media'), 2: t('repo.file') }
  return map[type] || ''
}
</script>

<template>
  <LoadingSpinner :visible="loading" @done="loadingDone = true" />
  <p v-if="loadingDone && notFound" class="empty-state container" style="padding-top:var(--spacing-5xl)">{{ t('user.notFound') }}</p>
  <p v-else-if="loadingDone && banned" class="empty-state container" style="padding-top:var(--spacing-5xl)">{{ t('user.bannedMessage') }}</p>
  <div class="user-detail container" v-else-if="loadingDone && user">
    <!-- Profile header -->
    <div class="profile-header">
      <img v-if="user.avatar" :src="user.avatar" class="profile-avatar" />
      <span v-else class="profile-avatar-placeholder">{{ (user.nickname || 'U')[0] }}</span>

      <div class="profile-info">
        <div class="profile-name-row">
          <h1 class="profile-name">{{ user.nickname }}</h1>
          <span class="profile-username">@{{ user.username }}</span>
          <span v-if="user.gender !== null && user.gender !== undefined" class="profile-pronouns">{{ user.gender === 0 ? t('user.heHim') : t('user.sheHer') }}</span>
        </div>
        <p v-if="user.title" class="profile-title">{{ user.title }}</p>
        <p v-if="user.activeAt" class="profile-last-active">{{ t('user.lastActive') }}: {{ formatDate(user.activeAt) }}</p>
        <p v-if="user.bio" class="profile-bio">{{ user.bio }}</p>

        <div v-if="user.skills?.length" class="profile-skills">
          <span v-for="(skill, i) in user.skills" :key="skill" class="skill-tag" :style="{ background: skillColors[i % skillColors.length].bg, color: skillColors[i % skillColors.length].fg }">{{ skill }}</span>
        </div>
      </div>

      <ContactButtons :contacts="user.contacts" iconOnly />
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div class="tabs__left">
        <button class="tab" :class="{ 'tab--active': tab === 'moments' }" @click="tab = 'moments'">
          {{ t('user.moments') }}
        </button>
        <button class="tab" :class="{ 'tab--active': tab === 'articles' }" @click="tab = 'articles'">
          {{ t('user.articles') }}
        </button>
        <button class="tab" :class="{ 'tab--active': tab === 'repos' }" @click="tab = 'repos'">
          {{ t('repo.pageTitle') }}
        </button>
      </div>
      <div v-if="tab === 'repos'" class="tabs__right">
        <button class="tab-filter" :class="{ 'tab-filter--active': repoType === null }" :style="repoType === null ? { color: typeColors[null], borderColor: typeColors[null], background: typeColors[null] + '18' } : {}" @click="switchRepoType(null)">{{ t('repo.all') }}</button>
        <button class="tab-filter" :class="{ 'tab-filter--active': repoType === 0 }" :style="repoType === 0 ? { color: typeColors[0], borderColor: typeColors[0], background: typeColors[0] + '18' } : {}" @click="switchRepoType(0)">{{ t('repo.code') }}</button>
        <button class="tab-filter" :class="{ 'tab-filter--active': repoType === 1 }" :style="repoType === 1 ? { color: typeColors[1], borderColor: typeColors[1], background: typeColors[1] + '18' } : {}" @click="switchRepoType(1)">{{ t('repo.media') }}</button>
        <button class="tab-filter" :class="{ 'tab-filter--active': repoType === 2 }" :style="repoType === 2 ? { color: typeColors[2], borderColor: typeColors[2], background: typeColors[2] + '18' } : {}" @click="switchRepoType(2)">{{ t('repo.file') }}</button>
      </div>
    </div>

    <div class="tab-content" v-show="tab === 'moments'">
      <LoadingSpinner :visible="tabLoading" />
      <MomentCard v-for="m in moments" :key="m.id" :moment="m" />
      <p v-if="!tabLoading && !moments.length" class="empty-state">{{ t('user.momentsEmpty') }}</p>
      <Pagination :page="mPage" :pages="mPages" :total="mTotal" :size="pageSize" @change="onMPage" />
    </div>
    <div class="tab-content" v-show="tab === 'articles'">
      <LoadingSpinner :visible="tabLoading" />
      <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
      <p v-if="!tabLoading && !articles.length" class="empty-state">{{ t('user.articlesEmpty') }}</p>
      <Pagination :page="aPage" :pages="aPages" :total="aTotal" :size="pageSize" @change="onAPage" />
    </div>
    <div class="tab-content" v-show="tab === 'repos'">
      <LoadingSpinner :visible="tabLoading" />
      <div class="repo-grid">
        <div v-for="repo in repos" :key="repo.id" class="repo-card" @click="router.push(`/repos/${repo.id}`)">
          <div class="repo-card__cover">
            <img v-if="repo.coverImage" :src="repo.coverImage" alt="" />
            <div v-else class="repo-card__cover-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div class="repo-card__badges">
              <span v-if="repo.visibility === 1" class="repo-card__visibility">{{ t('visibility.private') }}</span>
              <span class="repo-card__type-badge" :style="{ color: typeColors[repo.type] }">{{ typeLabel(repo.type) }}</span>
            </div>
          </div>
          <div class="repo-card__body">
            <div class="repo-card__user">
              <div class="repo-card__user-left">
                <img v-if="repo.userAvatar" :src="repo.userAvatar" class="repo-card__avatar" />
                <span v-else class="repo-card__avatar-placeholder">{{ (repo.userNickname || 'U')[0] }}</span>
                <span class="repo-card__nickname">{{ repo.userNickname }}</span>
              </div>
              <span class="repo-card__date">{{ formatDate(repo.createdAt) }}</span>
            </div>
            <h3 class="repo-card__name">{{ repo.name }}</h3>
            <p v-if="repo.description" class="repo-card__desc">{{ repo.description }}</p>
            <div v-if="repo.tags?.length" class="repo-card__tags">
              <span v-for="tag in repo.tags" :key="tag" class="repo-card__tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
      <p v-if="!tabLoading && !repos.length" class="empty-state">{{ t('repo.empty') }}</p>
      <Pagination :page="rPage" :pages="rPages" :total="rTotal" :size="pageSize" @change="onRPage" />
    </div>
  </div>

  <button
    v-if="tab !== 'repos'"
    class="pin-fab"
    :class="{ 'pin-fab--active': (tab === 'moments' && pinnedMoments) || (tab === 'articles' && pinnedArticles) }"
    @click="togglePinned">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 17v5"/>
      <path v-if="pinnedFirst" d="M15 9.34V7h1a2 2 0 0 0 0-4H7.89"/><path v-if="pinnedFirst" d="m2 2 20 20"/><path v-if="pinnedFirst" d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h7.32"/>
      <path v-else d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z"/>
    </svg>
  </button>
  <button class="back-fab" :title="t('common.goBack')" @click="$router.back()">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
  </button>
</template>

<style scoped>
.user-detail { padding-top: var(--spacing-2xl); padding-bottom: var(--spacing-4xl); }

.profile-header {
  display: flex;
  gap: var(--spacing-3xl);
  align-items: flex-start;
  padding: var(--spacing-3xl) 0 var(--spacing-2xl);
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  border: 4px solid var(--color-border);
  flex-shrink: 0;
}

.profile-avatar-placeholder {
  width: 120px;
  height: 120px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-4xl);
  flex-shrink: 0;
}

.profile-info { flex: 1; min-width: 0; }

.profile-name-row {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-lg);
}

.profile-name { font-size: var(--text-2xl); margin: 0; }

.profile-username {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-normal);
}

.profile-pronouns {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--weight-normal);
}

.profile-title {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-md);
}

.profile-last-active {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
.profile-bio {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-lg);
  white-space: pre-wrap;
}

.profile-skills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.skill-tag {
  font-size: var(--text-xs);
  padding: 2px 10px;
  border-radius: var(--rounded-full);
  font-weight: var(--weight-medium);
}

.tabs {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: var(--spacing-xl);
}

.tabs__left { display: flex; }
.tabs__right { display: flex; gap: var(--spacing-xs); padding-bottom: var(--spacing-sm); }

.tab {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab:hover { color: var(--color-text); }

.tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-filter { padding: 2px var(--spacing-md); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--rounded-full); cursor: pointer; transition: all var(--transition-fast); }
.tab-filter:hover { color: var(--color-text-heading); border-color: var(--color-text-secondary); }
.tab-filter--active { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-light); }

.tab-content { display: flex; flex-direction: column; gap: var(--spacing-lg); }

.repo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--spacing-md); }
.repo-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); overflow: hidden; cursor: pointer; transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast); }
.repo-card:hover { border-color: #f9a8d4; transform: scale(1.02); box-shadow: 0 0 0 0.5px #f9a8d4; }
.repo-card__cover { position: relative; height: 120px; background: var(--color-bg-alt); display: flex; align-items: center; justify-content: center; color: var(--color-text-tertiary); }
.repo-card__cover img { width: 100%; height: 100%; object-fit: cover; }
.repo-card__cover-placeholder { display: flex; align-items: center; justify-content: center; }
.repo-card__badges { position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); display: flex; gap: 4px; }
.repo-card__type-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); background: rgba(255, 255, 255, 0.9); border-radius: var(--rounded-full); }
.repo-card__visibility { font-size: var(--text-xs); color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.9); padding: 2px var(--spacing-sm); border-radius: var(--rounded-full); }
.repo-card__body { padding: var(--spacing-lg); }
.repo-card__user { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
.repo-card__user-left { display: flex; align-items: center; gap: var(--spacing-xs); }
.repo-card__avatar { width: 20px; height: 20px; border-radius: var(--rounded-full); object-fit: cover; }
.repo-card__avatar-placeholder { width: 20px; height: 20px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; }
.repo-card__nickname { font-size: var(--text-xs); color: var(--color-text-secondary); }
.repo-card__date { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }
.repo-card__name { font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--spacing-sm); }
.repo-card__desc { font-size: var(--text-sm); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: var(--spacing-sm); }
.repo-card__tags { display: flex; flex-wrap: wrap; gap: 4px; }
.repo-card__tag { padding: 1px var(--spacing-sm); font-size: var(--text-xs); color: var(--color-text-secondary); background: var(--color-bg-alt); border-radius: var(--rounded-full); }

@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--spacing-lg);
  }
  .profile-name-row { justify-content: center; }
  .profile-info { display: flex; flex-direction: column; align-items: center; }
  .profile-skills { justify-content: center; }
}
</style>

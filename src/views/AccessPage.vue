<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { repoAPI, userAPI } from '@/api'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const { t } = useI18n()

const activeTab = ref('received')
const loading = ref(true)
const loadingDone = ref(false)

const sentPending = ref([])
const sentResolved = ref([])
const receivedPending = ref([])
const receivedResolved = ref([])
const repoMap = ref({})
const userMap = ref({})

onMounted(fetchAll)

async function fetchAll() {
  loading.value = true; loadingDone.value = false
  try {
    const [sp, sr, rp, rr] = await Promise.all([
      api('/access/sent/pending'), api('/access/sent/resolved'),
      api('/access/received/pending'), api('/access/received/resolved')
    ])
    sentPending.value = sp; sentResolved.value = sr
    receivedPending.value = rp; receivedResolved.value = rr
    const allRepoIds = [...new Set([...sp, ...sr, ...rp, ...rr].map(a => a.repoId))]
    const allUserIds = [...new Set([...rp, ...rr].map(a => a.userId))]
    const rMap = {}
    for (const id of allRepoIds) {
      try { const { data } = await repoAPI.getDetail(id); rMap[id] = data.data?.name || `#${id}` } catch { rMap[id] = `#${id}` }
    }
    repoMap.value = rMap
    const uMap = {}
    for (const id of allUserIds) {
      try { const { data } = await userAPI.getDetail(id); uMap[id] = data.data } catch { uMap[id] = null }
    }
    userMap.value = uMap
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function api(path) { const { data } = await repoAPI._get(path); return data.data || [] }

async function approve(id) { await repoAPI._put(`/access/${id}/approve`); fetchAll() }
async function rejectAccess(id) { await repoAPI._put(`/access/${id}/reject`); fetchAll() }
async function remove(id) { await repoAPI._delete(`/access/${id}`); fetchAll() }

function statusLabel(s) {
  if (s === 0) return t('access.pending')
  if (s === 1) return t('access.approved')
  return t('access.rejected')
}
</script>

<template>
  <div class="access-page">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('personal.accessTab') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('access.desc') }}</p>
    </div>

    <div class="access-tabs">
      <button :class="{ active: activeTab === 'received' }" @click="activeTab = 'received'">{{ t('access.received') }}</button>
      <button :class="{ active: activeTab === 'sent' }" @click="activeTab = 'sent'">{{ t('access.sent') }}</button>
    </div>

    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone">

      <!-- Received -->
      <div v-show="activeTab === 'received'">
        <template v-if="!receivedPending.length && !receivedResolved.length">
          <p class="empty">{{ t('access.noPending') }}</p>
        </template>
        <template v-else>
          <div v-if="receivedPending.length" class="section">
            <h3>{{ t('access.pendingRequests') }}</h3>
            <div class="access-list">
              <div v-for="a in receivedPending" :key="a.id" class="access-card">
                <div class="access-card__left" @click="router.push(`/repos/${a.repoId}`)">
                  <img v-if="userMap[a.userId]?.avatar" :src="userMap[a.userId].avatar" class="access-card__avatar" />
                  <span v-else class="access-card__avatar-placeholder">{{ (userMap[a.userId]?.nickname || '?')[0] }}</span>
                  <div class="access-card__info">
                    <span class="access-card__user">{{ userMap[a.userId]?.nickname || `User#${a.userId}` }}</span>
                    <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                  </div>
                  <span class="access-card__status pending">{{ statusLabel(a.access) }}</span>
                </div>
                <div class="access-card__actions">
                  <button class="access-card__btn access-card__btn--reject" @click="rejectAccess(a.id)">{{ t('access.reject') }}</button>
                  <button class="access-card__btn access-card__btn--allow" @click="approve(a.id)">{{ t('access.allow') }}</button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="receivedResolved.length" class="section">
            <h3>{{ t('access.resolvedRequests') }}</h3>
            <div class="access-list">
              <div v-for="a in receivedResolved" :key="a.id" class="access-card">
                <div class="access-card__left" @click="router.push(`/repos/${a.repoId}`)">
                  <img v-if="userMap[a.userId]?.avatar" :src="userMap[a.userId].avatar" class="access-card__avatar" />
                  <span v-else class="access-card__avatar-placeholder">{{ (userMap[a.userId]?.nickname || '?')[0] }}</span>
                  <div class="access-card__info">
                    <span class="access-card__user">{{ userMap[a.userId]?.nickname || `User#${a.userId}` }}</span>
                    <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                  </div>
                  <span class="access-card__status" :class="{ approved: a.access === 1, rejected: a.access === 2 }">{{ statusLabel(a.access) }}</span>
                </div>
                <button class="btn btn--outline btn--sm" @click="remove(a.id)">{{ t('access.remove') }}</button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Sent -->
      <div v-show="activeTab === 'sent'">
        <template v-if="!sentPending.length && !sentResolved.length">
          <p class="empty">{{ t('access.noPending') }}</p>
        </template>
        <template v-else>
          <div v-if="sentPending.length" class="section">
            <h3>{{ t('access.pendingSent') }}</h3>
            <div class="access-list">
              <div v-for="a in sentPending" :key="a.id" class="access-card" @click="router.push(`/repos/${a.repoId}`)">
                <div class="access-card__left">
                  <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                  <span class="access-card__status pending">{{ statusLabel(a.access) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="sentResolved.length" class="section">
            <h3>{{ t('access.resolvedSent') }}</h3>
            <div class="access-list">
              <div v-for="a in sentResolved" :key="a.id" class="access-card" @click="router.push(`/repos/${a.repoId}`)">
                <div class="access-card__left">
                  <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                  <span class="access-card__status" :class="{ approved: a.access === 1, rejected: a.access === 2 }">{{ statusLabel(a.access) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

    </template>
  </div>
</template>

<style scoped>
.access-page .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.access-page .page-header__subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); }
.access-tabs { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-xl); }
.access-tabs button { padding: var(--spacing-xs) var(--spacing-lg); font-size: var(--text-sm); border-radius: var(--rounded-full); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.access-tabs button:hover { border-color: var(--color-primary); color: var(--color-primary); }
.access-tabs button.active { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-light); }
.section { margin-bottom: var(--spacing-xl); }
h3 { font-size: var(--text-base); font-weight: var(--weight-medium); margin-bottom: var(--spacing-md); color: var(--color-text-heading); }
.access-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.access-card { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); }
.access-card__left { display: flex; align-items: center; gap: var(--spacing-md); flex: 1; min-width: 0; cursor: pointer; }
.access-card__avatar { width: 36px; height: 36px; border-radius: var(--rounded-full); object-fit: cover; border: 1px solid var(--color-border); }
.access-card__avatar-placeholder { width: 36px; height: 36px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: var(--weight-medium); flex-shrink: 0; }
.access-card__info { display: flex; flex-direction: column; overflow: hidden; }
.access-card__user { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); }
.access-card__repo { font-size: var(--text-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.access-card__repo:hover { color: var(--color-primary); }
.access-card__status { font-size: var(--text-xs); padding: 1px 8px; border-radius: var(--rounded-full); flex-shrink: 0; margin-left: auto; }
.access-card__status.pending { color: #d97706; background: rgba(217,119,6,0.1); }
.access-card__status.approved { color: #16a34a; background: rgba(22,163,74,0.1); }
.access-card__status.rejected { color: #dc2626; background: rgba(220,38,38,0.1); }
.access-card__actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; }
.access-card__btn { padding: var(--spacing-xs) var(--spacing-md); font-size: var(--text-xs); font-weight: var(--weight-medium); border: none; border-radius: var(--rounded-md); cursor: pointer; transition: opacity var(--transition-fast); }
.access-card__btn--reject { color: #dc2626; background: rgba(220,38,38,0.08); }
.access-card__btn--reject:hover { background: rgba(220,38,38,0.15); }
.access-card__btn--allow { color: #16a34a; background: rgba(22,163,74,0.08); }
.access-card__btn--allow:hover { background: rgba(22,163,74,0.15); }
.empty { font-size: var(--text-sm); color: var(--color-text-secondary); padding: var(--spacing-xl) 0; }
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { repoAPI, userAPI } from '@/api'
import { useConfig } from '@/composables/useConfig'
import Pagination from '@/components/Pagination.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const { t } = useI18n()
const { load: loadConfig, get: getConfig } = useConfig()

const activeTab = ref('received')
const loading = ref(true)
const loadingDone = ref(false)

const spData = ref({ records: [], pages: 1, total: 0, page: 1 })
const srData = ref({ records: [], pages: 1, total: 0, page: 1 })
const rpData = ref({ records: [], pages: 1, total: 0, page: 1 })
const rrData = ref({ records: [], pages: 1, total: 0, page: 1 })
const repoMap = ref({})
const userMap = ref({})
let pageSize = 10

onMounted(async () => {
  await loadConfig()
  pageSize = parseInt(getConfig('page_size', '10'))
  fetchAll()
})

async function fetchAll() {
  loading.value = true; loadingDone.value = false
  try {
    await Promise.all([fetchSP(), fetchSR(), fetchRP(), fetchRR()])
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function fetchSP(p = 1) { const { data } = await repoAPI.getAccessList('/access/sent/pending', p, pageSize); spData.value = data.data; await loadRepoMaps(data.data.records) }
async function fetchSR(p = 1) { const { data } = await repoAPI.getAccessList('/access/sent/resolved', p, pageSize); srData.value = data.data; await loadRepoMaps(data.data.records) }
async function fetchRP(p = 1) { const r = await repoAPI.getAccessList('/access/received/pending', p, pageSize); rpData.value = r.data.data; await loadMaps(rpData.value.records) }
async function fetchRR(p = 1) { const r = await repoAPI.getAccessList('/access/received/resolved', p, pageSize); rrData.value = r.data.data; await loadMaps(rrData.value.records) }

async function loadRepoMaps(records) {
  if (!records?.length) return
  for (const a of records) {
    if (!repoMap.value[a.repoId]) {
      try { const { data } = await repoAPI.getDetail(a.repoId); repoMap.value[a.repoId] = data.data?.name || `#${a.repoId}` } catch { repoMap.value[a.repoId] = `#${a.repoId}` }
    }
  }
}

async function loadMaps(records) {
  if (!records?.length) return
  for (const a of records) {
    if (!repoMap.value[a.repoId]) {
      try { const { data } = await repoAPI.getDetail(a.repoId); repoMap.value[a.repoId] = data.data?.name || `#${a.repoId}` } catch { repoMap.value[a.repoId] = `#${a.repoId}` }
    }
    if (!userMap.value[a.userId]) {
      try { const { data } = await userAPI.getDetail(a.userId); userMap.value[a.userId] = data.data } catch { userMap.value[a.userId] = null }
    }
  }
}

async function approve(id) { await repoAPI._put(`/access/${id}/approve`); fetchRP(); fetchRR() }
async function rejectAccess(id) { await repoAPI._put(`/access/${id}/reject`); fetchRP(); fetchRR() }
async function remove(id) { await repoAPI._delete(`/access/${id}`); fetchRR() }

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
      <div class="access-tabs__indicator" :style="{ left: activeTab === 'received' ? '3px' : 'calc(50% + 3px)' }"></div>
      <button :class="{ active: activeTab === 'received' }" @click="activeTab = 'received'">{{ t('access.received') }}</button>
      <button :class="{ active: activeTab === 'sent' }" @click="activeTab = 'sent'">{{ t('access.sent') }}</button>
    </div>

    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone">

      <!-- Received -->
      <div v-show="activeTab === 'received'">
        <template v-if="!rpData.records.length && !rrData.records.length">
          <p class="empty">{{ t('access.noRequests') }}</p>
        </template>
        <template v-else>
          <div v-if="rpData.records.length" class="section">
            <h3>{{ t('access.pendingRequests') }}</h3>
            <div class="access-list">
              <div v-for="a in rpData.records" :key="a.id" class="access-card">
                <div class="access-card__left" @click="router.push(`/repos/${a.repoId}`)">
                  <img v-if="userMap[a.userId]?.avatar" :src="userMap[a.userId].avatar" class="access-card__avatar" />
                  <span v-else class="access-card__avatar-placeholder">{{ (userMap[a.userId]?.nickname || '?')[0] }}</span>
                  <div class="access-card__info">
                    <span class="access-card__user">{{ userMap[a.userId]?.nickname || `User#${a.userId}` }}</span>
                    <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                  </div>
                </div>
                <span class="access-card__status pending">{{ statusLabel(a.access) }}</span>
                <div class="access-card__actions">
                  <button class="access-card__btn access-card__btn--reject" @click="rejectAccess(a.id)">{{ t('access.reject') }}</button>
                  <button class="access-card__btn access-card__btn--allow" @click="approve(a.id)">{{ t('access.allow') }}</button>
                </div>
              </div>
            </div>
            <Pagination :page="rpData.pages > 0 ? (rpData.page || 1) : 1" :pages="rpData.pages" :total="rpData.total" :size="pageSize" @change="p => fetchRP(p)" />
          </div>
          <div v-if="rrData.records.length" class="section">
            <h3>{{ t('access.resolvedRequests') }}</h3>
            <div class="access-list">
              <div v-for="a in rrData.records" :key="a.id" class="access-card">
                <div class="access-card__left" @click="router.push(`/repos/${a.repoId}`)">
                  <img v-if="userMap[a.userId]?.avatar" :src="userMap[a.userId].avatar" class="access-card__avatar" />
                  <span v-else class="access-card__avatar-placeholder">{{ (userMap[a.userId]?.nickname || '?')[0] }}</span>
                  <div class="access-card__info">
                    <span class="access-card__user">{{ userMap[a.userId]?.nickname || `User#${a.userId}` }}</span>
                    <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                  </div>
                </div>
                <span class="access-card__status" :class="{ approved: a.access === 1, rejected: a.access === 2 }">{{ statusLabel(a.access) }}</span>
                <button class="access-card__btn access-card__btn--remove" @click="remove(a.id)">{{ t('access.remove') }}</button>
              </div>
            </div>
            <Pagination :page="rrData.pages > 0 ? (rrData.page || 1) : 1" :pages="rrData.pages" :total="rrData.total" :size="pageSize" @change="p => fetchRR(p)" />
          </div>
        </template>
      </div>

      <!-- Sent -->
      <div v-show="activeTab === 'sent'">
        <template v-if="!spData.records.length && !srData.records.length">
          <p class="empty">{{ t('access.noRequests') }}</p>
        </template>
        <template v-else>
          <div v-if="spData.records.length" class="section">
            <h3>{{ t('access.pendingSent') }}</h3>
            <div class="access-list">
              <div v-for="a in spData.records" :key="a.id" class="access-card" @click="router.push(`/repos/${a.repoId}`)">
                <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                <span class="access-card__status pending">{{ statusLabel(a.access) }}</span>
              </div>
            </div>
            <Pagination :page="spData.pages > 0 ? (spData.page || 1) : 1" :pages="spData.pages" :total="spData.total" :size="pageSize" @change="p => fetchSP(p)" />
          </div>
          <div v-if="srData.records.length" class="section">
            <h3>{{ t('access.resolvedSent') }}</h3>
            <div class="access-list">
              <div v-for="a in srData.records" :key="a.id" class="access-card" @click="router.push(`/repos/${a.repoId}`)">
                <span class="access-card__repo">{{ repoMap[a.repoId] }}</span>
                <span class="access-card__status" :class="{ approved: a.access === 1, rejected: a.access === 2 }">{{ statusLabel(a.access) }}</span>
              </div>
            </div>
            <Pagination :page="srData.pages > 0 ? (srData.page || 1) : 1" :pages="srData.pages" :total="srData.total" :size="pageSize" @change="p => fetchSR(p)" />
          </div>
        </template>
      </div>

    </template>
  </div>
</template>

<style scoped>
.access-page .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.access-page .page-header__subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--spacing-xs); }
.access-tabs { display: flex; position: relative; border: 1px solid var(--color-border); border-radius: var(--rounded-md); overflow: hidden; margin-bottom: var(--spacing-2xl); background: var(--color-surface); }
.access-tabs__indicator { position: absolute; top: 3px; width: calc(50% - 6px); height: calc(100% - 6px); background: var(--color-primary-light); border-radius: calc(var(--rounded-md) - 1px); transition: left 0.2s ease; left: 3px; }
.access-tabs button { display: inline-flex; align-items: center; justify-content: center; padding: var(--spacing-xs) var(--spacing-md); font-size: var(--text-xs); font-weight: var(--weight-medium); border: none; background: transparent; color: var(--color-text-secondary); cursor: pointer; transition: color var(--transition-fast); position: relative; z-index: 1; flex: 1 1 0; white-space: nowrap; }
.access-tabs button:hover { color: var(--color-text-heading); }
.access-tabs button.active { color: var(--color-primary); }
.section { margin-bottom: var(--spacing-2xl); }
h3 { font-size: var(--text-sm); font-weight: var(--weight-medium); margin-bottom: var(--spacing-md); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.access-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.access-card { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-md); transition: border-color var(--transition-fast); }
.access-card:hover { border-color: var(--color-border); background: var(--color-bg-alt); }
.access-card__left { display: flex; align-items: center; gap: var(--spacing-md); flex: 1; min-width: 0; cursor: pointer; }
.access-card__avatar { width: 40px; height: 40px; border-radius: var(--rounded-full); object-fit: cover; border: 2px solid var(--color-border); flex-shrink: 0; }
.access-card__avatar-placeholder { width: 40px; height: 40px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: var(--weight-medium); flex-shrink: 0; }
.access-card__info { display: flex; flex-direction: column; overflow: hidden; gap: 1px; }
.access-card__user { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); line-height: 1.3; }
.access-card__repo { font-size: var(--text-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.access-card__status { font-size: var(--text-xs); padding: 2px 10px; border-radius: var(--rounded-full); flex-shrink: 0; font-weight: var(--weight-medium); margin-right: var(--spacing-sm); }
.access-card__status.pending { color: #d97706; background: rgba(217,119,6,0.1); }
.access-card__status.approved { color: #16a34a; background: rgba(22,163,74,0.1); }
.access-card__status.rejected { color: #dc2626; background: rgba(220,38,38,0.1); }
.access-card__actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; }
.access-card__btn { padding: var(--spacing-xs) var(--spacing-md); font-size: var(--text-xs); font-weight: var(--weight-medium); border: none; border-radius: var(--rounded-full); cursor: pointer; transition: all var(--transition-fast); }
.access-card__btn--reject { color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }
.access-card__btn--reject:hover { background: rgba(220,38,38,0.08); }
.access-card__btn--allow { color: #16a34a; border: 1px solid rgba(22,163,74,0.3); }
.access-card__btn--allow:hover { background: rgba(22,163,74,0.08); }
.access-card__btn--remove { color: var(--color-text-secondary); background: transparent; border: 1px solid var(--color-border); }
.access-card__btn--remove:hover { color: #dc2626; border-color: #dc2626; background: rgba(220,38,38,0.04); }
.empty { text-align: center; font-size: var(--text-sm); color: var(--color-text-secondary); padding: var(--spacing-3xl) 0; }
</style>

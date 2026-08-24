<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConfig } from '@/composables/useConfig'
import { useConfirm } from '@/composables/useConfirm'
import { requestAPI } from '@/api'
import Pagination from '@/components/Pagination.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SliderSelect from '@/components/SliderSelect.vue'
import { formatDate } from '@/utils/format'

const { t } = useI18n()
const { confirm } = useConfirm()
const { load: loadConfig, get: getConfig } = useConfig()

const activeTab = ref('received')
const loading = ref(true)
const loadingDone = ref(false)
const handlingId = ref(null)

const tabOptions = computed(() => [
  { value: 'received', label: t('request.received') },
  { value: 'sent', label: t('request.sent') }
])

const rpData = ref({ records: [], pages: 1, total: 0, page: 1 })
const rrData = ref({ records: [], pages: 1, total: 0, page: 1 })
const spData = ref({ records: [], pages: 1, total: 0, page: 1 })
const srData = ref({ records: [], pages: 1, total: 0, page: 1 })
let pageSize = 10

onMounted(async () => {
  await loadConfig()
  pageSize = parseInt(getConfig('page_size', '10'))
  fetchAll()
})

async function fetchAll() {
  loading.value = true; loadingDone.value = false
  try {
    await Promise.all([fetchRP(), fetchRR(), fetchSP(), fetchSR()])
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function fetchRP(p = 1) {
  const { data } = await requestAPI.received(p, pageSize)
  const d = data.data
  rpData.value = { ...d, records: (d.records || []).filter(r => r.access === 0) }
}
async function fetchRR(p = 1) {
  const { data } = await requestAPI.received(p, pageSize)
  const d = data.data
  rrData.value = { ...d, records: (d.records || []).filter(r => r.access !== 0) }
}
async function fetchSP(p = 1) {
  const { data } = await requestAPI.sent(p, pageSize)
  const d = data.data
  spData.value = { ...d, records: (d.records || []).filter(r => r.access === 0) }
}
async function fetchSR(p = 1) {
  const { data } = await requestAPI.sent(p, pageSize)
  const d = data.data
  srData.value = { ...d, records: (d.records || []).filter(r => r.access !== 0) }
}

async function handleRequest(r, access) {
  if (handlingId.value) return
  if (access === 1 && !await confirm(t('request.approveConfirm'))) return
  handlingId.value = r.id
  try {
    await requestAPI.handle(r.id, access === 1 ? 'APPROVED' : 'REJECTED')
    fetchRP(); fetchRR(); fetchSP(); fetchSR()
  } catch { /* ignore */ } finally {
    handlingId.value = null
  }
}

function statusLabel(a) {
  if (a === 0) return t('request.pending')
  if (a === 1) return t('request.approved')
  return t('request.rejected')
}

function requestMeta(r) {
  if (r.type !== 0) return ''
  try {
    const meta = JSON.parse(r.meta || '{}')
    return meta.expansion != null ? formatSize(Number(meta.expansion)) : ''
  } catch {
    return ''
  }
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}
</script>

<template>
  <div class="request-page">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('personal.requestTab') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('request.desc') }}</p>
    </div>

    <SliderSelect
      class="request-tabs"
      :model-value="activeTab"
      :options="tabOptions"
      @update:model-value="activeTab = $event"
    />

    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone">

      <!-- Received -->
      <div v-show="activeTab === 'received'">
        <template v-if="!rpData.records.length && !rrData.records.length">
          <p class="empty">{{ t('request.noRequests') }}</p>
        </template>
        <template v-else>
          <div v-if="rpData.records.length" class="section">
            <h3>{{ t('request.pendingRequests') }}</h3>
            <div class="request-list">
              <div v-for="r in rpData.records" :key="r.id" class="request-card">
                <div class="request-card__left">
                  <span class="request-card__avatar-placeholder">{{ (r.senderName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ r.senderName || `User#${r.senderId}` }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ t('request.storageExtension') }}</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.createdAt) }}</div>
                <span class="request-card__status pending">{{ statusLabel(r.access) }}</span>
                <div class="request-card__actions">
                  <button
                    class="request-card__btn request-card__btn--reject"
                    :disabled="handlingId !== null"
                    @click="handleRequest(r, 2)"
                  >{{ t('request.reject') }}</button>
                  <button
                    class="request-card__btn request-card__btn--allow"
                    :disabled="handlingId !== null"
                    @click="handleRequest(r, 1)"
                  >{{ t('request.approve') }}</button>
                </div>
              </div>
            </div>
            <Pagination :page="rpData.pages > 0 ? (rpData.page || 1) : 1" :pages="rpData.pages" :total="rpData.total" :size="pageSize" @change="p => fetchRP(p)" />
          </div>
          <div v-if="rrData.records.length" class="section">
            <h3>{{ t('request.resolvedRequests') }}</h3>
            <div class="request-list">
              <div v-for="r in rrData.records" :key="r.id" class="request-card">
                <div class="request-card__left">
                  <span class="request-card__avatar-placeholder">{{ (r.senderName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ r.senderName || `User#${r.senderId}` }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ t('request.storageExtension') }}</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.handledAt || r.createdAt) }}</div>
                <span class="request-card__status" :class="{ approved: r.access === 1, rejected: r.access === 2 }">{{ statusLabel(r.access) }}</span>
              </div>
            </div>
            <Pagination :page="rrData.pages > 0 ? (rrData.page || 1) : 1" :pages="rrData.pages" :total="rrData.total" :size="pageSize" @change="p => fetchRR(p)" />
          </div>
        </template>
      </div>

      <!-- Sent -->
      <div v-show="activeTab === 'sent'">
        <template v-if="!spData.records.length && !srData.records.length">
          <p class="empty">{{ t('request.noRequests') }}</p>
        </template>
        <template v-else>
          <div v-if="spData.records.length" class="section">
            <h3>{{ t('request.pendingSent') }}</h3>
            <div class="request-list">
              <div v-for="r in spData.records" :key="r.id" class="request-card">
                <div class="request-card__left">
                  <span class="request-card__avatar-placeholder">{{ (r.senderName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ r.senderName || `User#${r.senderId}` }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ t('request.storageExtension') }}</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.createdAt) }}</div>
                <span class="request-card__status pending">{{ statusLabel(r.access) }}</span>
              </div>
            </div>
            <Pagination :page="spData.pages > 0 ? (spData.page || 1) : 1" :pages="spData.pages" :total="spData.total" :size="pageSize" @change="p => fetchSP(p)" />
          </div>
          <div v-if="srData.records.length" class="section">
            <h3>{{ t('request.resolvedSent') }}</h3>
            <div class="request-list">
              <div v-for="r in srData.records" :key="r.id" class="request-card">
                <div class="request-card__left">
                  <span class="request-card__avatar-placeholder">{{ (r.senderName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ r.senderName || `User#${r.senderId}` }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ t('request.storageExtension') }}</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.handledAt || r.createdAt) }}</div>
                <span class="request-card__status" :class="{ approved: r.access === 1, rejected: r.access === 2 }">{{ statusLabel(r.access) }}</span>
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
.request-page .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.request-page .page-header__subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); }
.request-tabs { margin-bottom: var(--spacing-2xl); }
.section { margin-bottom: var(--spacing-2xl); }
h3 { font-size: var(--text-sm); font-weight: var(--weight-medium); margin-bottom: var(--spacing-md); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.request-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.request-card { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-md); transition: border-color var(--transition-fast); }
.request-card:hover { border-color: var(--color-border); background: var(--color-bg-alt); }
[data-theme="dark"] .request-card:hover { background: #23252f; }
.request-card__left { display: flex; align-items: center; gap: var(--spacing-md); flex: 1; min-width: 0; }
.request-card__avatar-placeholder { width: 40px; height: 40px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: var(--weight-medium); flex-shrink: 0; }
.request-card__info { display: flex; flex-direction: column; overflow: hidden; gap: 1px; }
.request-card__user { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); line-height: 1.3; }
.request-card__type { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--text-xs); color: var(--color-text-secondary); overflow: hidden; white-space: nowrap; }
.request-card__type-name { flex-shrink: 0; }
.request-card__meta { font-family: var(--font-mono); color: var(--color-primary); flex-shrink: 0; }
.request-card__time { font-size: var(--text-xs); color: var(--color-text-tertiary, var(--color-text-secondary)); flex-shrink: 0; }
.request-card__status { font-size: var(--text-xs); padding: 2px 10px; border-radius: var(--rounded-full); flex-shrink: 0; font-weight: var(--weight-medium); margin-right: var(--spacing-sm); }
.request-card__status.pending { color: #d97706; background: rgba(217,119,6,0.1); }
.request-card__status.approved { color: #16a34a; background: rgba(22,163,74,0.1); }
.request-card__status.rejected { color: #dc2626; background: rgba(220,38,38,0.1); }
.request-card__actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; }
.request-card__btn { padding: var(--spacing-xs) var(--spacing-md); font-size: var(--text-xs); font-weight: var(--weight-medium); border: none; border-radius: var(--rounded-full); cursor: pointer; transition: all var(--transition-fast); }
.request-card__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.request-card__btn--reject { color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }
.request-card__btn--reject:hover:not(:disabled) { background: rgba(220,38,38,0.08); }
.request-card__btn--allow { color: #16a34a; border: 1px solid rgba(22,163,74,0.3); }
.request-card__btn--allow:hover:not(:disabled) { background: rgba(22,163,74,0.08); }
.empty { text-align: center; font-size: var(--text-sm); color: var(--color-text-secondary); padding: var(--spacing-3xl) 0; }
.section :deep(.pagination) { margin-top: var(--spacing-md); }
</style>

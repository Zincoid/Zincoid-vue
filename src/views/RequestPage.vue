<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useConfig } from '@/composables/useConfig'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { requestAPI } from '@/api'
import { useWalkman } from '@/composables/useWalkman'
import Pagination from '@/components/Pagination.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SliderSelect from '@/components/SliderSelect.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import { formatDate } from '@/utils/format'

const { t } = useI18n()
const { confirm } = useConfirm()
const { toast } = useToast()
const router = useRouter()
const { playExternal } = useWalkman()

function playInWalkman() {
  if (!detail.value) return
  playExternal({ name: musicName(detail.value), url: musicUrl(detail.value) })
}
const { load: loadConfig, get: getConfig } = useConfig()

const activeTab = ref('received')
const loading = ref(true)
const loadingDone = ref(false)
const handlingId = ref(null)
const detail = ref(null)
const detailReceived = ref(false)

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

function openDetail(r, received) {
  detail.value = r
  detailReceived.value = received
}

async function handleRequest(r, access) {
  if (handlingId.value) return
  if (!await confirm(access === 1 ? t('request.approveConfirm') : t('request.rejectConfirm'))) return
  handlingId.value = r.id
  try {
    await requestAPI.handle(r.id, access === 1 ? 'APPROVED' : 'REJECTED')
    detail.value = null
    fetchRP(); fetchRR(); fetchSP(); fetchSR()
  } catch { /* ignore */ } finally {
    handlingId.value = null
  }
}

async function handleRevoke(r) {
  if (handlingId.value) return
  rpData.value.records = rpData.value.records.filter(x => x.id !== r.id)
  rrData.value.records = rrData.value.records.filter(x => x.id !== r.id)
  spData.value.records = spData.value.records.filter(x => x.id !== r.id)
  srData.value.records = srData.value.records.filter(x => x.id !== r.id)
  handlingId.value = r.id
  try {
    await requestAPI.remove(r.id)
    detail.value = null
  } catch (err) {
    toast(err?.response?.data?.message || t('request.deleteFailed'), 'error')
  } finally {
    handlingId.value = null
    fetchRP(); fetchRR(); fetchSP(); fetchSR()
  }
}

function statusLabel(a) {
  if (a === 0) return t('request.pending')
  if (a === 1) return t('request.approved')
  return t('request.rejected')
}

const TYPE_VIEWS = {
  0: {
    labelKey: 'request.storageExtension',
    meta(r) {
      try {
        const meta = JSON.parse(r.meta || '{}')
        return meta.expansion != null ? formatSize(Number(meta.expansion)) : ''
      } catch {
        return ''
      }
    }
  },
  1: {
    labelKey: 'request.report',
    meta(r) {
      try {
        const meta = JSON.parse(r.meta || '{}')
        return meta.title || t('request.untitled')
      } catch {
        return t('request.untitled')
      }
    }
  },
  2: {
    labelKey: 'request.musicRequest',
    meta(r) {
      return musicName(r)
    }
  }
}

function musicName(r) {
  try {
    const meta = JSON.parse(r.meta || '{}')
    return (meta.name || '').replace(/\.[^.]+$/, '')
  } catch {
    return ''
  }
}

function musicUrl(r) {
  try {
    const meta = JSON.parse(r.meta || '{}')
    return meta.url || ''
  } catch {
    return ''
  }
}

function typeLabel(r) {
  const view = TYPE_VIEWS[r.type]
  return view ? t(view.labelKey) : `Type#${r.type}`
}

function requestMeta(r) {
  const view = TYPE_VIEWS[r.type]
  return view ? view.meta(r) : ''
}

function reasonPrefix(r) {
  return r.type === 1 ? t('request.contentLabel') : t('request.reasonLabel')
}

function isAdminRequest(r) {
  return r.type === 0 || r.type === 1
}

function sentUserLabel(r) {
  if (isAdminRequest(r)) {
    return r.receiverName
      ? t('request.adminHandledBy', { name: r.receiverName })
      : t('request.adminPending')
  }
  return t('request.toLabel') + (r.receiverName || t('request.waitingAdmin'))
}

function requestReason(r) {
  try {
    const meta = JSON.parse(r.meta || '{}')
    if (r.type === 1) return meta.content || ''
    return meta.reason || ''
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
      <div class="page-header__text">
        <h2 class="page-header__title">## {{ t('personal.requestTab') }}<span class="cursor">_</span></h2>
        <p class="page-header__subtitle">{{ t('request.desc') }}</p>
      </div>
      <button class="page-refresh" :class="{ 'page-refresh--loading': loading }" :disabled="loading" @click="fetchAll">
        <SvgIcon name="refresh" :size="18" />
      </button>
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
              <div v-for="r in rpData.records" :key="r.id" class="request-card" @click="openDetail(r, true)">
                <div class="request-card__left">
                  <img v-if="r.senderAvatar" :src="r.senderAvatar" class="request-card__avatar" />
                  <span v-else class="request-card__avatar-placeholder">{{ (r.senderName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ t('request.fromLabel') }}{{ r.senderName || `User#${r.senderId}` }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ typeLabel(r) }}</span>
                      <span v-if="requestMeta(r)" class="request-card__type-sep">-</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                    <span v-if="requestReason(r)" class="request-card__reason">{{ reasonPrefix(r) }}{{ requestReason(r) }}</span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.createdAt) }}</div>
                <span class="request-card__status pending">{{ statusLabel(r.access) }}</span>
                <div class="request-card__actions" @click.stop>
                  <button
                    class="request-card__btn request-card__btn--reject"
                    :disabled="handlingId !== null"
                    :title="t('request.reject')"
                    @click="handleRequest(r, 2)"
                  ><SvgIcon name="close" :size="14" /></button>
                  <button
                    class="request-card__btn request-card__btn--allow"
                    :disabled="handlingId !== null"
                    :title="t('request.approve')"
                    @click="handleRequest(r, 1)"
                  ><SvgIcon name="check" :size="14" /></button>
                  <button
                    class="request-card__btn request-card__btn--del"
                    :disabled="handlingId !== null"
                    :title="t('request.remove')"
                    @click="handleRevoke(r)"
                  ><SvgIcon name="trash" :size="14" /></button>
                </div>
              </div>
            </div>
            <Pagination :page="rpData.pages > 0 ? (rpData.page || 1) : 1" :pages="rpData.pages" :total="rpData.total" :size="pageSize" @change="p => fetchRP(p)" />
          </div>
          <div v-if="rrData.records.length" class="section">
            <h3>{{ t('request.resolvedRequests') }}</h3>
            <div class="request-list">
              <div v-for="r in rrData.records" :key="r.id" class="request-card" @click="openDetail(r, true)">
                <div class="request-card__left">
                  <img v-if="r.senderAvatar" :src="r.senderAvatar" class="request-card__avatar" />
                  <span v-else class="request-card__avatar-placeholder">{{ (r.senderName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ t('request.fromLabel') }}{{ r.senderName || `User#${r.senderId}` }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ typeLabel(r) }}</span>
                      <span v-if="requestMeta(r)" class="request-card__type-sep">-</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                    <span v-if="requestReason(r)" class="request-card__reason">{{ reasonPrefix(r) }}{{ requestReason(r) }}</span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.handledAt || r.createdAt) }}</div>
                <span class="request-card__status" :class="{ approved: r.access === 1, rejected: r.access === 2 }">{{ statusLabel(r.access) }}</span>
                <div class="request-card__actions" @click.stop>
                  <button
                    class="request-card__btn request-card__btn--del"
                    :disabled="handlingId !== null"
                    :title="t('request.remove')"
                    @click="handleRevoke(r)"
                  ><SvgIcon name="trash" :size="14" /></button>
                </div>
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
              <div v-for="r in spData.records" :key="r.id" class="request-card" @click="openDetail(r, false)">
                <div class="request-card__left">
                  <img v-if="r.receiverAvatar" :src="r.receiverAvatar" class="request-card__avatar" />
                  <span v-else class="request-card__avatar-placeholder">{{ (r.receiverName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ sentUserLabel(r) }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ typeLabel(r) }}</span>
                      <span v-if="requestMeta(r)" class="request-card__type-sep">-</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                    <span v-if="requestReason(r)" class="request-card__reason">{{ reasonPrefix(r) }}{{ requestReason(r) }}</span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.createdAt) }}</div>
                <span class="request-card__status pending">{{ statusLabel(r.access) }}</span>
                <div class="request-card__actions" @click.stop>
                  <button
                    class="request-card__btn request-card__btn--del"
                    :disabled="handlingId !== null"
                    :title="t('request.remove')"
                    @click="handleRevoke(r)"
                  ><SvgIcon name="trash" :size="14" /></button>
                </div>
              </div>
            </div>
            <Pagination :page="spData.pages > 0 ? (spData.page || 1) : 1" :pages="spData.pages" :total="spData.total" :size="pageSize" @change="p => fetchSP(p)" />
          </div>
          <div v-if="srData.records.length" class="section">
            <h3>{{ t('request.resolvedSent') }}</h3>
            <div class="request-list">
              <div v-for="r in srData.records" :key="r.id" class="request-card" @click="openDetail(r, false)">
                <div class="request-card__left">
                  <img v-if="r.receiverAvatar" :src="r.receiverAvatar" class="request-card__avatar" />
                  <span v-else class="request-card__avatar-placeholder">{{ (r.receiverName || '?')[0].toUpperCase() }}</span>
                  <div class="request-card__info">
                    <span class="request-card__user">{{ sentUserLabel(r) }}</span>
                    <span class="request-card__type">
                      <span class="request-card__type-name">{{ typeLabel(r) }}</span>
                      <span v-if="requestMeta(r)" class="request-card__type-sep">-</span>
                      <span v-if="requestMeta(r)" class="request-card__meta">{{ requestMeta(r) }}</span>
                    </span>
                    <span v-if="requestReason(r)" class="request-card__reason">{{ reasonPrefix(r) }}{{ requestReason(r) }}</span>
                  </div>
                </div>
                <div class="request-card__time">{{ formatDate(r.handledAt || r.createdAt) }}</div>
                <span class="request-card__status" :class="{ approved: r.access === 1, rejected: r.access === 2 }">{{ statusLabel(r.access) }}</span>
                <div class="request-card__actions" @click.stop>
                  <button
                    class="request-card__btn request-card__btn--del"
                    :disabled="handlingId !== null"
                    :title="t('request.remove')"
                    @click="handleRevoke(r)"
                  ><SvgIcon name="trash" :size="14" /></button>
                </div>
              </div>
            </div>
            <Pagination :page="srData.pages > 0 ? (srData.page || 1) : 1" :pages="srData.pages" :total="srData.total" :size="pageSize" @change="p => fetchSR(p)" />
          </div>
        </template>
      </div>

    </template>

    <Transition name="modal">
      <div v-if="detail" class="modal-overlay" @click.self="detail = null">
        <div class="modal">
          <h3 class="modal__title">
            <span>{{ t('request.detailTitle') }}</span>
            <button class="modal__close" @click="detail = null">
              <SvgIcon name="close" :size="16" />
            </button>
          </h3>

          <div class="detail-sender" @click="router.push(`/members/${detail.senderId}`)">
            <img v-if="detail.senderAvatar" :src="detail.senderAvatar" class="detail-avatar" />
            <span v-else class="detail-avatar detail-avatar--placeholder">{{ (detail.senderName || '?')[0].toUpperCase() }}</span>
            <span class="detail-sender-name">{{ detail.senderName || `User#${detail.senderId}` }}</span>
            <SvgIcon name="chevron-right" :size="12" class="detail-sender-arrow" />
          </div>

          <div class="detail-block">
            <div class="detail-row">
              <span class="detail-label">{{ t('request.typeLabel') }}</span>
              <span class="detail-value">{{ typeLabel(detail) }}</span>
            </div>
            <template v-if="detail.type === 0">
              <div class="detail-row">
                <span class="detail-label">{{ t('request.expansionLabel') }}</span>
                <span class="detail-value">{{ requestMeta(detail) }}</span>
              </div>
              <div v-if="requestReason(detail)" class="detail-row">
                <span class="detail-label">{{ t('request.reason') }}</span>
                <span class="detail-value detail-value--wrap">{{ requestReason(detail) }}</span>
              </div>
            </template>
            <template v-else-if="detail.type === 1">
              <div class="detail-row">
                <span class="detail-label">{{ t('request.titleLabel') }}</span>
                <span class="detail-value detail-value--wrap">{{ requestMeta(detail) }}</span>
              </div>
              <div v-if="requestReason(detail)" class="detail-row">
                <span class="detail-label">{{ t('request.content') }}</span>
                <span class="detail-value detail-value--wrap">{{ requestReason(detail) }}</span>
              </div>
            </template>
            <template v-else-if="detail.type === 2">
              <div v-if="musicName(detail)" class="detail-row">
                <span class="detail-label">{{ t('request.musicLabel') }}</span>
                <span class="detail-value">{{ musicName(detail) }}</span>
              </div>
              <div v-else class="detail-row">
                <span class="detail-label">{{ t('request.musicLabel') }}</span>
                <span class="detail-value">{{ detail.access === 1 ? t('request.musicNone') : t('request.musicPending') }}</span>
              </div>
              <div v-if="musicUrl(detail)" class="detail-row detail-row--center">
                <span class="detail-label">{{ t('request.operationLabel') }}</span>
                <span class="detail-value detail-actions">
                  <button class="btn btn--outline" @click="playInWalkman">
                    <SvgIcon name="audio" :size="12" />
                    {{ t('request.playInWalkman') }}
                  </button>
                  <a class="btn btn--outline btn--download" :href="musicUrl(detail)" :download="musicName(detail)">
                    <SvgIcon name="download" :size="12" />
                    {{ t('request.musicDownload') }}
                  </a>
                </span>
              </div>
            </template>
          </div>

          <div class="detail-block">
            <div class="detail-row">
              <span class="detail-label">{{ t('request.statusLabel') }}</span>
              <span class="detail-value">
                <span class="request-card__status" :class="{ pending: detail.access === 0, approved: detail.access === 1, rejected: detail.access === 2 }">{{ statusLabel(detail.access) }}</span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t('request.handlerLabel') }}</span>
              <span class="detail-value">{{ detail.receiverName || t('request.waitingAdmin') }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ t('request.createdLabel') }}</span>
              <span class="detail-value">{{ formatDate(detail.createdAt) }}</span>
            </div>
            <div v-if="detail.handledAt" class="detail-row">
              <span class="detail-label">{{ t('request.handledLabel') }}</span>
              <span class="detail-value">{{ formatDate(detail.handledAt) }}</span>
            </div>
          </div>

          <div class="modal__actions request-actions">
            <div class="request-actions-row">
              <button
                class="btn btn--outline btn--revoke"
                :disabled="handlingId !== null"
                @click="handleRevoke(detail)"
              >
                <SvgIcon name="trash" :size="14" />
                {{ t('request.remove') }}
              </button>
              <template v-if="detailReceived && detail.access === 0">
                <button
                  class="btn btn--danger"
                  :disabled="handlingId !== null"
                  @click="handleRequest(detail, 2)"
                >
                  <SvgIcon name="close" :size="14" />
                  {{ t('request.reject') }}
                </button>
                <button
                  class="btn btn--success"
                  :disabled="handlingId !== null"
                  @click="handleRequest(detail, 1)"
                >
                  <SvgIcon name="check" :size="14" />
                  {{ t('request.approve') }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.request-page .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-lg); }
.request-page .page-header__subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); }
.page-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}
.page-refresh:hover:not(:disabled) { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-bg); }
.page-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.page-refresh--loading svg { animation: page-spin 1s linear infinite; }
@keyframes page-spin { to { transform: rotate(360deg); } }
.request-tabs { margin-bottom: var(--spacing-2xl); }
.section { margin-bottom: var(--spacing-2xl); }
h3 { font-size: var(--text-sm); font-weight: var(--weight-medium); margin-bottom: var(--spacing-md); color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.request-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.request-card { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-md); cursor: pointer; transition: border-color var(--transition-fast); }
.request-card:hover { border-color: var(--color-border); background: var(--color-bg-alt); }
[data-theme="dark"] .request-card:hover { background: #23252f; }
.request-card__left { display: flex; align-items: center; gap: var(--spacing-md); flex: 1; min-width: 0; cursor: pointer; }
.request-card__avatar { width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: var(--rounded-full); object-fit: cover; border: 2px solid var(--color-border); flex-shrink: 0; }
.request-card__avatar-placeholder { width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: var(--weight-medium); flex-shrink: 0; }
.request-card__info { display: flex; flex-direction: column; overflow: hidden; gap: 1px; min-width: 0; }
.request-card__user { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.request-card__type { display: block; font-size: var(--text-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; margin-top: 2px; }
.request-card__type-name { }
.request-card__type-sep { color: var(--color-text-tertiary, var(--color-text-secondary)); margin: 0 4px; }
.request-card__reason { font-size: var(--text-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; }
.request-card__meta { font-family: var(--font-mono); color: var(--color-primary); }
.request-card__time { font-size: var(--text-xs); color: var(--color-text-tertiary, var(--color-text-secondary)); flex-shrink: 0; }
.request-card__status { font-size: var(--text-xs); padding: 2px 10px; border-radius: var(--rounded-full); flex-shrink: 0; font-weight: var(--weight-medium); }
.request-card__status.pending { color: #d97706; background: rgba(217,119,6,0.1); }
.request-card__status.approved { color: #16a34a; background: rgba(22,163,74,0.1); }
.request-card__status.rejected { color: #dc2626; background: rgba(220,38,38,0.1); }
.request-card__actions { display: flex; gap: var(--spacing-sm); flex-shrink: 0; }
.request-card__btn { padding: var(--spacing-xs) var(--spacing-md); font-size: var(--text-xs); font-weight: var(--weight-medium); border: none; border-radius: var(--rounded-full); cursor: pointer; transition: all var(--transition-fast); }
.request-card__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.request-card__btn--reject { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: none; background: transparent; color: #dc2626; }
.request-card__btn--reject:hover:not(:disabled) { background: rgba(220,38,38,0.1); }
.request-card__btn--allow { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: none; background: transparent; color: #16a34a; }
.request-card__btn--allow:hover:not(:disabled) { background: rgba(22,163,74,0.1); }
.request-card__btn--del { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: none; background: transparent; color: var(--color-text-secondary); }
.request-card__btn--del:hover:not(:disabled) { color: #d97706; background: rgba(217, 119, 6, 0.1); }
.empty { text-align: center; font-size: var(--text-sm); color: var(--color-text-secondary); padding: var(--spacing-3xl) 0; }
.section :deep(.pagination) { margin-top: var(--spacing-md); }

/* ── Detail modal ── */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); }
.modal { position: relative; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); max-width: 440px; width: 100%; padding: var(--spacing-2xl); max-height: 80vh; overflow-y: auto; }
.modal__title { display: flex; align-items: center; justify-content: space-between; font-size: var(--text-lg); margin-bottom: var(--spacing-xl); }
.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-full);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.modal__close:hover { color: var(--color-text-heading); background: var(--color-bg-alt); }
.modal__actions { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-lg); padding-top: var(--spacing-md); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: scale(0.95); }

.detail-sender {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  margin-bottom: var(--spacing-lg);
}
.detail-sender:hover { background: var(--color-bg-alt); }
[data-theme="dark"] .detail-sender:hover { background: #23252f; }
.detail-avatar { width: 32px; height: 32px; border-radius: var(--rounded-full); object-fit: cover; flex-shrink: 0; }
.detail-avatar--placeholder { background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: var(--weight-medium); }
.detail-sender-name { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-sender-arrow { color: var(--color-text-tertiary, var(--color-text-secondary)); flex-shrink: 0; }

.detail-block { display: flex; flex-direction: column; gap: var(--spacing-sm); padding: var(--spacing-lg) var(--spacing-sm); margin: 0 var(--spacing-xs); border-bottom: 1px solid var(--color-border-light); }
.detail-block:nth-last-child(2) { border-bottom: none; }
.detail-row { display: flex; align-items: flex-start; gap: var(--spacing-2xl); font-size: var(--text-sm); }
.detail-row--center { align-items: center; }
.detail-label { color: var(--color-text-secondary); flex-shrink: 0; width: 64px; }
.detail-value { color: var(--color-text-heading); flex: 1; min-width: 0; word-break: break-word; }
.detail-value--wrap { white-space: pre-wrap; }
.detail-actions { display: flex; gap: var(--spacing-sm); }
.detail-actions .btn { flex: 1; padding: 4px var(--spacing-sm); font-size: var(--text-xs); white-space: nowrap; }
.detail-actions .btn svg { flex-shrink: 0; }
.detail-actions .btn--download:hover { border-color: #16a34a; color: #16a34a; }
.detail-block .request-card__status { display: inline-block; margin: 0; }

.request-actions { width: 100%; }
.request-actions-row { display: flex; gap: var(--spacing-sm); width: 100%; }
.request-actions-row .btn { flex: 1; padding: var(--spacing-sm) var(--spacing-md); }
.btn--revoke:hover:not(:disabled) { border-color: #d97706; color: #d97706; }
</style>


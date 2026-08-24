<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { useError } from '@/composables/useError'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useConfig } from '@/composables/useConfig'
import { storageAPI, musicAPI, requestAPI } from '@/api'
import SvgIcon from '@/components/SvgIcon.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { t } = useI18n()
const auth = useAuthStore()
const { getMessage } = useError()
const { toast } = useToast()
const { confirm } = useConfirm()
const { load: loadConfig, get: getConfig } = useConfig()

const storage = ref(null)
const storageLoading = ref(false)
const storageDone = ref(false)
const storageError = ref('')
const cleaning = ref(false)

async function fetchStorage() {
  storageLoading.value = true
  storageError.value = ''
  try {
    const res = await storageAPI.userStorage()
    storage.value = res.data?.data || null
  } catch (e) {
    if (e?.response?.status !== 401) storageError.value = getMessage(e, 'data.storageFailed')
  } finally {
    storageLoading.value = false
  }
}

async function handleCleanup() {
  if (!await confirm(t('data.storageCleanupConfirm'))) return
  cleaning.value = true
  try {
    const res = await storageAPI.cleanupUnlinked()
    const count = res.data?.data ?? 0
    toast(t('data.storageCleanupDone', { count }), count > 0 ? 'success' : 'info')
    fetchStorage()
  } catch (e) {
    toast(getMessage(e, 'data.storageCleanupFailed'), 'error')
  } finally {
    cleaning.value = false
  }
}

onMounted(async () => {
  fetchStorage()
  await loadConfig()
  musicSize.value = parseInt(getConfig('page_size', '10'))
})

const musicOpen = ref(false)
const musicTracks = ref([])
const musicPage = ref(1)
const musicPages = ref(1)
const musicTotal = ref(0)
const musicSize = ref(10)
const musicLoading = ref(false)
const musicUploading = ref(false)
const musicDeleting = ref(null)
const musicMessage = ref('')
const musicError = ref('')
const musicFileInput = ref(null)

function openMusicManage() {
  musicOpen.value = true
  musicMessage.value = ''
  musicError.value = ''
  fetchMusicList(1)
}

function closeMusicManage() {
  musicOpen.value = false
}

async function fetchMusicList(pageNum) {
  musicLoading.value = true
  try {
    const res = await musicAPI.listUser(pageNum, musicSize.value)
    const data = res.data?.data || {}
    musicTracks.value = data.records || []
    musicPages.value = data.pages || 1
    musicTotal.value = data.total || 0
    musicPage.value = pageNum
  } catch (err) {
    musicError.value = getMessage(err, 'data.musicLoadFailed')
  } finally {
    musicLoading.value = false
  }
}

async function handleMusicUpload(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  musicUploading.value = true
  musicError.value = ''
  let ok = 0
  let fail = 0
  for (const file of files) {
    try {
      await musicAPI.upload(file, false)
      ok++
    } catch (err) {
      fail++
    }
  }
  if (fail === 0) {
    musicMessage.value = t('data.musicUploadDone', { count: ok })
    setTimeout(() => musicMessage.value = '', 2000)
  } else {
    musicError.value = t('data.musicUploadFailed', { count: fail })
  }
  fetchMusicList(musicPage.value)
  musicUploading.value = false
  e.target.value = ''
}

async function handleMusicDelete(track) {
  if (!await confirm(t('data.musicDeleteConfirm', { name: track.fileName }))) return
  musicDeleting.value = track.id
  musicError.value = ''
  try {
    await musicAPI.remove(track.id)
    musicMessage.value = t('data.musicDeleteDone')
    setTimeout(() => musicMessage.value = '', 2000)
    fetchMusicList(musicPage.value)
  } catch (err) {
    musicError.value = getMessage(err, 'data.musicDeleteFailed')
  } finally {
    musicDeleting.value = null
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

const ringRadius = 48
const ringCircumference = 2 * Math.PI * ringRadius
const usedPercent = computed(() => {
  if (!storage.value || !storage.value.capacity) return 0
  return Math.round((storage.value.used / storage.value.capacity) * 100)
})
const ringDash = computed(() => (usedPercent.value / 100) * ringCircumference)
const ringColor = computed(() => {
  if (usedPercent.value >= 80) return 'var(--color-danger)'
  if (usedPercent.value <= 20) return 'var(--color-success)'
  return 'var(--color-primary)'
})

const reqOpen = ref(false)
const reqValue = ref('')
const reqUnit = ref('GB')
const reqSubmitting = ref(false)
const reqError = ref('')

const REQUEST_CAPACITY_UNITS = { MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 }

function openRequest() {
  reqOpen.value = true
  reqValue.value = ''
  reqUnit.value = 'GB'
  reqError.value = ''
}

function closeRequest() {
  reqOpen.value = false
}

async function submitRequest() {
  const val = parseFloat(reqValue.value)
  if (isNaN(val) || val <= 0) return
  if (!await confirm(t('data.requestCapacityConfirm', { value: reqValue.value, unit: reqUnit.value }))) return
  reqSubmitting.value = true
  reqError.value = ''
  try {
    const bytes = Math.round(val * REQUEST_CAPACITY_UNITS[reqUnit.value])
    await requestAPI.create(-1, 'STORAGE_EXTENSION', JSON.stringify({ expansion: bytes }))
    toast(t('data.requestCapacitySuccess'), 'success')
    reqOpen.value = false
  } catch (err) {
    reqError.value = getMessage(err, 'data.requestCapacityFailed')
  } finally {
    reqSubmitting.value = false
  }
}
</script>

<template>
  <div class="data-management">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('data.pageTitle') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('data.subtitle') }}</p>
    </div>

    <section class="section">
      <h3>{{ t('data.storageTab') }}</h3>
      <p class="data-storage-desc">{{ t('data.storageDesc') }}</p>
      <p v-if="storageError" class="msg msg--error">{{ storageError }}</p>
      <LoadingSpinner :visible="storageLoading && !storage" @done="storageDone = true" />
      <template v-if="storageDone && storage">
        <div class="storage-layout">
          <div class="storage-card">
            <div class="storage-info">
              <div class="storage-item">
                <span class="storage-label">{{ t('data.storageCapacity') }}</span>
                <span class="storage-value">{{ formatSize(storage.capacity) }}</span>
              </div>
              <span class="storage-op">-</span>
              <div class="storage-item">
                <span class="storage-label">{{ t('data.storageUsed') }}</span>
                <span class="storage-value">{{ formatSize(storage.used) }}</span>
              </div>
              <span class="storage-op">=</span>
              <div class="storage-item">
                <span class="storage-label">{{ t('data.storageAvailable') }}</span>
                <span class="storage-value storage-value--free">{{ formatSize(storage.available) }}</span>
              </div>
            </div>
            <div class="storage-actions">
              <button class="storage-request" @click="openRequest">
                <SvgIcon name="plus" :size="16" />
              </button>
              <button class="storage-cleanup" :disabled="cleaning" @click="handleCleanup">
                <SvgIcon name="clean" :size="16" />
              </button>
              <button class="storage-refresh" :disabled="storageLoading" @click="fetchStorage">
                <SvgIcon name="refresh" :size="16" />
              </button>
            </div>
          </div>
          <div class="storage-chart">
            <svg class="storage-chart__ring" viewBox="0 0 120 120">
              <circle class="storage-chart__track" cx="60" cy="60" :r="ringRadius" />
              <circle
                  class="storage-chart__bar"
                  cx="60" cy="60"
                  :r="ringRadius"
                  :stroke="ringColor"
                  :stroke-dasharray="`${ringDash} ${ringCircumference}`"
              />
            </svg>
            <div class="storage-chart__center">
              <span class="storage-chart__percent">{{ usedPercent }}%</span>
              <span class="storage-chart__label">{{ t('data.storageUsed') }}</span>
            </div>
          </div>
        </div>
      </template>
    </section>

    <section class="section">
      <h3>{{ t('data.contentTab') }}</h3>
      <p class="data-management__desc">{{ t('data.contentDesc') }}</p>

      <router-link
        v-if="auth.user"
        :to="`/members/@${auth.user.username}`"
        class="btn btn--primary"
      >
        <SvgIcon name="user" :size="16" />
        {{ t('data.contentView') }}
      </router-link>
    </section>

    <section class="section">
      <h3>{{ t('data.musicTab') }}</h3>
      <p class="data-management__desc">{{ t('data.musicDesc') }}</p>
      <button class="btn btn--primary" @click="openMusicManage">
        <SvgIcon name="audio" :size="16" />
        {{ t('data.musicManage') }}
      </button>
    </section>

    <Transition name="modal">
      <div v-if="reqOpen" class="modal-overlay" @click.self="closeRequest">
        <div class="modal">
          <h3 class="modal__title">
            <span>{{ t('data.requestCapacityTitle') }}</span>
            <button class="modal__close" :title="t('common.close')" @click="closeRequest">
              <SvgIcon name="close" :size="16" />
            </button>
          </h3>
          <p class="modal__desc">{{ t('data.requestCapacityDesc') }}</p>
          <p v-if="reqError" class="msg msg--error">{{ reqError }}</p>
          <div class="request-form">
            <input v-model="reqValue" type="number" min="0" class="field__input" style="flex: 1; min-width: 0;" :placeholder="t('data.requestCapacityPlaceholder')" />
            <select v-model="reqUnit" class="field__input capacity-select">
              <option value="MB">MB</option>
              <option value="GB">GB</option>
              <option value="TB">TB</option>
            </select>
          </div>
          <div class="modal__actions">
            <button class="btn btn--primary btn--full" :disabled="reqSubmitting || isNaN(parseFloat(reqValue)) || parseFloat(reqValue) <= 0" @click="submitRequest">
              {{ reqSubmitting ? t('common.submitting') : t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="musicOpen" class="modal-overlay" @click.self="closeMusicManage">
        <div class="modal">
          <h3 class="modal__title">
            <span>{{ t('data.musicManageTitle') }}</span>
            <button class="modal__close" :title="t('common.close')" @click="closeMusicManage">
              <SvgIcon name="close" :size="16" />
            </button>
          </h3>
          <input ref="musicFileInput" type="file" accept="audio/*" multiple class="hidden-input" @change="handleMusicUpload" />
          <p v-if="musicMessage" class="msg msg--success">{{ musicMessage }}</p>
          <p v-if="musicError" class="msg msg--error">{{ musicError }}</p>
          <div class="music-list">
            <div v-if="musicLoading && !musicTracks.length" class="music-list__empty">{{ t('data.musicLoading') }}</div>
            <div v-else-if="!musicTracks.length" class="music-list__empty">{{ t('data.musicEmpty') }}</div>
            <div v-for="tr in musicTracks" :key="tr.id" class="music-item">
              <span class="music-item__name">{{ tr.fileName }}</span>
              <span class="music-item__size">{{ formatSize(tr.fileSize) }}</span>
              <span class="music-item__ops">
                <a class="music-item__download" :href="tr.url" :download="tr.fileName" :title="t('common.download')">
                  <SvgIcon name="download" :size="14" />
                </a>
                <button class="music-item__del" :disabled="musicDeleting === tr.id" :title="t('data.musicDelete')" @click="handleMusicDelete(tr)">
                  <SvgIcon name="trash" :size="14" />
                </button>
              </span>
            </div>
          </div>
          <div class="music-pager">
            <button class="music-pager__btn" :disabled="musicPage <= 1 || musicLoading" @click="fetchMusicList(musicPage - 1)">&#8249;</button>
            <span class="music-pager__info">{{ musicPage }} / {{ musicPages }}</span>
            <button class="music-pager__btn" :disabled="musicPage >= musicPages || musicLoading" @click="fetchMusicList(musicPage + 1)">&#8250;</button>
          </div>
          <div class="modal__actions">
            <span v-if="musicTotal" class="music-total">{{ t('data.musicTotal', { total: musicTotal }) }} · {{ t('data.musicPageSize', { size: musicSize }) }}</span>
            <button class="btn btn--primary btn--full" :disabled="musicUploading" @click="musicFileInput?.click()">
              <SvgIcon name="upload" />
              {{ musicUploading ? t('common.uploading') : t('data.musicUpload') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.data-management { padding-bottom: var(--spacing-4xl); }
.data-management .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.data-management .page-header__subtitle { font-size: var(--text-sm); }
.section { margin-bottom: var(--spacing-3xl); }
h3 { margin-bottom: var(--spacing-lg); }

.data-management__desc {
  font-size: var(--text-base);
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
}

.data-storage-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--spacing-lg);
}

.storage-layout { display: flex; align-items: center; gap: var(--spacing-xl); flex-wrap: wrap; }
.storage-cleanup {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}
.storage-cleanup:hover { color: var(--color-warning); border-color: var(--color-warning); background: var(--color-warning-bg); }
.storage-cleanup:disabled { opacity: 0.5; cursor: not-allowed; }
.storage-cleanup:disabled svg { animation: storage-spin 1s linear infinite; }
.storage-request {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}
.storage-request:hover { color: var(--color-success); border-color: var(--color-success); background: var(--color-success-bg); }
.storage-card { position: relative; flex: 1; min-width: 280px; display: flex; gap: var(--spacing-lg); padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); }
.storage-info { display: flex; gap: var(--spacing-lg); min-width: 0; flex-wrap: wrap; padding-right: 72px; }
.storage-actions { position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); display: flex; flex-direction: row; gap: var(--spacing-sm); }
.storage-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}
.storage-refresh:hover { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-bg); }
.storage-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.storage-refresh:disabled svg { animation: storage-spin 1s linear infinite; }
@keyframes storage-spin { to { transform: rotate(360deg); } }
.storage-item { display: flex; flex-direction: column; gap: var(--spacing-xxs); }
.storage-label { font-size: var(--text-xs); color: var(--color-text-secondary); }
.storage-value { font-weight: var(--weight-medium); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-heading); }
.storage-value--free { color: var(--color-primary, #4ade80); }
.storage-op { display: flex; align-items: flex-end; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }
.storage-chart { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
.storage-chart__ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.storage-chart__track { fill: none; stroke: var(--color-border); stroke-width: 10; }
.storage-chart__bar { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dasharray var(--transition-fast); }
.storage-chart__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.storage-chart__percent { font-family: var(--font-mono); font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text-heading); line-height: 1; }
.storage-chart__label { font-size: var(--text-xs); color: var(--color-text-secondary); }

.request-form { display: flex; gap: var(--spacing-sm); }
.capacity-select {
  width: 100px;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  padding: var(--spacing-sm) var(--spacing-2xl) var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: var(--color-text-heading);
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-sm) center;
}
.capacity-select:hover { border-color: var(--color-primary); }
.capacity-select option { font-family: var(--font-mono); }
.modal__desc { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-lg); }

@media (max-width: 640px) {
  .storage-card { gap: var(--spacing-sm); padding: var(--spacing-md); }
  .storage-layout { gap: var(--spacing-md); justify-content: center; }
}

/* ── Music manage modal ── */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); }
.modal { position: relative; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); max-width: 480px; width: 100%; padding: var(--spacing-2xl); max-height: 80vh; overflow-y: auto; }
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
.modal__actions { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-light); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: scale(0.95); }

.hidden-input { display: none; }
.music-total { font-size: var(--text-xs); color: var(--color-text-secondary); }
.music-list { display: flex; flex-direction: column; gap: var(--spacing-xs); max-height: 320px; overflow-y: auto; padding-right: var(--spacing-xs); }
.music-list::-webkit-scrollbar { width: 4px; }
.music-list::-webkit-scrollbar-thumb { background: var(--color-border); }
.music-list__empty { padding: var(--spacing-xl) 0; text-align: center; color: var(--color-text-tertiary); font-size: var(--text-sm); }
.music-item { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); background: var(--color-bg); border-radius: var(--rounded-md); }
.music-item__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); color: var(--color-text-heading); font-family: var(--font-mono); }
.music-item__size { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); flex-shrink: 0; }
.music-item__ops { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.music-item__download { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: var(--rounded-md); color: var(--color-text-secondary); flex-shrink: 0; transition: color var(--transition-fast), background var(--transition-fast); }
.music-item__download:hover { color: var(--color-success); background: var(--color-success-bg); }
.music-item__del { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: none; border-radius: var(--rounded-md); background: transparent; color: var(--color-text-secondary); cursor: pointer; flex-shrink: 0; transition: color var(--transition-fast), background var(--transition-fast); }
.music-item__del:hover { color: var(--color-danger); background: var(--color-danger-bg); }
.music-item__del:disabled { opacity: 0.5; cursor: not-allowed; }
.music-pager { display: flex; align-items: center; justify-content: space-between; margin-top: var(--spacing-lg); }
.music-pager__btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid var(--color-border); border-radius: var(--rounded-md); background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: var(--text-base); transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast); }
.music-pager__btn:hover { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-bg); }
.music-pager__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.music-pager__info { font-size: var(--text-xs); color: var(--color-text-secondary); font-family: var(--font-mono); }

@media (max-width: 640px) {
  .modal {
    padding: var(--spacing-lg);
    max-height: 92vh;
    display: flex;
    flex-direction: column;
  }
  .music-list {
    flex: 1;
    min-height: 0;
    max-height: none;
  }
}
</style>

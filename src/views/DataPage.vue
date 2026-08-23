<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { useError } from '@/composables/useError'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { storageAPI } from '@/api'
import SvgIcon from '@/components/SvgIcon.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { t } = useI18n()
const auth = useAuthStore()
const { getMessage } = useError()
const { toast } = useToast()
const { confirm } = useConfirm()

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

onMounted(() => {
  fetchStorage()
})

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
            <button class="storage-refresh" :disabled="storageLoading" @click="fetchStorage">
              <SvgIcon name="refresh" :size="16" />
            </button>
            <button class="storage-cleanup" :disabled="cleaning" @click="handleCleanup">
              <SvgIcon name="clean" :size="16" />
            </button>
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
  position: absolute;
  top: var(--spacing-sm);
  right: 40px;
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
.storage-card { position: relative; flex: 1; min-width: 280px; display: flex; gap: var(--spacing-lg); padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); }
.storage-refresh {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
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

@media (max-width: 640px) {
  .storage-card { gap: var(--spacing-sm); padding: var(--spacing-md); }
  .storage-layout { gap: var(--spacing-md); justify-content: center; }
}
</style>

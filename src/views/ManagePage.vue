<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConfirm } from '@/composables/useConfirm'
import { useError } from '@/composables/useError'
import { configAPI, userAPI, healthAPI, notificationAPI, logAPI } from '@/api'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const { t } = useI18n()
const { getMessage } = useError()
const { confirm } = useConfirm()

const configs = ref([])
const configMessage = ref('')
const configError = ref('')
const configLoading = ref(true)
const configDone = ref(false)
const disk = ref(null)
const toolMessage = ref('')
const toolError = ref('')
const cleaning = ref(false)
const logicCleanup = ref(false)
const resetUsername = ref('')
const resetPassword = ref('')
const resetting = ref(false)
const resetOpen = ref(false)

const broadcastContent = ref('')
const broadcasting = ref(false)
const broadcastOpen = ref(false)

function openBroadcast() {
  broadcastOpen.value = true
  broadcastContent.value = ''
}

function cancelBroadcast() {
  broadcastOpen.value = false
}

async function handleBroadcast() {
  if (!broadcastContent.value.trim()) return
  if (!await confirm(t('manage.broadcastConfirmTitle'))) return
  broadcasting.value = true
  try {
    await notificationAPI.broadcast(broadcastContent.value.trim())
    toolMessage.value = t('manage.broadcastSuccess')
    broadcastOpen.value = false
    setTimeout(() => toolMessage.value = '', 2000)
  } catch (err) {
    toolError.value = getMessage(err, 'manage.broadcastFailed')
  } finally {
    broadcasting.value = false
  }
}

const emailSubject = ref('')
const emailContent = ref('')
const emailForce = ref(false)
const emailBroadcasting = ref(false)
const emailOpen = ref(false)

function openEmailBroadcast() {
  emailOpen.value = true
  emailSubject.value = ''
  emailContent.value = ''
  emailForce.value = false
}

function cancelEmailBroadcast() {
  emailOpen.value = false
}

async function handleEmailBroadcast() {
  if (!emailSubject.value.trim() || !emailContent.value.trim()) return
  if (!await confirm(t('manage.emailBroadcastConfirm'))) return
  emailBroadcasting.value = true
  try {
    await notificationAPI.emailBroadcast(
        emailSubject.value.trim(),
        emailContent.value.trim(),
        emailForce.value
    )
    toolMessage.value = t('manage.emailBroadcastSuccess')
    emailOpen.value = false
    setTimeout(() => toolMessage.value = '', 2000)
  } catch (err) {
    toolError.value = getMessage(err, 'manage.emailBroadcastFailed')
  } finally {
    emailBroadcasting.value = false
  }
}

function openReset() {
  resetOpen.value = true
  resetUsername.value = ''
  resetPassword.value = ''
}

function cancelReset() {
  resetOpen.value = false
}

onMounted(async () => {
  try {
    const { data } = await configAPI.listAll()
    configs.value = data.data || []
  } catch (e) {
    if (e?.response?.status !== 401) configError.value = getMessage(e, 'manage.loadFailed')
  } finally {
    configLoading.value = false
  }
  await fetchDisk()
})

const diskLoading = ref(false)
const storageDone = ref(false)

async function fetchDisk() {
  diskLoading.value = true
  try {
    const res = await healthAPI.storageSpace()
    disk.value = res.data?.data || null
  } catch (e) {
    if (e?.response?.status !== 401) configError.value = getMessage(e, 'manage.storageFailed')
  } finally {
    diskLoading.value = false
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
  if (!disk.value || !disk.value.total) return 0
  return Math.round((disk.value.used / disk.value.total) * 100)
})
const ringDash = computed(() => (usedPercent.value / 100) * ringCircumference)
const ringColor = computed(() => usedPercent.value >= 90 ? 'var(--color-danger)' : 'var(--color-primary)')

async function saveConfig(config) {
  try {
    await configAPI.update(config.configKey, config.configValue)
    configMessage.value = t('manage.saved', { key: config.configKey })
    setTimeout(() => configMessage.value = '', 2000)
  } catch (err) {
    configError.value = getMessage(err, 'manage.saveFailed')
  }
}

function toggleBooleanConfig(config, enabled) {
  config.configValue = enabled ? 'true' : 'false'
  saveConfig(config)
}

async function runCleanup() {
  const confirmMsg = logicCleanup.value ? t('manage.deepCleanupConfirm') : t('manage.cleanupConfirm')
  if (!await confirm(confirmMsg)) return
  cleaning.value = true
  try {
    const res = await healthAPI.cleanupFiles(logicCleanup.value)
    const counts = res.data?.data ?? {}
    const parts = Object.entries(counts).map(([k, v]) => `${t(`manage.cleanupFile_${k}`)} ${v}`).join(', ')
    toolMessage.value = `${t('manage.cleanupSuccess')}：${parts || t('manage.cleanupNone')}`
    setTimeout(() => toolMessage.value = '', 4000)
  } catch (err) {
    toolError.value = getMessage(err, 'manage.cleanupFailed')
  } finally {
    cleaning.value = false
  }
}

const recordsCleaning = ref(false)

async function runRecordsCleanup() {
  if (!await confirm(t('manage.cleanupRecordsConfirm'))) return
  recordsCleaning.value = true
  try {
    const res = await healthAPI.cleanupRecords()
    const counts = res.data?.data ?? {}
    const parts = Object.entries(counts).map(([k, v]) => `${t(`manage.${k}`)} ${v}`).join(', ')
    toolMessage.value = `${t('manage.cleanupSuccess')}：${parts || t('manage.cleanupNone')}`
    setTimeout(() => toolMessage.value = '', 4000)
  } catch (err) {
    toolError.value = getMessage(err, 'manage.cleanupFailed')
  } finally {
    recordsCleaning.value = false
  }
}

async function handleReset() {
  if (!resetUsername.value.trim() || !resetPassword.value.trim()) return
  if (!await confirm(`${t('manage.resetPassword')}：${resetUsername.value.trim()}`)) return
  resetting.value = true
  try {
    await userAPI.changePasswordByForce(resetUsername.value.trim(), resetPassword.value)
    toolMessage.value = t('manage.resetSuccess')
    resetOpen.value = false
    setTimeout(() => toolMessage.value = '', 2000)
  } catch (err) {
    toolError.value = getMessage(err, 'manage.resetFailed')
  } finally {
    resetting.value = false
  }
}

const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR']
const logLevel = ref('INFO')
const logActive = ref(false)
const logSwitching = ref(false)
const logError = ref('')
const logEntries = ref([])
const logBodyEl = ref(null)
const logMax = 500
let stopLogStream = null
let autoScroll = true

function clearLogs() {
  logEntries.value = []
}

const logDownloading = ref(false)

async function downloadLog() {
  logDownloading.value = true
  try {
    await logAPI.downloadLog()
  } catch (err) {
    logError.value = getMessage(err, 'manage.logsDownloadFailed')
  } finally {
    logDownloading.value = false
  }
}

function onLogScroll() {
  const el = logBodyEl.value
  if (!el) return
  autoScroll = el.scrollTop + el.clientHeight >= el.scrollHeight - 30
}

function stopStream() {
  if (stopLogStream) { stopLogStream(); stopLogStream = null }
  logActive.value = false
}

async function toggleLogs() {
  if (logActive.value) { stopStream(); return }
  logError.value = ''
  logSwitching.value = true
  try {
    stopLogStream = logAPI.stream(logLevel.value, entry => {
      logEntries.value.push(entry)
      if (logEntries.value.length > logMax) logEntries.value.splice(0, logEntries.value.length - logMax)
      if (autoScroll) {
        nextTick(() => {
          const el = logBodyEl.value
          if (el) el.scrollTop = el.scrollHeight
        })
      }
    }, () => {
      stopStream()
      logError.value = t('manage.logsFailed')
    })
    logActive.value = true
  } finally {
    logSwitching.value = false
  }
}

onBeforeUnmount(stopStream)
</script>

<template>
  <div class="admin">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('personal.manageTab') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('manage.subtitle') }}</p>
    </div>

    <section class="section">
      <h3>{{ t('manage.storage') }}</h3>
      <LoadingSpinner :visible="diskLoading && !disk" @done="storageDone = true" />
      <div v-if="storageDone && disk" class="storage-layout">
        <div class="storage-card">
          <button class="storage-refresh" :disabled="diskLoading" @click="fetchDisk">
            <SvgIcon name="refresh" :size="16" />
          </button>
          <div class="storage-item">
            <span class="storage-label">{{ t('manage.storageTotal') }}</span>
            <span class="storage-value">{{ formatSize(disk.total) }}</span>
          </div>
          <span class="storage-op">-</span>
          <div class="storage-item">
            <span class="storage-label">{{ t('manage.storageUsed') }}</span>
            <span class="storage-value">{{ formatSize(disk.used) }}</span>
          </div>
          <span class="storage-op">=</span>
          <div class="storage-item">
            <span class="storage-label">{{ t('manage.storageFree') }}</span>
            <span class="storage-value storage-value--free">{{ formatSize(disk.free) }}</span>
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
            <span class="storage-chart__label">{{ t('manage.storageUsed') }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3>{{ t('manage.logs') }}</h3>
      <p v-if="logError" class="msg msg--error">{{ logError }}</p>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.logsDownload') }}</span>
          <span class="tool-desc">{{ t('manage.logsDownloadDesc') }}</span>
        </div>
        <button class="btn btn--primary-outline" :disabled="logDownloading" @click="downloadLog">
          <SvgIcon name="download" />
          {{ t('manage.logsDownload') }}
        </button>
      </div>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.logsLive') }}</span>
          <span class="tool-desc">{{ t('manage.logsLiveDesc') }}</span>
        </div>
        <select v-model="logLevel" :disabled="logActive" class="field__input log-select">
          <option v-for="l in logLevels" :key="l" :value="l">{{ l }}</option>
        </select>
        <button v-if="!logActive" class="btn btn--success" :disabled="logSwitching" @click="toggleLogs">
          <SvgIcon name="play" />
          {{ t('manage.logsStart') }}
        </button>
        <button v-else class="btn btn--danger" :disabled="logSwitching" @click="toggleLogs">
          <SvgIcon name="close" />
          {{ t('manage.logsStop') }}
        </button>
      </div>
      <div v-if="logActive || logEntries.length" class="log-viewer">
        <div class="log-viewer__head">
          <span class="log-status" :class="{ 'log-status--on': logActive }">
            {{ logActive ? t('manage.logsConnected') : t('manage.logsDisconnected') }}
          </span>
          <button class="btn btn--ghost" @click="clearLogs">
            <SvgIcon name="trash" />
            {{ t('manage.logsClear') }}
          </button>
        </div>
        <div class="log-viewer__body" ref="logBodyEl" @scroll="onLogScroll">
          <p v-if="!logEntries.length" class="log-empty">{{ t('manage.logsEmpty') }}</p>
          <div v-for="(entry, i) in logEntries" :key="i" class="log-line" :class="'log-line--' + entry.level.toLowerCase()">
            <span class="log-line__time">{{ entry.timestamp }}</span>
            <span class="log-line__level">{{ entry.level }}</span>
            <span class="log-line__logger">{{ entry.logger }}:</span>
            <span class="log-line__msg">{{ entry.message }}</span>
            <pre v-if="entry.stackTrace" class="log-line__stack">{{ entry.stackTrace }}</pre>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3>{{ t('manage.config') }}</h3>
      <p v-if="configMessage" class="msg msg--success">{{ configMessage }}</p>
      <p v-if="configError" class="msg msg--error">{{ configError }}</p>

      <LoadingSpinner :visible="configLoading" @done="configDone = true" />
      <div v-if="configDone" class="config-list">
        <div v-for="cfg in configs" :key="cfg.id" class="config-item">
          <div class="config-info">
            <span class="config-key">{{ cfg.configKey }}</span>
            <span class="config-desc">{{ cfg.description }}</span>
          </div>
          <div v-if="cfg.configValue === 'true' || cfg.configValue === 'false'" class="config-value-row">
            <ToggleSwitch
                :model-value="cfg.configValue === 'true'"
                @update:model-value="toggleBooleanConfig(cfg, $event)"
            />
          </div>
          <div v-else class="config-value-row">
            <input v-model="cfg.configValue" class="field__input config-input" />
            <button class="btn btn--primary" @click="saveConfig(cfg)">
              <SvgIcon name="save" />
              {{ t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h3>{{ t('manage.tools') }}</h3>
      <p v-if="toolMessage" class="msg msg--success">{{ toolMessage }}</p>
      <p v-if="toolError" class="msg msg--error">{{ toolError }}</p>
      <div class="tool-item" :class="{ 'tool-item--open': broadcastOpen }">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.broadcast') }}</span>
          <span class="tool-desc">{{ t('manage.broadcastDesc') }}</span>
          <div v-if="broadcastOpen" class="config-value-row reset-row">
            <input
                v-model="broadcastContent"
                class="field__input"
                :placeholder="t('manage.broadcastPlaceholder')"
                style="flex: 1; min-width: 0;"
            />
            <div class="reset-actions">
              <button class="btn btn--ghost" @click="cancelBroadcast">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary" :disabled="broadcasting || !broadcastContent.trim()" @click="handleBroadcast">
                <SvgIcon name="send" />
                {{ broadcasting ? t('common.posting') : t('manage.broadcastConfirm') }}
              </button>
            </div>
          </div>
        </div>
        <button v-if="!broadcastOpen" class="btn btn--primary-outline" @click="openBroadcast">
          <SvgIcon name="send" />
          {{ t('manage.broadcastSend') }}
        </button>
      </div>
      <div class="tool-item" :class="{ 'tool-item--open': emailOpen }">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.emailBroadcast') }}</span>
          <span class="tool-desc">{{ t('manage.emailBroadcastDesc') }}</span>
          <div v-if="emailOpen" class="email-broadcast-form">
            <input
                v-model="emailSubject"
                class="field__input"
                :placeholder="t('manage.emailBroadcastSubject')"
            />
            <textarea
                v-model="emailContent"
                class="field__input"
                :placeholder="t('manage.emailBroadcastContent')"
                rows="4"
            ></textarea>
            <div class="email-broadcast-row">
              <div class="toggle">
                <label class="toggle__switch">
                  <input type="checkbox" v-model="emailForce" />
                  <span class="toggle__slider"></span>
                </label>
                <span class="toggle__label">{{ t('manage.emailBroadcastForce') }}</span>
              </div>
              <div class="reset-actions">
                <button class="btn btn--ghost" @click="cancelEmailBroadcast">{{ t('common.cancel') }}</button>
                <button class="btn btn--primary" :disabled="emailBroadcasting || !emailSubject.trim() || !emailContent.trim()" @click="handleEmailBroadcast">
                  <SvgIcon name="mail" />
                  {{ emailBroadcasting ? t('common.posting') : t('manage.broadcastConfirm') }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <button v-if="!emailOpen" class="btn btn--primary-outline" @click="openEmailBroadcast">
          <SvgIcon name="mail" />
          {{ t('manage.broadcastSend') }}
        </button>
      </div>
      <div class="tool-item" :class="{ 'tool-item--open': resetOpen }">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.resetPassword') }}</span>
          <span class="tool-desc">{{ t('manage.resetPasswordDesc') }}</span>
          <div v-if="resetOpen" class="config-value-row reset-row">
            <div class="reset-inputs" style="flex: 1; min-width: 0;">
              <input v-model="resetUsername" class="field__input" style="flex: 1; min-width: 0;" :placeholder="t('manage.resetPasswordPlaceholder')" />
              <input v-model="resetPassword" type="password" class="field__input" style="flex: 1; min-width: 0;" :placeholder="t('manage.newPasswordPlaceholder')" />
            </div>
            <div class="reset-actions">
              <button class="btn btn--ghost" @click="cancelReset">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary" :disabled="resetting || !resetUsername.trim() || !resetPassword.trim()" @click="handleReset">
                <SvgIcon name="check" />
                {{ t('common.confirm') }}
              </button>
            </div>
          </div>
        </div>
        <button v-if="!resetOpen" class="btn btn--warning" @click="openReset">
          <SvgIcon name="lock" />
          {{ t('manage.reset') }}
        </button>
      </div>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.cleanupFiles') }}</span>
          <span class="tool-desc">{{ t('manage.cleanupFilesDesc') }}</span>
        </div>
        <div class="toggle">
          <label class="toggle__switch">
            <input type="checkbox" v-model="logicCleanup" />
            <span class="toggle__slider"></span>
          </label>
          <span class="toggle__label">{{ t('manage.logicCleanup') }}</span>
        </div>
        <button class="btn btn--danger" :disabled="cleaning" @click="runCleanup">
          <SvgIcon name="trash" />
          {{ cleaning ? t('common.cleaning') : t('manage.cleanup') }}
        </button>
      </div>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.cleanupRecords') }}</span>
          <span class="tool-desc">{{ t('manage.cleanupRecordsDesc') }}</span>
        </div>
        <button class="btn btn--danger" :disabled="recordsCleaning" @click="runRecordsCleanup">
          <SvgIcon name="trash" />
          {{ recordsCleaning ? t('common.cleaning') : t('manage.cleanup') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.admin .page-header__subtitle { font-size: var(--text-sm); }
.admin { padding-bottom: var(--spacing-4xl); }
.section { margin-bottom: var(--spacing-3xl); }
h2, h3 { margin-bottom: var(--spacing-lg); }

.config-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.storage-layout { display: flex; align-items: center; gap: var(--spacing-xl); flex-wrap: wrap; }
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
.storage-refresh:hover { color: var(--color-text-heading); border-color: var(--color-primary); background: var(--color-primary-bg); }
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
.config-item { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-lg); padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); }
.config-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; overflow: hidden; }
.config-key { font-weight: var(--weight-medium); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.config-desc { font-size: var(--text-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.config-value-row { display: flex; gap: var(--spacing-sm); align-items: center; flex-shrink: 0; }
.tool-item { display: flex; align-items: center; gap: var(--spacing-lg); padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); }
.tool-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.tool-item .btn { margin-left: auto; }
.tool-label { font-weight: var(--weight-medium); font-size: var(--text-sm); color: var(--color-text-heading); }
.tool-item + .tool-item { margin-top: var(--spacing-lg); }
.tool-desc { font-size: var(--text-xs); color: var(--color-text-secondary); }
.tool-item .btn { font-size: var(--text-sm); }
.tool-item .btn svg { width: 16px; height: 16px; }

.toggle { display: flex; align-items: center; gap: var(--spacing-sm); white-space: nowrap; }
.toggle__switch { cursor: pointer; display: flex; align-items: center; }
.toggle__switch input { display: none; }
.toggle__slider { position: relative; width: 44px; height: 24px; background: var(--color-border); border-radius: var(--rounded-full); transition: background var(--transition-fast); }
.toggle__slider::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: white; border-radius: var(--rounded-full); transition: transform var(--transition-fast); }
.toggle input:checked + .toggle__slider { background: #f0ad4e; }
.toggle input:checked + .toggle__slider::after { transform: translateX(20px); }
.toggle__label { font-size: var(--text-sm); color: var(--color-text-secondary); }

.btn--warning { border-color: #d97706; color: #d97706; background: transparent; }
.btn--warning:hover { background: #d97706; color: white; }

.tool-item--open { align-items: flex-start; }
.reset-row { justify-content: space-between; width: 100%; margin-top: var(--spacing-sm); }
.reset-inputs { display: flex; gap: var(--spacing-sm); }
.reset-actions { display: flex; gap: var(--spacing-sm); }
.config-input { width: 280px; }
@media (max-width: 640px) {
  .config-item { flex-direction: column; align-items: stretch; }
  .config-item .config-value-row { justify-content: flex-end; }
  .config-input { width: 100%; }
}
.config-info { flex: 1; min-width: 0; }

.email-broadcast-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  width: 100%;
  margin-top: var(--spacing-sm);
}

.email-broadcast-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.email-broadcast-form .field__input {
  width: 100%;
}

.log-select {
  width: 132px;
  flex-shrink: 0;
  appearance: none;
  -webkit-appearance: none;
  padding: var(--spacing-sm) var(--spacing-2xl) var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--spacing-sm) center;
}
.log-select:hover { border-color: var(--color-primary); }
.log-select:disabled { opacity: 0.5; cursor: not-allowed; }
.log-select option { font-family: var(--font-mono); }
.log-viewer { margin-top: var(--spacing-lg); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); overflow: hidden; background: var(--color-surface); }
.log-viewer__head { position: relative; display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-lg); }
.log-viewer__head::after { content: ''; position: absolute; left: var(--spacing-sm); right: var(--spacing-sm); bottom: 0; border-bottom: 1px solid var(--color-border); }
.log-status { font-size: var(--text-xs); color: var(--color-text-secondary); }
.log-viewer__head .btn { font-size: var(--text-xs); }
.log-status--on { color: var(--color-success); }
.log-viewer__body { max-height: 420px; overflow-y: auto; padding: var(--spacing-lg); font-family: var(--font-mono); font-size: var(--text-xs); line-height: 1.6; }
.log-empty { color: var(--color-text-secondary); padding: var(--spacing-md) 0; }
.log-line { display: flex; flex-wrap: wrap; gap: 0 var(--spacing-sm); white-space: pre-wrap; word-break: break-all; }
.log-line__time { color: var(--color-text-secondary); flex-shrink: 0; }
.log-line__level { flex-shrink: 0; width: 5ch; font-weight: var(--weight-semibold); }
.log-line__logger { color: var(--color-text-secondary); flex-shrink: 0; min-width: 0; }
.log-line__msg { color: var(--color-text-heading); min-width: 0; }
.log-line--error .log-line__level, .log-line--error .log-line__msg { color: var(--color-danger); }
.log-line--warn .log-line__level, .log-line--warn .log-line__msg { color: var(--color-warning); }
.log-line--info .log-line__level, .log-line--info .log-line__msg { color: var(--color-success); }
.log-line--debug .log-line__level, .log-line--trace .log-line__level { color: var(--color-text-secondary); }
.log-line__stack { flex-basis: 100%; color: var(--color-danger); background: var(--color-bg); padding: var(--spacing-sm); border-radius: var(--rounded-md); font-family: var(--font-mono); font-size: var(--text-xs); overflow-x: auto; }
</style>

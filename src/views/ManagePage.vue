<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConfirm } from '@/composables/useConfirm'
import { useError } from '@/composables/useError'
import { useToast } from '@/composables/useToast'
import { configAPI, userAPI, storageAPI, notificationAPI, logAPI, musicAPI } from '@/api'
import { useConfig } from '@/composables/useConfig'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const { t } = useI18n()
const { getMessage } = useError()
const { confirm } = useConfirm()
const { toast } = useToast()
const { load: loadConfig, get: getConfig } = useConfig()

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

const capacityOpen = ref(false)
const capacityUsername = ref('')
const capacityValue = ref('')
const capacityUnit = ref('GB')
const capacityUpdating = ref(false)

const CAPACITY_UNITS = { MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 }

function openCapacity() {
  capacityOpen.value = true
  capacityUsername.value = ''
  capacityValue.value = ''
  capacityUnit.value = 'GB'
}

function cancelCapacity() {
  capacityOpen.value = false
}

async function handleCapacity() {
  const username = capacityUsername.value.trim()
  const val = parseFloat(capacityValue.value)
  if (!username || isNaN(val) || val < 0) return
  if (!await confirm(t('manage.capacityConfirm'))) return
  capacityUpdating.value = true
  try {
    const bytes = Math.round(val * CAPACITY_UNITS[capacityUnit.value])
    await storageAPI.updateCapacity(username, bytes)
    toolMessage.value = t('manage.capacitySuccess')
    capacityOpen.value = false
    setTimeout(() => toolMessage.value = '', 2000)
  } catch (err) {
    toolError.value = getMessage(err, 'manage.capacityFailed')
  } finally {
    capacityUpdating.value = false
  }
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
  await loadConfig()
  musicSize.value = parseInt(getConfig('page_size', '10'))
  await fetchDisk()
})

const diskLoading = ref(false)
const storageDone = ref(false)

async function fetchDisk() {
  diskLoading.value = true
  try {
    const res = await storageAPI.storageSpace()
    disk.value = res.data?.data || null
  } catch (e) {
    if (e?.response?.status !== 401) configError.value = getMessage(e, 'manage.storageFailed')
  } finally {
    diskLoading.value = false
  }
}

const cacheCleaning = ref(false)

async function handleClearCache() {
  if (!await confirm(t('manage.cacheCleanupConfirm'))) return
  cacheCleaning.value = true
  try {
    const res = await storageAPI.clearCache()
    const count = res.data?.data ?? 0
    toast(t('manage.cacheCleanupDone', { count }), count > 0 ? 'success' : 'info')
    fetchDisk()
  } catch (err) {
    toast(getMessage(err, 'manage.cacheCleanupFailed'), 'error')
  } finally {
    cacheCleaning.value = false
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
const freePercent = computed(() => {
  if (!disk.value || !disk.value.total) return 0
  return Math.round((disk.value.free / disk.value.total) * 100)
})
const ringSegments = computed(() => {
  if (!disk.value || !disk.value.total) return []
  const total = disk.value.total
  const minDash = ringCircumference * 0.01
  const parts = [
    { key: 'used', color: 'var(--color-primary)' },
    { key: 'cache', color: 'var(--color-warning)' },
    { key: 'other', color: 'var(--color-text-tertiary)' },
  ]
  const segments = parts
    .map(part => {
      const ratio = Math.max(0, Math.min((disk.value[part.key] || 0) / total, 1))
      let dash = ratio * ringCircumference
      if (dash > 0) dash = Math.max(dash, minDash)
      return { color: part.color, dash, offset: 0 }
    })
    .filter(seg => seg.dash > 0)
  const sum = segments.reduce((acc, seg) => acc + seg.dash, 0)
  if (sum > ringCircumference) {
    const scale = ringCircumference / sum
    for (const seg of segments) seg.dash *= scale
  }
  let offset = 0
  for (const seg of segments) {
    seg.offset = offset
    offset += seg.dash
  }
  return segments
})

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
    const res = await storageAPI.cleanupFiles(logicCleanup.value)
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
    const res = await storageAPI.cleanupRecords()
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
    const res = await musicAPI.list(pageNum, musicSize.value)
    const data = res.data?.data || {}
    musicTracks.value = data.records || []
    musicPages.value = data.pages || 1
    musicTotal.value = data.total || 0
    musicPage.value = pageNum
  } catch (err) {
    musicError.value = getMessage(err, 'manage.musicLoadFailed')
  } finally {
    musicLoading.value = false
  }
}

async function handleMusicUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  musicUploading.value = true
  musicError.value = ''
  try {
    await musicAPI.upload(file, true)
    musicMessage.value = t('manage.musicUploadDone')
    setTimeout(() => musicMessage.value = '', 2000)
    fetchMusicList(musicPage.value)
  } catch (err) {
    musicError.value = getMessage(err, 'manage.musicUploadFailed')
  } finally {
    musicUploading.value = false
    e.target.value = ''
  }
}

async function handleMusicDelete(track) {
  if (!await confirm(t('manage.musicDeleteConfirm', { name: track.fileName }))) return
  musicDeleting.value = track.id
  musicError.value = ''
  try {
    await musicAPI.remove(track.id)
    musicMessage.value = t('manage.musicDeleteDone')
    setTimeout(() => musicMessage.value = '', 2000)
    fetchMusicList(musicPage.value)
  } catch (err) {
    musicError.value = getMessage(err, 'manage.musicDeleteFailed')
  } finally {
    musicDeleting.value = null
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
    logError.value = getMessage(err, 'manage.logDownloadFailed')
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
      logError.value = t('manage.logFailed')
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
      <h3>{{ t('manage.log') }}</h3>
      <p v-if="logError" class="msg msg--error">{{ logError }}</p>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.logDownload') }}</span>
          <span class="tool-desc">{{ t('manage.logDownloadDesc') }}</span>
        </div>
        <button class="btn btn--primary-outline" :disabled="logDownloading" @click="downloadLog">
          <SvgIcon name="download" />
          {{ t('manage.logDownload') }}
        </button>
      </div>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.logLive') }}</span>
          <span class="tool-desc">{{ t('manage.logLiveDesc') }}</span>
        </div>
        <select v-model="logLevel" :disabled="logActive" class="field__input log-select">
          <option v-for="l in logLevels" :key="l" :value="l">{{ l }}</option>
        </select>
        <button v-if="!logActive" class="btn btn--success" :disabled="logSwitching" @click="toggleLogs">
          <SvgIcon name="play" />
          {{ t('manage.logStart') }}
        </button>
        <button v-else class="btn btn--danger" :disabled="logSwitching" @click="toggleLogs">
          <SvgIcon name="close" />
          {{ t('manage.logStop') }}
        </button>
      </div>
      <div v-if="logActive || logEntries.length" class="log-viewer">
        <div class="log-viewer__head">
          <span class="log-status" :class="{ 'log-status--on': logActive }">
            {{ logActive ? t('manage.logConnected') : t('manage.logDisconnected') }}
          </span>
          <button class="btn btn--ghost" @click="clearLogs">
            <SvgIcon name="trash" />
            {{ t('manage.logClear') }}
          </button>
        </div>
        <div class="log-viewer__body" ref="logBodyEl" @scroll="onLogScroll">
          <p v-if="!logEntries.length" class="log-empty">{{ t('manage.logEmpty') }}</p>
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
      <h3>{{ t('manage.storage') }}</h3>
      <LoadingSpinner :visible="diskLoading && !disk" @done="storageDone = true" />
      <div v-if="storageDone && disk" class="storage-layout">
        <div class="storage-card">
          <div class="storage-info">
            <div class="storage-item">
              <span class="storage-label">{{ t('manage.storageTotal') }}</span>
              <span class="storage-value">{{ formatSize(disk.total) }}</span>
            </div>
            <span class="storage-op">-</span>
            <div class="storage-item">
              <span class="storage-label">{{ t('manage.storageUsed') }}</span>
              <span class="storage-value">{{ formatSize(disk.used) }}</span>
            </div>
            <span class="storage-op">-</span>
            <div class="storage-item">
              <span class="storage-label">{{ t('manage.storageCache') }}</span>
              <span class="storage-value">{{ formatSize(disk.cache) }}</span>
            </div>
            <span class="storage-op">-</span>
            <div class="storage-item">
              <span class="storage-label">{{ t('manage.storageOther') }}</span>
              <span class="storage-value">{{ formatSize(disk.other) }}</span>
            </div>
            <span class="storage-op">=</span>
            <div class="storage-item">
              <span class="storage-label">{{ t('manage.storageFree') }}</span>
              <span class="storage-value storage-value--free">{{ formatSize(disk.free) }}</span>
            </div>
          </div>
          <div class="storage-actions">
            <button class="storage-cache-cleanup" :disabled="cacheCleaning" @click="handleClearCache">
              <SvgIcon name="trash" :size="16" />
            </button>
            <button class="storage-refresh" :disabled="diskLoading" @click="fetchDisk">
              <SvgIcon name="refresh" :size="16" />
            </button>
          </div>
        </div>
        <div class="storage-chart">
          <svg class="storage-chart__ring" viewBox="0 0 120 120">
            <circle class="storage-chart__track" cx="60" cy="60" :r="ringRadius" />
            <circle
                v-for="seg in ringSegments.slice().reverse()"
                :key="seg.color"
                class="storage-chart__segment"
                cx="60" cy="60"
                :r="ringRadius"
                :stroke="seg.color"
                :stroke-dasharray="`${seg.dash} ${ringCircumference}`"
                :stroke-dashoffset="-seg.offset"
            />
          </svg>
          <div class="storage-chart__center">
            <span class="storage-chart__percent">{{ freePercent }}%</span>
            <span class="storage-chart__label">{{ t('manage.storageFree') }}</span>
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
      <h3>{{ t('manage.tool') }}</h3>
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
      <div class="tool-item" :class="{ 'tool-item--open': capacityOpen }">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.capacity') }}</span>
          <span class="tool-desc">{{ t('manage.capacityDesc') }}</span>
          <div v-if="capacityOpen" class="config-value-row reset-row">
            <div class="reset-inputs" style="flex: 1; min-width: 0;">
              <input v-model="capacityUsername" class="field__input" style="flex: 1; min-width: 0;" :placeholder="t('manage.capacityUsernamePlaceholder')" />
              <input v-model="capacityValue" type="number" min="0" class="field__input" style="flex: 1; min-width: 0;" :placeholder="t('manage.capacityValuePlaceholder')" />
              <select v-model="capacityUnit" class="field__input capacity-select">
                <option value="MB">MB</option>
                <option value="GB">GB</option>
                <option value="TB">TB</option>
              </select>
            </div>
            <div class="reset-actions">
              <button class="btn btn--ghost" @click="cancelCapacity">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary" :disabled="capacityUpdating || !capacityUsername.trim() || isNaN(parseFloat(capacityValue)) || parseFloat(capacityValue) < 0" @click="handleCapacity">
                <SvgIcon name="check" />
                {{ capacityUpdating ? t('common.saving') : t('common.confirm') }}
              </button>
            </div>
          </div>
        </div>
        <button v-if="!capacityOpen" class="btn btn--warning" @click="openCapacity">
          <SvgIcon name="settings" />
          {{ t('manage.capacityUpdate') }}
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
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('manage.music') }}</span>
          <span class="tool-desc">{{ t('manage.musicDesc') }}</span>
        </div>
        <button class="btn btn--music" @click="openMusicManage">
          <SvgIcon name="audio" />
          {{ t('manage.musicManage') }}
        </button>
      </div>
    </section>

    <Transition name="modal">
      <div v-if="musicOpen" class="modal-overlay" @click.self="closeMusicManage">
        <div class="modal">
          <h3 class="modal__title">
            <span>{{ t('manage.musicManageTitle') }}</span>
            <button class="modal__close" :title="t('common.close')" @click="closeMusicManage">
              <SvgIcon name="close" :size="16" />
            </button>
          </h3>
          <input ref="musicFileInput" type="file" accept="audio/*" class="hidden-input" @change="handleMusicUpload" />
          <p v-if="musicMessage" class="msg msg--success">{{ musicMessage }}</p>
          <p v-if="musicError" class="msg msg--error">{{ musicError }}</p>
          <div class="music-list">
            <div v-if="musicLoading && !musicTracks.length" class="music-list__empty">{{ t('manage.musicLoading') }}</div>
            <div v-else-if="!musicTracks.length" class="music-list__empty">{{ t('manage.musicEmpty') }}</div>
            <div v-for="tr in musicTracks" :key="tr.id" class="music-item">
              <span class="music-item__name">{{ tr.fileName }}</span>
              <span class="music-item__size">{{ formatSize(tr.fileSize) }}</span>
              <span class="music-item__ops">
                <a class="music-item__download" :href="tr.url" :download="tr.fileName" :title="t('common.download')">
                  <SvgIcon name="download" :size="14" />
                </a>
                <button class="music-item__del" :disabled="musicDeleting === tr.id" :title="t('manage.musicDelete')" @click="handleMusicDelete(tr)">
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
            <span v-if="musicTotal" class="music-total">{{ t('manage.musicTotal', { total: musicTotal }) }} · {{ t('manage.musicPageSize', { size: musicSize }) }}</span>
            <button class="btn btn--primary btn--full" :disabled="musicUploading" @click="musicFileInput?.click()">
              <SvgIcon name="upload" />
              {{ musicUploading ? t('common.uploading') : t('manage.musicUpload') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.admin .page-header__subtitle { font-size: var(--text-sm); }
.admin { padding-bottom: var(--spacing-4xl); }
.section { margin-bottom: var(--spacing-3xl); }
h3 { margin-bottom: var(--spacing-lg); }

.config-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.storage-layout { display: flex; align-items: center; gap: var(--spacing-xl); flex-wrap: wrap; }
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
.storage-cache-cleanup {
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
.storage-cache-cleanup:hover { color: var(--color-danger); border-color: var(--color-danger); background: var(--color-danger-bg); }
.storage-cache-cleanup:disabled { opacity: 0.5; cursor: not-allowed; }
.storage-cache-cleanup:disabled svg { animation: storage-spin 1s linear infinite; }
@keyframes storage-spin { to { transform: rotate(360deg); } }
.storage-item { display: flex; flex-direction: column; gap: var(--spacing-xxs); }
.storage-label { font-size: var(--text-xs); color: var(--color-text-secondary); }
.storage-value { font-weight: var(--weight-medium); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-heading); }
.storage-value--free { color: var(--color-primary, #4ade80); }
.storage-op { display: flex; align-items: flex-end; font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }
.storage-chart { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
.storage-chart__ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.storage-chart__track { fill: none; stroke: var(--color-border); stroke-width: 10; }
.storage-chart__segment { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dasharray var(--transition-fast), stroke-dashoffset var(--transition-fast); }
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
.log-viewer__body { max-height: 420px; overflow-y: auto; padding: var(--spacing-lg); border-right: 4px solid transparent; font-family: var(--font-mono); font-size: var(--text-xs); line-height: 1.6; }
.log-viewer__body::-webkit-scrollbar { width: 4px; }
.log-viewer__body::-webkit-scrollbar-track { margin: 6px 0; }
.log-viewer__body::-webkit-scrollbar-thumb { background: var(--color-border); }
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

/* ── Music manage modal ── */
.btn--music {
  border-color: #6d28d9;
  color: #6d28d9;
  background: transparent;
}
.btn--music:hover {
  background: #6d28d9;
  color: white;
}
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
    padding: var(--spacing-2xl);
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

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { configAPI, fileAPI, userAPI, healthAPI, notificationAPI } from '@/api'

const { t } = useI18n()
const { getMessage } = useError()

const configs = ref([])
const configMessage = ref('')
const configError = ref('')
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
  if (!confirm(t('admin.broadcastConfirmTitle'))) return
  broadcasting.value = true
  try {
    await notificationAPI.broadcast(broadcastContent.value.trim())
    toolMessage.value = t('admin.broadcastSuccess')
    broadcastOpen.value = false
    setTimeout(() => toolMessage.value = '', 2000)
  } catch (err) {
    toolError.value = getMessage(err, 'admin.broadcastFailed')
  } finally {
    broadcasting.value = false
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
    configError.value = t('admin.loadFailed')
  }
})

async function saveConfig(config) {
  try {
    await configAPI.update(config.configKey, config.configValue)
    configMessage.value = t('admin.saved', { key: config.configKey })
    setTimeout(() => configMessage.value = '', 2000)
  } catch (err) {
    configError.value = getMessage(err, 'admin.saveFailed')
  }
}

async function runCleanup() {
  const confirmMsg = logicCleanup.value ? t('admin.deepCleanupConfirm') : t('admin.cleanupConfirm')
  if (!confirm(confirmMsg)) return
  cleaning.value = true
  try {
    const res = await fileAPI.cleanup(logicCleanup.value)
    const counts = res.data?.data ?? {}
    const parts = Object.entries(counts).map(([k, v]) => `${t(`admin.cleanupFile_${k}`)} ${v}`).join(', ')
    toolMessage.value = `${t('admin.cleanupSuccess')}：${parts || t('admin.cleanupNone')}`
    setTimeout(() => toolMessage.value = '', 4000)
  } catch (err) {
    toolError.value = getMessage(err, 'admin.cleanupFailed')
  } finally {
    cleaning.value = false
  }
}

const recordsCleaning = ref(false)

async function runRecordsCleanup() {
  if (!confirm(t('admin.cleanupRecordsConfirm'))) return
  recordsCleaning.value = true
  try {
    const res = await healthAPI.cleanupRecords()
    const counts = res.data?.data ?? {}
    const parts = Object.entries(counts).map(([k, v]) => `${t(`admin.${k}`)} ${v}`).join(', ')
    toolMessage.value = `${t('admin.cleanupSuccess')}：${parts || t('admin.cleanupNone')}`
    setTimeout(() => toolMessage.value = '', 4000)
  } catch (err) {
    toolError.value = getMessage(err, 'admin.cleanupFailed')
  } finally {
    recordsCleaning.value = false
  }
}

async function handleReset() {
  if (!resetUsername.value.trim() || !resetPassword.value.trim()) return
  if (!confirm(`${t('admin.resetPassword')}：${resetUsername.value.trim()}`)) return
  resetting.value = true
  try {
    await userAPI.resetPassword(resetUsername.value.trim(), resetPassword.value)
    toolMessage.value = t('admin.resetSuccess')
    resetOpen.value = false
    setTimeout(() => toolMessage.value = '', 2000)
  } catch (err) {
    toolError.value = getMessage(err, 'admin.resetFailed')
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div class="admin container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('admin.title') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('admin.subtitle') }}</p>
    </div>

    <section class="section">
      <h2>{{ t('admin.config') }}</h2>
      <p v-if="configMessage" class="msg msg--success">{{ configMessage }}</p>
      <p v-if="configError" class="msg msg--error">{{ configError }}</p>

      <div class="config-list">
        <div v-for="cfg in configs" :key="cfg.id" class="config-item">
          <div class="config-info">
            <span class="config-key">{{ cfg.configKey }}</span>
            <span class="config-desc">{{ cfg.description }}</span>
          </div>
          <div class="config-value-row">
            <input v-model="cfg.configValue" class="field__input config-input" />
            <button class="btn btn--primary" @click="saveConfig(cfg)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {{ t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>{{ t('admin.tools') }}</h2>
      <p v-if="toolMessage" class="msg msg--success">{{ toolMessage }}</p>
      <p v-if="toolError" class="msg msg--error">{{ toolError }}</p>
      <div class="tool-item" :class="{ 'tool-item--open': broadcastOpen }">
        <div class="tool-info">
          <span class="tool-label">{{ t('admin.broadcast') }}</span>
          <span class="tool-desc">{{ t('admin.broadcastDesc') }}</span>
          <div v-if="broadcastOpen" class="config-value-row reset-row">
            <input
              v-model="broadcastContent"
              class="field__input"
              :placeholder="t('admin.broadcastPlaceholder')"
              style="flex: 1; min-width: 0;"
            />
            <div class="reset-actions">
              <button class="btn btn--ghost" @click="cancelBroadcast">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary" :disabled="broadcasting || !broadcastContent.trim()" @click="handleBroadcast">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                {{ broadcasting ? t('common.posting') : t('admin.broadcastConfirm') }}
              </button>
            </div>
          </div>
        </div>
        <button v-if="!broadcastOpen" class="btn btn--primary-outline" @click="openBroadcast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          {{ t('admin.broadcastSend') }}
        </button>
      </div>
      <div class="tool-item" :class="{ 'tool-item--open': resetOpen }">
        <div class="tool-info">
          <span class="tool-label">{{ t('admin.resetPassword') }}</span>
          <span class="tool-desc">{{ t('admin.resetPasswordDesc') }}</span>
          <div v-if="resetOpen" class="config-value-row reset-row">
            <div class="reset-inputs" style="flex: 1; min-width: 0;">
              <input v-model="resetUsername" class="field__input" style="flex: 1; min-width: 0;" :placeholder="t('admin.resetPasswordPlaceholder')" />
              <input v-model="resetPassword" type="password" class="field__input" style="flex: 1; min-width: 0;" :placeholder="t('admin.newPasswordPlaceholder')" />
            </div>
            <div class="reset-actions">
              <button class="btn btn--ghost" @click="cancelReset">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary" :disabled="resetting || !resetUsername.trim() || !resetPassword.trim()" @click="handleReset">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ t('common.confirm') }}
              </button>
            </div>
          </div>
        </div>
        <button v-if="!resetOpen" class="btn btn--warning" @click="openReset">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          {{ t('admin.reset') }}
        </button>
      </div>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('admin.cleanupFiles') }}</span>
          <span class="tool-desc">{{ t('admin.cleanupFilesDesc') }}</span>
        </div>
        <div class="toggle">
          <label class="toggle__switch">
            <input type="checkbox" v-model="logicCleanup" />
            <span class="toggle__slider"></span>
          </label>
          <span class="toggle__label">{{ t('admin.logicCleanup') }}</span>
        </div>
        <button class="btn btn--danger" :disabled="cleaning" @click="runCleanup">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          {{ cleaning ? t('common.cleaning') : t('admin.cleanup') }}
        </button>
      </div>
      <div class="tool-item">
        <div class="tool-info">
          <span class="tool-label">{{ t('admin.cleanupRecords') }}</span>
          <span class="tool-desc">{{ t('admin.cleanupRecordsDesc') }}</span>
        </div>
        <button class="btn btn--danger" :disabled="recordsCleaning" @click="runRecordsCleanup">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          {{ recordsCleaning ? t('common.cleaning') : t('admin.cleanup') }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin { padding-bottom: var(--spacing-4xl); }
.section { margin-bottom: var(--spacing-3xl); }
h2 { margin-bottom: var(--spacing-lg); }

.config-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
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
.toggle input:checked + .toggle__slider { background: var(--color-orange, #f0ad4e); }
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
  .config-input { width: 100%; }
}
.config-info { flex: 1; min-width: 0; }

</style>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { configAPI, fileAPI } from '@/api'

const { t } = useI18n()
const { getMessage } = useError()

const configs = ref([])
const configMessage = ref('')
const configError = ref('')
const toolMessage = ref('')
const toolError = ref('')
const cleaning = ref(false)
const logicCleanup = ref(false)

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
    await fileAPI.cleanup(logicCleanup.value)
    toolMessage.value = t('admin.cleanupSuccess')
    setTimeout(() => toolMessage.value = '', 2000)
  } catch (err) {
    toolError.value = getMessage(err, 'admin.cleanupFailed')
  } finally {
    cleaning.value = false
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

.config-input { width: 280px; }
@media (max-width: 640px) {
  .config-item { flex-direction: column; align-items: stretch; }
  .config-input { width: 100%; }
}
.config-info { flex: 1; min-width: 0; }

</style>

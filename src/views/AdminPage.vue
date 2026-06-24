<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { adminAPI, siteConfigAPI } from '@/api'

const { t } = useI18n()

const configs = ref([])
const message = ref('')
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await adminAPI.getConfigs()
    configs.value = data.data || []
  } catch (e) {
    error.value = t('admin.loadFailed')
  }
})

async function saveConfig(config) {
  try {
    await adminAPI.updateConfig(config.configKey, config.configValue)
    message.value = `Saved: ${config.configKey}`
    setTimeout(() => message.value = '', 2000)
  } catch (err) {
    error.value = err.response?.data?.message || t('admin.saveFailed')
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
      <h2>{{ t('admin.siteConfig') }}</h2>
      <p v-if="message" class="msg msg--success">{{ message }}</p>
      <p v-if="error" class="msg msg--error">{{ error }}</p>

      <div class="config-list">
        <div v-for="cfg in configs" :key="cfg.id" class="config-item">
          <div class="config-info">
            <span class="config-key">{{ cfg.configKey }}</span>
            <span class="config-desc">{{ cfg.description }}</span>
          </div>
          <div class="config-value-row">
            <input v-model="cfg.configValue" class="field__input" style="width:250px" />
            <button class="btn btn--primary" @click="saveConfig(cfg)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {{ t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin { padding-bottom: var(--spacing-4xl); }
.section { margin-bottom: var(--spacing-3xl); }
h2 { margin-bottom: var(--spacing-lg); }

.config-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.config-item { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-lg); padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); flex-wrap: wrap; }
.config-info { display: flex; flex-direction: column; gap: 2px; }
.config-key { font-weight: var(--weight-medium); font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-heading); }
.config-desc { font-size: var(--text-xs); color: var(--color-text-secondary); }
.config-value-row { display: flex; gap: var(--spacing-sm); align-items: center; }

</style>

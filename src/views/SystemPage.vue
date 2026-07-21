<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { userAPI } from '@/api'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const { t } = useI18n()
const { handle } = useError()

const loading = ref(true)
const loadingDone = ref(false)
const saving = ref(false)
const receiveEmail = ref(false)
const receiveEmailSys = ref(false)
const receiveEmailRepoAccess = ref(true)

onMounted(async () => {
  try {
    const { data } = await userAPI.getUserConfig()
    if (data.code === 200) {
      receiveEmail.value = data.data.receiveEmail
      receiveEmailSys.value = data.data.receiveEmailSys
      receiveEmailRepoAccess.value = data.data.receiveEmailRepoAccess
    }
  } catch (e) {
    handle(e, 'system.loadFailed')
  } finally {
    loading.value = false
  }
})

async function saveConfig(partial) {
  saving.value = true
  const payload = {
    receiveEmail: receiveEmail.value,
    receiveEmailSys: receiveEmailSys.value,
    receiveEmailRepoAccess: receiveEmailRepoAccess.value,
    ...partial
  }
  try {
    await userAPI.updateUserConfig(payload)
    receiveEmail.value = payload.receiveEmail
    receiveEmailSys.value = payload.receiveEmailSys
    receiveEmailRepoAccess.value = payload.receiveEmailRepoAccess
  } catch (e) {
    handle(e, 'system.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="system">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('system.pageTitle') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('system.subtitle') }}</p>
    </div>

    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone">
      <div class="system__list">
        <div class="system__item">
          <div class="system__info">
            <span class="system__label">{{ t('system.receiveEmail') }}</span>
            <span class="system__desc">{{ t('system.receiveEmailDesc') }}</span>
          </div>
          <ToggleSwitch
            :model-value="receiveEmail"
            :disabled="saving"
            @update:model-value="saveConfig({ receiveEmail: $event })"
          />
        </div>
        <div v-if="receiveEmail" class="system__sub">
          <div class="system__item">
            <div class="system__info">
              <span class="system__label">{{ t('system.receiveEmailSys') }}</span>
              <span class="system__desc">{{ t('system.receiveEmailSysDesc') }}</span>
            </div>
            <ToggleSwitch
              :model-value="receiveEmailSys"
              :disabled="saving"
              @update:model-value="saveConfig({ receiveEmailSys: $event })"
            />
          </div>
          <div class="system__item">
            <div class="system__info">
              <span class="system__label">{{ t('system.receiveEmailRepoAccess') }}</span>
              <span class="system__desc">{{ t('system.receiveEmailRepoAccessDesc') }}</span>
            </div>
            <ToggleSwitch
              :model-value="receiveEmailRepoAccess"
              :disabled="saving"
              @update:model-value="saveConfig({ receiveEmailRepoAccess: $event })"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.system .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.system .page-header__subtitle { font-size: var(--text-sm); }
.system { padding-bottom: var(--spacing-4xl); }
.system__list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.system__sub { display: flex; flex-direction: column; gap: var(--spacing-lg); padding-left: var(--spacing-xl); border-left: 2px solid var(--color-border); }
.system__item { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-lg); padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); }
.system__info { display: flex; flex-direction: column; gap: 2px; }
.system__label { font-weight: var(--weight-medium); font-size: var(--text-sm); color: var(--color-text-heading); }
.system__desc { font-size: var(--text-xs); color: var(--color-text-secondary); }
</style>

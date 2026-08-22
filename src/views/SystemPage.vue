<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { siteName } from '@/composables/useConfig'
import { healthAPI } from '@/api'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { t } = useI18n()

const developer = 'Zincoid'
const buildVersion = document.querySelector('meta[name="version"]')?.content || '-'
const buildBuild = document.querySelector('meta[name="build"]')?.content || ''
const buildTime = formatMetaTime(document.querySelector('meta[name="time"]')?.content)
const backendVersion = ref('-')
const backendBuild = ref('')
const backendTime = ref('')
const loading = ref(false)
const done = ref(false)

const now = ref(new Date())
let timer = null

function tick() {
  now.value = new Date()
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
  fetchBackendVersion()
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

function formatMetaTime(raw) {
  if (!raw) return '-'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return '-'
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function fetchBackendVersion() {
  loading.value = true
  try {
    const { data } = await healthAPI.version()
    const info = data?.data
    if (info) {
      backendVersion.value = info.version || '-'
      backendBuild.value = info.build || ''
      if (info.time) {
        const d = new Date(info.time)
        if (!isNaN(d.getTime())) {
          const pad = n => String(n).padStart(2, '0')
          backendTime.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        }
      }
    }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

const timeText = computed(() => {
  const d = now.value
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})
</script>

<template>
  <div class="system-info">
    <div class="page-header">
      <h2 class="page-header__title">## {{ t('system.pageTitle') }}<span class="cursor">_</span></h2>
      <p class="page-header__subtitle">{{ t('system.subtitle') }}</p>
    </div>

    <LoadingSpinner :visible="loading" @done="done = true" />
    <template v-if="done">
      <div class="system-info__card">
      <div class="system-info__hero">
        <img src="/logo.svg" alt="" class="system-info__icon" />
        <span class="system-info__name">{{ siteName }}</span>
      </div>
      <div class="system-info__list">
        <div class="system-info__row">
          <span class="system-info__label">{{ t('system.siteName') }}</span>
          <span class="system-info__value">{{ siteName }}</span>
        </div>
        <div class="system-info__row">
          <span class="system-info__label">{{ t('system.developer') }}</span>
          <span class="system-info__value">{{ developer }}</span>
        </div>
        <div class="system-info__row">
          <span class="system-info__label">{{ t('system.buildVersion') }}</span>
          <span class="system-info__value system-info__value--mono">{{ buildVersion }}<template v-if="buildBuild"> · {{ buildBuild }}</template><template v-if="buildTime !== '-'"> · {{ buildTime }}</template></span>
        </div>
        <div class="system-info__row">
          <span class="system-info__label">{{ t('system.backendVersion') }}</span>
          <span class="system-info__value system-info__value--mono">{{ backendVersion }}<template v-if="backendBuild"> · {{ backendBuild }}</template><template v-if="backendTime"> · {{ backendTime }}</template></span>
        </div>
        <div class="system-info__row">
          <span class="system-info__label">{{ t('system.systemTime') }}</span>
          <span class="system-info__value system-info__value--mono">{{ timeText }}</span>
        </div>
      </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.system-info .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.system-info .page-header__subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--spacing-xs); }

.system-info__card {
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  background: var(--color-surface);
  overflow: hidden;
}

.system-info__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-2xl);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-alt);
}

.system-info__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--rounded-md);
}

.system-info__name {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-heading);
}

.system-info__list { padding: var(--spacing-md) var(--spacing-2xl) 0; }

.system-info__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--text-sm);
}

.system-info__row:last-child { border-bottom: none; padding-bottom: var(--spacing-xl); }

.system-info__label { color: var(--color-text-secondary); flex-shrink: 0; }
.system-info__value { color: var(--color-text-secondary); font-weight: var(--weight-medium); word-break: break-all; text-align: right; }
.system-info__value--mono { font-family: var(--font-mono); }
.system-info__hint { color: var(--color-text-secondary); font-weight: var(--weight-regular); }
</style>

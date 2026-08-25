<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from '@/composables/useI18n'
import { siteName } from '@/composables/useConfig'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'
import { useError } from '@/composables/useError'
import { useToast } from '@/composables/useToast'
import { healthAPI, statAPI, requestAPI } from '@/api'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const { t } = useI18n()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()
const { getMessage } = useError()
const { toast } = useToast()

const reportOpen = ref(false)
const reportContent = ref('')
const reportError = ref('')
const reportSubmitting = ref(false)

function openReport() {
  reportContent.value = ''
  reportError.value = ''
  reportOpen.value = true
}

function closeReport() {
  reportOpen.value = false
}

async function submitReport() {
  const content = reportContent.value.trim()
  if (!content) return
  reportSubmitting.value = true
  reportError.value = ''
  try {
    await requestAPI.create(-1, 'REPORT', JSON.stringify({ content }))
    toast(t('system.reportSuccess'), 'success')
    reportOpen.value = false
  } catch (err) {
    reportError.value = getMessage(err, 'system.reportFailed')
  } finally {
    reportSubmitting.value = false
  }
}

const developer = 'Zincoid'
const buildVersion = document.querySelector('meta[name="version"]')?.content || '-'
const buildBuild = document.querySelector('meta[name="build"]')?.content || ''
const buildTime = formatMetaTime(document.querySelector('meta[name="time"]')?.content)
const backendVersion = ref('-')
const backendBuild = ref('')
const backendTime = ref('')
const stats = ref(null)
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
  loadData()
})

onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('resize', onResize)
  disposeCharts()
})

watch([() => themeStore.theme, () => localeStore.locale], () => renderCharts())

function formatMetaTime(raw) {
  if (!raw) return '-'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return '-'
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function loadData() {
  loading.value = true
  try {
    const [vRes, sRes] = await Promise.all([
      healthAPI.version().catch(() => null),
      statAPI.get(7, 15).catch(() => null)
    ])
    const info = vRes?.data?.data
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
    stats.value = sRes?.data?.data || null
  } catch { /* ignore */ } finally {
    loading.value = false
    nextTick(renderCharts)
  }
}

const timeText = computed(() => {
  const d = now.value
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

// ── Charts ──
const dailyChartRef = ref(null)
const apiChartRef = ref(null)
let dailyChart = null
let apiChart = null

function chartColors() {
  const dark = themeStore.theme === 'dark'
  return {
    text: dark ? '#9ca3af' : '#6b7280',
    grid: dark ? '#2e303a' : '#e5e7eb',
    axis: dark ? '#6b7280' : '#9ca3af',
    primary: '#2952cc',
    tooltipBg: dark ? '#1a1d27' : '#ffffff',
    tooltipBorder: dark ? '#2e303a' : '#e5e7eb',
    tooltipText: dark ? '#f3f4f6' : '#111827'
  }
}

function disposeCharts() {
  if (dailyChart) { dailyChart.dispose(); dailyChart = null }
  if (apiChart) { apiChart.dispose(); apiChart = null }
}

function renderCharts() {
  renderDaily()
  renderApis()
}

function renderDaily() {
  if (!stats.value || !done.value) return
  const { text, grid, axis, primary, tooltipBg, tooltipBorder, tooltipText } = chartColors()
  if (dailyChart) { dailyChart.dispose(); dailyChart = null }
  if (!dailyChartRef.value) return
  dailyChart = echarts.init(dailyChartRef.value)
  dailyChart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderRadius: 8,
      textStyle: { color: tooltipText },
      formatter: params => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.axisValue}<br/>${p.marker}<b style="font-weight:700">${p.value}</b>`
      }
    },
    grid: { left: 40, right: 16, top: 24, bottom: 24 },
    xAxis: {
      type: 'category',
      data: stats.value.daily.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: axis } },
      axisLabel: { color: text }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text }
    },
    series: [{
      name: t('system.statsDaily'),
      type: 'line',
      smooth: true,
      data: stats.value.daily.map(d => d.count),
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: primary, width: 2 },
      itemStyle: { color: primary },
      areaStyle: { color: primary, opacity: 0.12 }
    }]
  })
}

function renderApis() {
  if (!stats.value || !done.value) return
  const { text, grid, axis, tooltipBg, tooltipBorder, tooltipText } = chartColors()
  if (apiChart) { apiChart.dispose(); apiChart = null }
  if (!apiChartRef.value) return
  apiChart = echarts.init(apiChartRef.value)
  apiChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderRadius: 8,
      textStyle: { color: tooltipText }
    },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text }
    },
    yAxis: {
      type: 'category',
      data: stats.value.apis.map(a => a.api).reverse(),
      axisLine: { lineStyle: { color: axis } },
      axisLabel: { color: text, fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: stats.value.apis.map(a => a.count).reverse(),
      barMaxWidth: 14,
      itemStyle: { color: '#f59e0b', borderRadius: [0, 3, 3, 0] }
    }]
  })
}

const dailyLoading = ref(false)
const apisLoading = ref(false)

async function refreshDaily() {
  dailyLoading.value = true
  try {
    const res = await statAPI.get(7, 0).catch(() => null)
    const data = res?.data?.data
    if (data?.daily) stats.value = { ...(stats.value || {}), daily: data.daily }
  } catch { /* ignore */ } finally {
    dailyLoading.value = false
    nextTick(renderDaily)
  }
}

async function refreshApis() {
  apisLoading.value = true
  try {
    const res = await statAPI.get(7, 15).catch(() => null)
    const data = res?.data?.data
    if (data?.apis) stats.value = { ...(stats.value || {}), apis: data.apis }
  } catch { /* ignore */ } finally {
    apisLoading.value = false
    nextTick(renderApis)
  }
}

function onResize() {
  dailyChart?.resize()
  apiChart?.resize()
}

watch(done, (v) => {
  if (v) {
    window.addEventListener('resize', onResize)
    nextTick(renderCharts)
  }
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
          <span class="system-info__label">{{ t('system.frontendVersion') }}</span>
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
      <section class="section">
        <h3>{{ t('system.stats') }}</h3>
        <div class="stats-layout">
          <div class="stats-card">
            <button class="stats-refresh" :disabled="dailyLoading" @click="refreshDaily">
              <SvgIcon name="refresh" :size="16" />
            </button>
            <h4>{{ t('system.statsDaily') }}</h4>
            <div ref="dailyChartRef" class="stats-chart"></div>
          </div>
          <div class="stats-card">
            <button class="stats-refresh" :disabled="apisLoading" @click="refreshApis">
              <SvgIcon name="refresh" :size="16" />
            </button>
            <h4>{{ t('system.statsApis') }}</h4>
            <div ref="apiChartRef" class="stats-chart"></div>
          </div>
        </div>
      </section>
      <section class="section">
        <h3>{{ t('system.report') }}</h3>
        <p class="system-report-desc">{{ t('system.reportDesc') }}</p>
        <button class="btn btn--primary" @click="openReport">
          <SvgIcon name="send" :size="16" />
          {{ t('system.reportSubmit') }}
        </button>
      </section>

      <Transition name="modal">
        <div v-if="reportOpen" class="modal-overlay" @click.self="closeReport">
          <div class="modal">
            <h3 class="modal__title">
              <span>{{ t('system.reportTitle') }}</span>
              <button class="modal__close" :title="t('common.close')" @click="closeReport">
                <SvgIcon name="close" :size="16" />
              </button>
            </h3>
            <p class="modal__desc">{{ t('system.reportDesc') }}</p>
            <p v-if="reportError" class="msg msg--error">{{ reportError }}</p>
            <textarea
                v-model="reportContent"
                class="field__input report-content"
                rows="5"
                maxlength="500"
                :placeholder="t('system.reportPlaceholder')"
            ></textarea>
            <div class="modal__actions">
              <button class="btn btn--primary btn--full" :disabled="reportSubmitting || !reportContent.trim()" @click="submitReport">
                <SvgIcon name="send" :size="16" />
                {{ t('system.reportSubmit') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.system-info .page-header { padding-top: var(--spacing-xs); margin-bottom: var(--spacing-xl); }
.system-info .page-header__subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); }

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
  font-size: var(--text-2xl);
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
.system-info__hint { color: var(--color-text-secondary); font-weight: var(--weight-normal); }

.section { margin-top: var(--spacing-3xl); }
.section h3 { margin-bottom: var(--spacing-lg); }

.system-report-desc { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-lg); max-width: 640px; }

.report-content {
  width: 100%;
  resize: vertical;
  min-height: 96px;
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
  border-radius: var(--rounded-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.modal__close:hover { color: var(--color-text-heading); background: var(--color-bg-alt); }
.modal__desc { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-lg); }
.modal__actions { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-light); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: scale(0.95); }

.stats-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
}

.stats-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-lg);
  min-width: 0;
}

.stats-card h4 {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
  padding-right: 36px;
}

.stats-refresh {
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
.stats-refresh:hover { color: var(--color-primary); border-color: var(--color-primary); background: var(--color-primary-bg); }
.stats-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.stats-refresh:disabled svg { animation: stats-spin 1s linear infinite; }
@keyframes stats-spin { to { transform: rotate(360deg); } }

.stats-chart {
  width: 100%;
  height: 310px;
}

@media (max-width: 900px) {
  .stats-layout {
    grid-template-columns: 1fr;
  }
}
</style>

import { useConfirm } from '@/composables/useConfirm'
import { useI18n } from '@/composables/useI18n'

const VERSION_META = 'build-version'
const CHECK_INTERVAL = 60000

function currentVersion() {
  return document.querySelector(`meta[name="${VERSION_META}"]`)?.content || ''
}

async function fetchVersion() {
  const res = await fetch('/index.html', { cache: 'no-store' })
  const html = await res.text()
  return html.match(/name="build-version" content="([^"]+)"/)?.[1] || ''
}

export function startUpdateCheck() {
  const { confirm, visible } = useConfirm()
  const { t } = useI18n()
  let timer = null

  async function check() {
    if (visible.value) return
    try {
      const latest = await fetchVersion()
      if (latest && latest !== currentVersion()) {
        stop()
        const ok = await confirm(t('common.updateAvailable'))
        if (ok) location.reload()
        else start()
      }
    } catch {
      start()
    }
  }

  function start() {
    if (timer) return
    timer = setInterval(check, CHECK_INTERVAL)
  }

  function stop() {
    clearInterval(timer)
    timer = null
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check()
  })

  start()
  return stop
}

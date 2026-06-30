import { useLocaleStore } from '@/stores/locale'
import en from '@/locales/en'
import zh from '@/locales/zh'

const messages = { en, zh }

export function useI18n() {
  const locale = useLocaleStore()

  function t(key, params = {}) {
    const keys = key.split('.')
    let msg = messages[locale.locale]
    for (const k of keys) {
      if (msg == null) return key
      msg = msg[k]
    }
    if (msg == null) return key
    if (Array.isArray(msg)) return msg
    if (typeof msg === 'function') return msg(params)
    return msg.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
  }

  return { t }
}

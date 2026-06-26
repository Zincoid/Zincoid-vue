import { useI18n } from './useI18n'

export function useError() {
  const { t } = useI18n()

  function getMessage(err, fallbackKey) {
    const msg = err?.response?.data?.message
    if (msg) {
      const key = `errors.${msg}`
      const translated = t(key)
      if (translated !== key) return translated
      return msg
    }
    if (fallbackKey) return t(fallbackKey)
    return t('common.failed')
  }

  return { getMessage }
}

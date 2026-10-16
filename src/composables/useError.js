import { useI18n } from './useI18n'

export function useError() {
  const { t } = useI18n()

  function getMessage(err, fallbackKey) {
    const data = err?.response?.data
    const key = data?.error || data?.message
    if (key) {
      const i18nKey = `errors.${key}`
      const translated = t(i18nKey)
      if (translated !== i18nKey) return translated
      return data?.message || key
    }
    if (fallbackKey) return t(fallbackKey)
    return t('common.failed')
  }

  return { getMessage }
}

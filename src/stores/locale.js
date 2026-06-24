import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useLocaleStore = defineStore('locale', () => {
  const saved = localStorage.getItem('locale')
  const locale = ref(saved || 'en')
  document.documentElement.lang = locale.value

  watch(locale, (val) => {
    localStorage.setItem('locale', val)
    document.documentElement.lang = val
  })

  function toggleLocale() {
    locale.value = locale.value === 'en' ? 'zh' : 'en'
  }

  return { locale, toggleLocale }
})

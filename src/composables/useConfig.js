import { ref, computed } from 'vue'
import { configAPI } from '@/api'

const DEFAULT_SITE_NAME = "Zincoid's"

const cache = ref(null)
let promise = null

export const siteName = computed(() => {
  if (cache.value && 'site_name' in cache.value) return cache.value['site_name']
  return DEFAULT_SITE_NAME
})

export const siteBrand = computed(() => {
  const name = siteName.value
  const idx = name.indexOf("'")
  if (idx === -1) return { main: name, suffix: '' }
  return { main: name.slice(0, idx), suffix: name.slice(idx) }
})

export function useConfig() {
  async function load() {
    if (cache.value) return cache.value
    if (promise) return promise
    promise = configAPI.get().then(res => {
      cache.value = res.data.data || {}
      return cache.value
    }).finally(() => {
      promise = null
    })
    return promise
  }

  function get(key, fallback) {
    if (cache.value && key in cache.value) return cache.value[key]
    return fallback
  }

  return { load, get }
}

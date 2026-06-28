import { ref } from 'vue'
import { configAPI } from '@/api'

const cache = ref(null)
let promise = null

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

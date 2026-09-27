import { ref } from 'vue'
import { permissionAPI } from '@/api'

// Permission codes mirror the backend Perm enum (serialized as integers).
export const Perm = {
  ARTICLE_OP: 0
}

// Locale key for each known permission — extend when the backend adds more.
export const PERM_KEY = {
  [Perm.ARTICLE_OP]: 'permission.articleOp'
}

// Module-level cache (like useConfig): fetched once per login and shared by
// every consumer. `refresh` re-fetches (the "刷新授权" button), `reset` drops
// the cache on logout so the next login starts clean.
const perms = ref(null) // null = not loaded; [] = loaded, none granted
let promise = null

export function usePermission() {
  async function load() {
    if (perms.value) return perms.value
    // without a token /my would 401 and the interceptor would bounce the app
    // to the login page — treat it as "no permissions" instead
    if (!localStorage.getItem('token')) {
      perms.value = []
      return perms.value
    }
    if (promise) return promise
    promise = permissionAPI.my().then(res => {
      perms.value = res.data.data || []
      return perms.value
    }).catch(() => {
      perms.value = perms.value || []
      return perms.value
    }).finally(() => {
      promise = null
    })
    return promise
  }

  async function refresh() {
    perms.value = null
    return load()
  }

  function has(perm) {
    return (perms.value || []).includes(perm)
  }

  function reset() {
    perms.value = null
    promise = null
  }

  return { perms, load, refresh, has, reset }
}

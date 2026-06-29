import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, userAPI } from '@/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 1)

  async function login(credentials) {
    const { data } = await authAPI.login(credentials)
    token.value = data.data.token
    user.value = data.data.user
    localStorage.setItem('token', data.data.token)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    return data.data
  }

  async function register(form) {
    const { data } = await authAPI.register(form)
    token.value = data.data.token
    user.value = data.data.user
    localStorage.setItem('token', data.data.token)
    localStorage.setItem('user', JSON.stringify(data.data.user))
    return data.data
  }

  async function fetchMe() {
    const { data } = await userAPI.getMe()
    user.value = data.data
    localStorage.setItem('user', JSON.stringify(data.data))
  }

  async function updateProfile(form) {
    const { data } = await userAPI.updateProfile(form)
    user.value = data.data
    localStorage.setItem('user', JSON.stringify(data.data))
    return data.data
  }

  async function changePassword(form) {
    await userAPI.changePassword(form)
  }

  async function logout() {
    try { await authAPI.logout(); } catch {}
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  return { token, user, isLoggedIn, isAdmin, login, register, fetchMe, updateProfile, changePassword, logout }
})

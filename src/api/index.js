import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth ──
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout')
}

// ── Users ──
export const userAPI = {
  getList: (page = 1, size = 20) => api.get('/users/public', { params: { page, size } }),
  getDetail: (id) => api.get(`/users/public/${id}`),
  getMe: () => api.get('/users'),
  updateProfile: (data) => api.put('/users', data),
  updateAvatar: (avatar) => api.put('/users/avatar', { avatar }),
  changePassword: (data) => api.put('/users/password', data),
  deleteMe: () => api.delete('/users')
}

// ── Moments ──
export const momentAPI = {
  create: (data) => api.post('/moments', data),
  update: (id, data) => api.put(`/moments/${id}`, data),
  delete: (id) => api.delete(`/moments/${id}`),
  pin: (id) => api.put(`/moments/${id}/pin`),
  unpin: (id) => api.put(`/moments/${id}/unpin`),
  getTimeline: (page = 1, size = 10) => api.get('/moments/public', { params: { page, size } }),
  getByUser: (userId, page = 1, size = 10) => api.get(`/moments/public/user/${userId}`, { params: { page, size } }),
  getDetail: (id) => api.get(`/moments/public/${id}`)
}

// ── Articles ──
export const articleAPI = {
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
  pin: (id) => api.put(`/articles/${id}/pin`),
  unpin: (id) => api.put(`/articles/${id}/unpin`),
  getList: (page = 1, size = 10) => api.get('/articles/public', { params: { page, size } }),
  getByUser: (userId, page = 1, size = 10) => api.get(`/articles/public/user/${userId}`, { params: { page, size } }),
  getDetail: (id) => api.get(`/articles/public/${id}`)
}

// ── Comments ──
export const commentAPI = {
  addMoment: (momentId, data) => api.post(`/comments/moment/${momentId}`, data),
  addArticle: (articleId, data) => api.post(`/comments/article/${articleId}`, data),
  getMoment: (momentId) => api.get(`/comments/public/moment/${momentId}`),
  getArticle: (articleId) => api.get(`/comments/public/article/${articleId}`),
  delete: (commentId) => api.delete(`/comments/${commentId}`)
}

// ── Files ──
export const fileAPI = {
  upload: (file, relatedType, relatedId) => {
    const form = new FormData()
    form.append('file', file)
    if (relatedType != null) form.append('relatedType', relatedType)
    if (relatedId != null) form.append('relatedId', relatedId)
    return api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  cleanup: (isLogic = false) => api.delete('/files/cleanup', { params: { isLogic } })
}

// ── Likes ──
export const likeAPI = {
  toggle: (targetType, targetId) => api.post(`/likes/${targetType}/${targetId}`),
  getStatus: (targetType, targetId) => api.get(`/likes/public/${targetType}/${targetId}/status`)
}

// ── Config ──
export const configAPI = {
  get: () => api.get('/configs/public'),
  listAll: () => api.get('/configs/all'),
  update: (key, value) => api.put(`/configs/${key}`, null, { params: { value } })
}

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
  logout: () => api.post('/auth/logout'),
  deleteMe: () => api.delete('/auth/me'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data)
}

// ── Users ──
export const userAPI = {
  getList: (page = 1, size = 20) => api.get('/users', { params: { page, size } }),
  getDetail: (id) => api.get(`/users/${id}`)
}

// ── Moments ──
export const momentAPI = {
  create: (data) => api.post('/moments', data),
  update: (id, data) => api.put(`/moments/${id}`, data),
  delete: (id) => api.delete(`/moments/${id}`),
  getTimeline: (page = 1, size = 10) => api.get('/moments/public/timeline', { params: { page, size } }),
  getByUser: (userId, page = 1, size = 10) => api.get(`/moments/public/user/${userId}`, { params: { page, size } }),
  getDetail: (id) => api.get(`/moments/public/${id}`)
}

// ── Articles ──
export const articleAPI = {
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
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
    if (relatedType) form.append('relatedType', relatedType)
    if (relatedId) form.append('relatedId', relatedId)
    return api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// ── Admin ──
export const adminAPI = {
  pinMoment: (id) => api.put(`/admin/moments/${id}/pin`),
  unpinMoment: (id) => api.put(`/admin/moments/${id}/unpin`),
  deleteMoment: (id) => api.delete(`/admin/moments/${id}`),
  pinArticle: (id) => api.put(`/admin/articles/${id}/pin`),
  unpinArticle: (id) => api.put(`/admin/articles/${id}/unpin`),
  deleteArticle: (id) => api.delete(`/admin/articles/${id}`),
  deleteComment: (id, type) => api.delete(`/admin/comments/${id}`, { params: { type } }),
  getConfigs: () => api.get('/admin/configs'),
  updateConfig: (key, value) => api.put(`/admin/configs/${key}`, { value })
}

// ── Likes ──
export const likeAPI = {
  toggle: (targetType, targetId) => api.post(`/likes/${targetType}/${targetId}`),
  getStatus: (targetType, targetId) => api.get(`/likes/${targetType}/${targetId}/status`)
}

// ── Site Config ──
export const siteConfigAPI = {
  get: () => api.get('/site-config')
}

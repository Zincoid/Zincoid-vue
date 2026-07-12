import axios from 'axios'
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
    if (!error.response || [502, 503, 504].includes(error.response.status)) {
      router.push('/maintenance').catch(() => {})
      return Promise.reject(error)
    }
    if (error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login?expired=true'
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth ──
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  reset: (data) => api.put('/auth/reset-password', data),
  change: (data) => api.put('/auth/change-email', data),
  sendRegisterCode: (email) => api.post('/auth/register/send-code', { email }),
  sendResetCode: (email) => api.post('/auth/reset-password/send-code', { email }),
  sendNewCode: (email) => api.post('/auth/change-email/send-new-code', { email }),
  sendOldCode: () => api.post('/auth/change-email/send-old-code')
}

// ── Users ──
export const userAPI = {
  getList: (page = 1, size = 20, role, keyword) => api.get('/users/public', { params: { page, size, role, keyword } }),
  getDetail: (id) => api.get(`/users/public/${id}`),
  getByUsername: (username) => api.get(`/users/public/username/${username}`),
  getMe: () => api.get('/users'),
  updateProfile: (data) => api.put('/users', data),
  updateAvatar: (avatar) => api.put('/users/avatar', { avatar }),
  changePassword: (data) => api.put('/users/password', data),
  changePasswordByForce: (username, password) => api.put('/users/password/force', { username, password }),
  deleteMe: () => api.delete('/users'),
  updateStatus: (id, status) => api.put(`/users/${id}/status`, null, { params: { status } }),
  deleteUser: (id) => api.delete(`/users/${id}`)
}

// ── Moments ──
export const momentAPI = {
  create: (data) => api.post('/moments', data),
  update: (id, data) => api.put(`/moments/${id}`, data),
  delete: (id) => api.delete(`/moments/${id}`),
  pin: (id) => api.put(`/moments/${id}/pin`),
  unpin: (id) => api.put(`/moments/${id}/unpin`),
  getTimeline: (page = 1, size = 10, pinned = false) => api.get('/moments/public', { params: { page, size, pinned } }),
  getHomeFeed: (size = 10) => api.get('/moments/public/home', { params: { size } }),
  getByUser: (userId, page = 1, size = 10, pinned = false) => api.get(`/moments/public/user/${userId}`, { params: { page, size, pinned } }),
  getDetail: (id) => api.get(`/moments/public/${id}`),
  getRandom: () => api.get('/moments/public/random'),
  addView: (id) => api.post(`/moments/public/${id}/view`)
}

// ── Articles ──
export const articleAPI = {
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
  pin: (id) => api.put(`/articles/${id}/pin`),
  unpin: (id) => api.put(`/articles/${id}/unpin`),
  getList: (page = 1, size = 10, pinned = false) => api.get('/articles/public', { params: { page, size, pinned } }),
  getHomeFeed: (size = 10) => api.get('/articles/public/home', { params: { size } }),
  getByUser: (userId, page = 1, size = 10, pinned = false) => api.get(`/articles/public/user/${userId}`, { params: { page, size, pinned } }),
  getRandom: () => api.get('/articles/public/random'),
  getDetail: (id) => api.get(`/articles/public/${id}`)
}

// ── Comments ──
export const commentAPI = {
  addMoment: (momentId, data) => api.post(`/comments/moment/${momentId}`, data),
  addArticle: (articleId, data) => api.post(`/comments/article/${articleId}`, data),
  getMoment: (momentId, page = 1, size = 10) => api.get(`/comments/public/moment/${momentId}`, { params: { page, size } }),
  getArticle: (articleId, page = 1, size = 10) => api.get(`/comments/public/article/${articleId}`, { params: { page, size } }),
  getReplies: (parentId) => api.get(`/comments/public/replies/${parentId}`),
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

// ── Chats ──
export const chatAPI = {
  getList: (page = 1, size = 50) => api.get('/chats/public', { params: { page, size } }),
  send: (content, file) => api.post('/chats', null, { params: { content, file } }),
  delete: (messageId) => api.delete(`/chats/${messageId}`)
}

// ── Health ──
export const healthAPI = {
  cleanupFiles: (isLogic = false) => api.delete('/health/cleanup', { params: { isLogic } }),
  cleanupRecords: () => api.post('/health/cleanup')
}

// ── Repos ──
export const repoAPI = {
  create: (data) => api.post('/repos', data),
  update: (id, data) => api.put(`/repos/${id}`, data),
  delete: (id) => api.delete(`/repos/${id}`),
  getList: (page = 1, size = 10, type, keyword) => api.get('/repos/public', { params: { page, size, type, keyword } }),
  getByUser: (userId, page = 1, size = 10, type) => api.get(`/repos/public/user/${userId}`, { params: { page, size, type } }),
  getDetail: (id) => api.get(`/repos/public/${id}`),
  addItem: (repoId, data) => api.post(`/repos/${repoId}/items`, data),
  deleteItem: (repoId, itemId) => api.delete(`/repos/${repoId}/items/${itemId}`),
  sortItems: (repoId, itemIds) => api.put(`/repos/${repoId}/items/sort`, itemIds),
  requestAccess: (repoId) => api.post(`/repos/${repoId}/access`),
  _get: (path) => api.get(`/repos${path}`),
  _put: (path) => api.put(`/repos${path}`),
  _delete: (path) => api.delete(`/repos${path}`)
}

// ── Notifications ──
export const notificationAPI = {
  getList: (page = 1, size = 5) => api.get('/notifications', { params: { page, size } }),
  getUnreadCount: () => api.get('/notifications/count'),
  markRead: () => api.put('/notifications/read'),
  markOne: (id) => api.put(`/notifications/${id}/read`),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications'),
  broadcast: (content) => api.post('/notifications/broadcast', { content })
}

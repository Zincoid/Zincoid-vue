import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: 'Home' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { guest: true, title: 'Login' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/LoginPage.vue'),
    meta: { guest: true, title: 'Register' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfilePage.vue'),
    meta: { requiresAuth: true, title: 'Profile' }
  },
  {
    path: '/users',
    name: 'UserList',
    component: () => import('@/views/UserListPage.vue'),
    meta: { title: 'Members' }
  },
  {
    path: '/users/:id',
    name: 'UserDetail',
    component: () => import('@/views/UserDetailPage.vue'),
    meta: { title: 'Member' }
  },
  {
    path: '/moments',
    name: 'Moments',
    component: () => import('@/views/MomentTimelinePage.vue'),
    meta: { title: 'Moments' }
  },
  {
    path: '/moments/:id',
    name: 'MomentDetail',
    component: () => import('@/views/MomentDetailPage.vue'),
    meta: { title: 'Moment' }
  },
  {
    path: '/articles',
    name: 'Articles',
    component: () => import('@/views/ArticleListPage.vue'),
    meta: { title: 'Articles' }
  },
  {
    path: '/articles/new',
    name: 'ArticleCreate',
    component: () => import('@/views/ArticleEditorPage.vue'),
    meta: { requiresAuth: true, title: 'New Article' }
  },
  {
    path: '/articles/:id',
    name: 'ArticleDetail',
    component: () => import('@/views/ArticleDetailPage.vue'),
    meta: { title: 'Article' }
  },
  {
    path: '/articles/:id/edit',
    name: 'ArticleEdit',
    component: () => import('@/views/ArticleEditorPage.vue'),
    meta: { requiresAuth: true, title: 'Edit Article' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminPage.vue'),
    meta: { requiresAuth: true, requiresFounder: true, title: 'Manage' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: { title: 'Not Found' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.meta.requiresAuth && !token) {
    return next('/login')
  }

  if (to.meta.requiresFounder && (!user || user.role !== 1)) {
    return next('/')
  }

  if (to.meta.guest && token) {
    return next('/')
  }

  next()
})

router.afterEach((to) => {
  document.title = to.meta.title ? `Zincoid's | ${to.meta.title}` : `Zincoid's`
})

export default router

import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('@/views/MaintenancePage.vue'),
    meta: { title: 'Maintenance' }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: 'Home' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/SignInPage.vue'),
    meta: { guest: true, title: 'Login' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/SignInPage.vue'),
    meta: { guest: true, title: 'Register' }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordPage.vue'),
    meta: { guest: true, title: 'Forgot Password' }
  },
  {
    path: '/personal',
    name: 'Personal',
    component: () => import('@/views/PersonalCenterPage.vue'),
    redirect: '/personal/profile',
    meta: { requiresAuth: true, title: 'Personal' },
    children: [
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/ProfilePage.vue'),
        meta: { requiresAuth: true, title: 'Profile' }
      },
      {
        path: 'data',
        name: 'DataManagement',
        component: () => import('@/views/DataPage.vue'),
        meta: { requiresAuth: true, title: 'Data' }
      },
      {
        path: 'access',
        name: 'Access',
        component: () => import('@/views/AccessPage.vue'),
        meta: { requiresAuth: true, title: 'Access' }
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/SystemPage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'System' }
      },
      {
        path: 'manage',
        name: 'Manage',
        component: () => import('@/views/ManagePage.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, title: 'Manage' }
      }
    ]
  },
  {
    path: '/members',
    name: 'Members',
    component: () => import('@/views/MembersPage.vue'),
    meta: { title: 'Members' }
  },
  {
    path: '/members/@:username',
    name: 'MemberDetailByUsername',
    component: () => import('@/views/MemberDetailPage.vue'),
    meta: { title: 'Member' }
  },
  {
    path: '/members/:id',
    name: 'MemberDetail',
    component: () => import('@/views/MemberDetailPage.vue'),
    meta: { title: 'Member' }
  },
  {
    path: '/moments',
    name: 'Moments',
    component: () => import('@/views/MomentsPage.vue'),
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
    component: () => import('@/views/ArticlesPage.vue'),
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
    path: '/repos',
    name: 'Repos',
    component: () => import('@/views/ReposPage.vue'),
    meta: { title: 'Repos' }
  },
  {
    path: '/repos/:id',
    name: 'RepoDetail',
    component: () => import('@/views/RepoDetailPage.vue'),
    meta: { title: 'Repo' }
  },
  {
    path: '/chats',
    name: 'Chats',
    component: () => import('@/views/ChatsPage.vue'),
    meta: { title: 'Chats' }
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

router.beforeEach(async (to, from, next) => {
  if (to.path === '/maintenance') return next()

  try {
    const res = await fetch('/api/health')
    if (!res.ok) return next('/maintenance')
  } catch {
    return next('/maintenance')
  }

  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.meta.requiresAuth && !token) {
    return next('/login')
  }

  if (to.meta.requiresAdmin && (!user || user.role !== 1)) {
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

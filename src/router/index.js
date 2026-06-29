import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/supabase'

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home',          component: () => import('@/pages/HomePage.vue') },
  { path: '/promotions',    component: () => import('@/pages/PromotionsPage.vue') },
  { path: '/exchange-code', component: () => import('@/pages/ExchangeCodePage.vue'), meta: { requiresAuth: true } },
  { path: '/daily-bonus',   component: () => import('@/pages/DailyBonusPage.vue'),   meta: { requiresAuth: true } },
  { path: '/network',       component: () => import('@/pages/ReferralPage.vue'),      meta: { requiresAuth: true } },
  { path: '/agent',         component: () => import('@/pages/AgentDashboard.vue'),    meta: { requiresAuth: true } },
  { path: '/account',       component: () => import('@/pages/AccountPage.vue') },
  { path: '/device-sessions', component: () => import('@/pages/DeviceSessionsPage.vue'), meta: { requiresAuth: true } },
  { path: '/admin',         component: () => import('@/pages/AdminDashboard.vue') },
  { path: '/login',    redirect: '/home?auth=login' },
  { path: '/register', redirect: '/home?auth=register' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth) { next(); return }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      if (session.access_token) localStorage.setItem('sb_token', session.access_token)
      if (session.user?.user_metadata?.username) localStorage.setItem('sb_username', session.user.user_metadata.username)
      next()
    } else {
      localStorage.removeItem('sb_token')
      window.dispatchEvent(new CustomEvent('iw99:require-auth'))
      next('/home?auth=login')
    }
  } catch (err) {
    console.error('[Router] Auth check failed:', err)
    localStorage.removeItem('sb_token')
    next('/home?auth=login')
  }
})

export default router
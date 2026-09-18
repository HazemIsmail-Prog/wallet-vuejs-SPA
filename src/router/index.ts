import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCountryStore } from '../stores/country'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('../layouts/AuthLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('../views/Login.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { requiresCountry: true, title: 'Home' },
      },
      {
        path: 'transactions',
        name: 'transactions',
        component: () => import('../views/Transactions.vue'),
        meta: { requiresCountry: true, title: 'Transactions' },
      },
      {
        path: 'wallets',
        name: 'wallets',
        component: () => import('../views/Wallets.vue'),
        meta: { requiresCountry: true, title: 'Wallets' },
      },
      {
        path: 'categories/expense',
        name: 'expense-categories',
        component: () => import('../views/Categories.vue'),
        meta: { requiresCountry: true, title: 'Expense categories', categoryType: 'expense' },
      },
      {
        path: 'categories/income',
        name: 'income-categories',
        component: () => import('../views/Categories.vue'),
        meta: { requiresCountry: true, title: 'Income categories', categoryType: 'income' },
      },
      {
        path: 'categories',
        redirect: { name: 'expense-categories' },
      },
      {
        path: 'contacts',
        name: 'contacts',
        component: () => import('../views/Contacts.vue'),
        meta: { title: 'Contacts' },
      },
      {
        path: 'countries',
        name: 'countries',
        component: () => import('../views/Countries.vue'),
        meta: { title: 'Countries' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.bootstrap()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresAuth && to.meta.requiresCountry) {
    const countries = useCountryStore()
    await countries.load()

    if (!countries.activeCountry) {
      return { name: 'countries' }
    }
  }

  return true
})
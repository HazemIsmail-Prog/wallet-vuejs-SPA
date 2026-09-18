import { defineStore } from 'pinia'
import type { User } from '../types/api'
import { router } from '../router'
import * as api from '../services/resources'

type AuthStatus = 'unknown' | 'authenticated' | 'guest'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    status: 'unknown' as AuthStatus,
  }),

  getters: {
    isAuthenticated: (state) => state.status === 'authenticated',
    isUnknown: (state) => state.status === 'unknown',
  },

  actions: {
    async login(email: string, password: string): Promise<void> {
      await api.getCsrf()
      this.user = await api.login(email, password)
      this.status = 'authenticated'
    },

    async logout(): Promise<void> {
      try {
        await api.logout()
      } catch {
        // Session may already be expired — still reset locally.
      } finally {
        this.$reset()
        void router.push({ name: 'login' })
      }
    },

    async bootstrap(force = false): Promise<void> {
      if (this.status === 'authenticated' && !force) {
        return
      }

      if (this.status === 'guest' && !force) {
        return
      }

      try {
        this.user = await api.me()
        this.status = 'authenticated'
      } catch {
        this.status = 'guest'
      }
    },
  },
})
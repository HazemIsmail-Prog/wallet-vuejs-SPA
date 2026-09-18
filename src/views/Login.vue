<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiError } from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('hazem.ismail@hotmail.com')
const password = ref('password')
const error = ref('')
const submitting = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  submitting.value = true

  try {
    await auth.login(email.value, password.value)
    void router.push({ name: 'dashboard' })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="mt-6 space-y-4" @submit.prevent="submit">
    <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400" role="alert">{{ error }}</p>

    <label class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
      <input
        v-model="email"
        type="email"
        autocomplete="username"
        required
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>

    <label class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>

    <button
      type="submit"
      :disabled="submitting"
      class="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      {{ submitting ? 'Signing in…' : 'Sign in' }}
    </button>
  </form>
</template>
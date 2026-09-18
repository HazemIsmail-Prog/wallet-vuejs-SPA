<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

interface NavItem {
  name: string
  to: { name: string }
  label: string
  icon: string[]
  circle?: [number, number, number]
}

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const auth = useAuthStore()
const route = useRoute()

watch(() => route.fullPath, () => emit('close'))

const items: NavItem[] = [
  {
    name: 'dashboard',
    to: { name: 'dashboard' },
    label: 'Home',
    icon: [
      'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    ],
  },
  {
    name: 'transactions',
    to: { name: 'transactions' },
    label: 'Transactions',
    icon: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  },
  {
    name: 'wallets',
    to: { name: 'wallets' },
    label: 'Wallets',
    icon: ['M21 12V7H5a2 2 0 0 1 0-4h14v4', 'M3 5v14a2 2 0 0 0 2 2h16v-5', 'M18 12a2 2 0 0 0 0 4h4v-4Z'],
  },
  {
    name: 'contacts',
    to: { name: 'contacts' },
    label: 'Contacts',
    icon: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    circle: [9, 7, 4],
  },
  {
    name: 'expense-categories',
    to: { name: 'expense-categories' },
    label: 'Expense categories',
    icon: ['M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l9.58-9.58a1 1 0 0 0 0-1.42z'],
    circle: [7, 7, 2],
  },
  {
    name: 'income-categories',
    to: { name: 'income-categories' },
    label: 'Income categories',
    icon: ['M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l9.58-9.58a1 1 0 0 0 0-1.42z'],
    circle: [7, 7, 2],
  },
  {
    name: 'countries',
    to: { name: 'countries' },
    label: 'Countries',
    icon: ['M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
    circle: [12, 12, 10],
  },
]

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="dim">
    <div
      v-if="open"
      class="fixed inset-0 z-30 bg-slate-900/50"
      aria-hidden="true"
      @click="emit('close')"
    />
  </Transition>

  <Transition name="popup">
    <aside
      v-if="open"
      class="fixed bottom-[calc(env(safe-area-inset-bottom)+9.25rem)] right-4 z-40 flex w-60 origin-bottom-right flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <span class="text-base font-semibold text-slate-900 dark:text-slate-100">Open Wallet</span>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Close menu"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <nav class="max-h-[60svh] overflow-y-auto p-2" aria-label="Sections">
        <RouterLink
          v-for="item in items"
          :key="item.name"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          active-class="!bg-emerald-50 !text-emerald-700 dark:!bg-emerald-500/15 dark:!text-emerald-400"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5 shrink-0"
            aria-hidden="true"
          >
            <path v-for="d in item.icon" :key="d" :d="d" />
            <circle v-if="item.circle" :cx="item.circle[0]" :cy="item.circle[1]" :r="item.circle[2]" />
          </svg>
          <span class="text-sm">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="border-t border-slate-200 p-2 dark:border-slate-800">
        <div class="flex items-center justify-between gap-2 px-2 py-1">
          <span class="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{{ auth.user?.name }}</span>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Sign out"
            @click="auth.logout()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span class="text-sm">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style>
.dim-enter-active,
.dim-leave-active {
  transition: opacity 0.2s ease;
}

.dim-enter-from,
.dim-leave-to {
  opacity: 0;
}

.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.15s ease, transform 0.2s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
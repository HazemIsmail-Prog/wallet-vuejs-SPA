<script setup lang="ts">
import { computed, ref } from 'vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavDrawer from '../components/NavDrawer.vue'
import TopBar from '../components/TopBar.vue'
import TransactionFormDialog from '../components/TransactionFormDialog.vue'
import { useCountryStore } from '../stores/country'
import { useTransactionDialogStore } from '../stores/transactionDialog'

const countries = useCountryStore()
const dialog = useTransactionDialogStore()
const route = useRoute()
const drawerOpen = ref(false)

const showFloatingAdd = computed(() => countries.activeCountry !== null)

onMounted(() => {
  void countries.load()
})
</script>

<template>
  <div class="relative flex h-svh w-full flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
    <TopBar />
    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-3xl px-4 py-4 pb-24 sm:px-6 lg:max-w-5xl xl:max-w-6xl lg:px-8">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="route.name" />
        </RouterView>
      </div>
    </main>
    <NavDrawer :open="drawerOpen" @close="drawerOpen = false" />

    <div class="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4 z-30 flex flex-col items-center gap-3">
      <button
        type="button"
        aria-label="Open menu"
        class="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg shadow-slate-900/10 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        @click="drawerOpen = true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true">
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>

      <button
        v-if="showFloatingAdd"
        type="button"
        aria-label="Add transaction"
        class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/25 transition hover:bg-emerald-600 active:scale-95"
        @click="dialog.openCreate()"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="h-6 w-6" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>

    <TransactionFormDialog
      :open="dialog.open"
      :editing="dialog.editing"
      :initial-wallet-id="dialog.initialWalletId"
      @close="dialog.close()"
      @saved="dialog.close()"
    />
  </div>
</template>
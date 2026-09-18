<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6 py-12 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div class="w-full max-w-sm rounded-2xl border border-slate-800 bg-white p-8 shadow-xl dark:bg-slate-900">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">Open Wallet</h1>
      <RouterView />
    </div>
  </div>
</template>
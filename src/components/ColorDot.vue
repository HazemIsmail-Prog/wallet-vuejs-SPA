<script setup lang="ts">
defineProps<{
  color: string | null
}>()
</script>

<template>
  <span
    class="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-white/50 dark:ring-slate-900/50"
    aria-hidden="true"
    :style="color ? { backgroundColor: color } : { backgroundColor: 'transparent', border: '1px dashed rgb(148 163 184 / 0.6)' }"
  />
</template>
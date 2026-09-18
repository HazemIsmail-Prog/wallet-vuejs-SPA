<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

export interface DropdownMenuItem {
  label: string
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
}

defineProps<{ items: DropdownMenuItem[]; iconClass?: string }>()

const open = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function close(): void {
  open.value = false
}

function handleClick(item: DropdownMenuItem): void {
  close()
  item.onClick?.()
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    close()
  }
}

function onClickOutside(e: MouseEvent): void {
  if (open.value && menuRef.value && !menuRef.value.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="menuRef" class="relative shrink-0">
    <button
      type="button"
      class="rounded-lg p-1.5"
      :class="iconClass ?? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'"
      aria-label="More actions"
      @click.stop="open = !open"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
        <circle cx="12" cy="5" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="12" cy="19" r="1.7" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      @click="close"
    >
      <button
        v-for="item in items"
        :key="item.label"
        type="button"
        :disabled="item.disabled"
        class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
        :class="
          item.danger
            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/50'
        "
        @click.stop="handleClick(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
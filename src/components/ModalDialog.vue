<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="absolute inset-0 bg-slate-900/50" @click="emit('close')" />

      <div class="modal-panel relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:max-w-lg sm:rounded-2xl">
        <div class="shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between px-5 py-3">
            <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h2>
            <button
              type="button"
              class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              :aria-label="`Close ${title}`"
              @click="emit('close')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div v-if="$slots.header" class="px-5 pb-3">
            <slot name="header" />
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="shrink-0 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
.modal-enter-active,
.modal-leave-active {
  transition:
    opacity 0.2s ease,
    backdrop-filter 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  backdrop-filter: blur(0);
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.25s ease;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    transform: translateY(8px) scale(0.97);
  }
}
</style>
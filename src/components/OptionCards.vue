<script setup lang="ts">
import { hexToRgba } from '../utils/color'

export interface OptionCardsOption {
  value: string | number | null
  label: string
  hint?: string
  hintClass?: string
  color?: string | null
}

const props = withDefaults(
  defineProps<{
    options: OptionCardsOption[]
    modelValue: string | number | null
    columns?: 1 | 2 | 3
    compact?: boolean
    solid?: boolean
    glossy?: boolean
  }>(),
  { columns: 1, compact: false, solid: false, glossy: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>()

function isSelected(option: OptionCardsOption): boolean {
  return option.value === props.modelValue
}

function backgroundFor(option: OptionCardsOption): Record<string, string> | undefined {
  if (props.solid && option.color) {
    if (props.glossy) {
      return {
        backgroundImage: [
          'linear-gradient(45deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)',
          `linear-gradient(to top right, ${option.color}, color-mix(in srgb, ${option.color} 60%, black))`,
        ].join(', '),
        borderColor: hexToRgba(option.color, 0.6) ?? option.color,
      }
    }

    return {
      backgroundColor: option.color,
      borderColor: hexToRgba(option.color, 0.6) ?? option.color,
    }
  }

  const rgba = hexToRgba(option.color, isSelected(option) ? 0.26 : 0.18)

  return rgba ? { backgroundColor: rgba } : undefined
}

function hintClassFor(option: OptionCardsOption): string {
  if (option.hintClass) {
    return option.hintClass
  }
  if (props.solid && option.color) {
    return 'text-white/80'
  }
  return 'text-slate-500 dark:text-slate-400'
}

function gridClass(): string {
  if (props.columns === 2) return 'grid grid-cols-2 gap-2'
  if (props.columns === 3) return 'grid grid-cols-3 gap-2'
  return 'grid grid-cols-1 gap-2'
}
</script>

<template>
  <div v-if="compact" class="flex flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      :aria-pressed="isSelected(option)"
      class="rounded-full border px-3 py-1.5 text-sm transition"
      :class="
        isSelected(option)
          ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60'
      "
      @click="emit('update:modelValue', option.value)"
      :style="backgroundFor(option)"
    >
      {{ option.label }}
    </button>
  </div>

  <div v-else :class="gridClass()">
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      :aria-pressed="isSelected(option)"
      class="rounded-xl border p-3 text-left transition"
      :class="
        props.solid && option.color
          ? isSelected(option)
            ? 'border-emerald-600 ring-2 ring-white/50'
            : 'border-slate-200 hover:opacity-90'
          : isSelected(option)
            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20 dark:bg-emerald-500/10'
            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/60'
      "
      @click="emit('update:modelValue', option.value)"
      :style="backgroundFor(option)"
    >
      <span :class="['block text-sm font-semibold', props.solid && option.color ? 'text-white' : 'text-slate-900 dark:text-slate-100']">{{ option.label }}</span>
      <span v-if="option.hint" :class="['mt-0.5 block text-xs', hintClassFor(option)]">{{ option.hint }}</span>
    </button>
  </div>
</template>
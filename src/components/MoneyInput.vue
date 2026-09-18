<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    decimalPlaces?: number
    placeholder?: string
  }>(),
  { decimalPlaces: 2, placeholder: '' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const regex = computed(() => new RegExp(`^\\d{0,13}(?:\\.\\d{0,${props.decimalPlaces}})?$`))

function onInput(event: Event): void {
  const input = (event.target as HTMLInputElement).value.trim()

  if (input === '') {
    emit('update:modelValue', '')
    return
  }

  if (regex.value.test(input)) {
    emit('update:modelValue', input)
  }
}
</script>

<template>
  <input
    :value="modelValue"
    type="text"
    inputmode="decimal"
    autocomplete="off"
    :placeholder="placeholder"
    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
    @input="onInput"
  />
</template>
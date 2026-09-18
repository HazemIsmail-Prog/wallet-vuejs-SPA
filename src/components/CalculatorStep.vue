<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatLargeNumber, toMajor, toMinor } from '../utils/money'

const props = defineProps<{
  active: boolean
  decimalPlaces: number
  modelValue?: string
  walletBalance?: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string]; apply: [] }>()

type Op = '+' | '−' | '×' | '÷'

const acc = ref(0)
const entry = ref('0')
const pendingOp = ref<Op | null>(null)
const afterEquals = ref(false)

function reset(value: string): void {
  acc.value = 0
  entry.value = value && toMinor(value, props.decimalPlaces) > 0 ? value : '0'
  pendingOp.value = null
  afterEquals.value = false
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      reset(props.modelValue ?? '')
    }
  },
  { immediate: true },
)

function applyOp(op: Op, a: number, b: number): number {
  const scale = 10 ** props.decimalPlaces

  switch (op) {
    case '+':
      return a + b
    case '−':
      return Math.max(0, a - b)
    case '×':
      return Math.round((a * b) / scale)
    case '÷':
      return b === 0 ? 0 : Math.round((a / b) * scale)
  }
}

const valueMinor = computed(() => toMinor(entry.value, props.decimalPlaces))

const canApply = computed(() => valueMinor.value > 0 && pendingOp.value === null)

const quickFractions = computed(() => {
  const d = props.decimalPlaces
  if (d <= 0) {
    return []
  }
  return [25, 50, 75].map((frac) => {
    const minor = Math.round((frac * 10 ** d) / 100)
    return { minor, label: `.${toMajor(minor, d).toFixed(d).split('.')[1]}` }
  })
})

const hasBalance = computed(() => props.walletBalance !== undefined)

const balanceMinor = computed(() => props.walletBalance ?? 0)

function pressBalance(): void {
  if (props.walletBalance === undefined) {
    return
  }
  const balance = props.walletBalance
  const formatted = toMajor(balance, props.decimalPlaces).toFixed(props.decimalPlaces)
  if (afterEquals.value || pendingOp.value) {
    entry.value = formatted
    afterEquals.value = false
  } else {
    entry.value = toMajor(valueMinor.value + balance, props.decimalPlaces).toFixed(props.decimalPlaces)
  }
}

function pressFraction(minorFraction: number): void {
  if (props.decimalPlaces <= 0) {
    return
  }
  if (afterEquals.value) {
    entry.value = '0'
    afterEquals.value = false
  }
  const intPart = entry.value.split('.')[0] || '0'
  const frac = toMajor(minorFraction, props.decimalPlaces).toFixed(props.decimalPlaces).split('.')[1]
  entry.value = `${intPart}.${frac}`
}

const display = computed(() => formatLargeNumber(valueMinor.value, props.decimalPlaces))

const expression = computed(() => {
  if (!pendingOp.value) {
    return ''
  }

  const current = entry.value === '0' ? '' : formatLargeNumber(valueMinor.value, props.decimalPlaces)
  return `${formatLargeNumber(acc.value, props.decimalPlaces)} ${pendingOp.value}${current ? ` ${current}` : ''}`
})

function pressDigit(digit: string): void {
  if (afterEquals.value) {
    entry.value = digit
    afterEquals.value = false
    return
  }

  if (entry.value === '0') {
    entry.value = digit
    return
  }

  if (entry.value.includes('.')) {
    if (entry.value.split('.')[1].length >= props.decimalPlaces) {
      return
    }
    entry.value += digit
    return
  }

  entry.value += digit
}

function pressDot(): void {
  if (props.decimalPlaces <= 0) {
    return
  }

  if (afterEquals.value) {
    entry.value = '0.'
    afterEquals.value = false
    return
  }

  if (!entry.value.includes('.')) {
    entry.value += '.'
  }
}

function backspace(): void {
  if (afterEquals.value) {
    entry.value = '0'
    afterEquals.value = false
    return
  }

  entry.value = entry.value.length > 1 ? entry.value.slice(0, -1) : '0'
}

function clear(): void {
  reset('0')
}

function pressOp(op: Op): void {
  const current = toMinor(entry.value, props.decimalPlaces)
  acc.value = pendingOp.value ? applyOp(pendingOp.value, acc.value, current) : current
  pendingOp.value = op
  entry.value = '0'
  afterEquals.value = false
}

function evaluate(): void {
  const current = toMinor(entry.value, props.decimalPlaces)
  const result = pendingOp.value ? applyOp(pendingOp.value, acc.value, current) : current
  entry.value = toMajor(result, props.decimalPlaces).toFixed(props.decimalPlaces)
  acc.value = 0
  pendingOp.value = null
  afterEquals.value = true
}

function formattedEntry(): string {
  return toMajor(toMinor(entry.value, props.decimalPlaces), props.decimalPlaces).toFixed(props.decimalPlaces)
}

function apply(): void {
  if (!canApply.value) {
    return
  }
  emit('update:modelValue', formattedEntry())
  emit('apply')
}

defineExpose({ formattedEntry })

const keyClass = 'rounded-xl py-2 text-base font-semibold transition select-none'
const numberClass = 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:active:bg-slate-600'
const operatorClass = 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 active:bg-emerald-600/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:active:bg-emerald-500/35'
const utilityClass = 'bg-slate-200/70 text-slate-600 hover:bg-slate-300/70 active:bg-slate-400/50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:active:bg-slate-500'
const quickClass = 'bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 active:bg-sky-500/25 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 dark:active:bg-sky-500/40'
const balanceClass = 'w-full rounded-xl bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-700 transition select-none hover:bg-amber-500/20 active:bg-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 dark:active:bg-amber-500/40'
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col items-stretch gap-0.5 rounded-xl bg-slate-50 px-4 py-2 dark:bg-slate-800/50">
      <p class="h-4 truncate text-right text-xs text-slate-500 dark:text-slate-400">{{ expression || '\u00A0' }}</p>
      <p class="truncate text-right text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ display }}</p>
    </div>

    <button v-if="hasBalance" type="button" :class="balanceClass" @click="pressBalance">
      + Balance {{ formatLargeNumber(balanceMinor, decimalPlaces) }}
    </button>

    <div class="grid grid-cols-4 gap-1.5">
      <button v-for="digit in [7, 8, 9]" :key="digit" type="button" :class="[keyClass, numberClass]" @click="pressDigit(String(digit))">
        {{ digit }}
      </button>
      <button type="button" :class="[keyClass, operatorClass]" @click="pressOp('÷')">÷</button>

      <button v-for="digit in [4, 5, 6]" :key="digit" type="button" :class="[keyClass, numberClass]" @click="pressDigit(String(digit))">
        {{ digit }}
      </button>
      <button type="button" :class="[keyClass, operatorClass]" @click="pressOp('×')">×</button>

      <button v-for="digit in [1, 2, 3]" :key="digit" type="button" :class="[keyClass, numberClass]" @click="pressDigit(String(digit))">
        {{ digit }}
      </button>
      <button type="button" :class="[keyClass, operatorClass]" @click="pressOp('−')">−</button>

      <button type="button" :class="[keyClass, utilityClass]" @click="clear">C</button>
      <button type="button" :class="[keyClass, numberClass]" @click="pressDigit('0')">0</button>
      <button
        type="button"
        :disabled="decimalPlaces <= 0"
        :class="[keyClass, numberClass, { 'opacity-40': decimalPlaces <= 0 }]"
        @click="pressDot"
      >
        .
      </button>
      <button type="button" :class="[keyClass, operatorClass]" @click="pressOp('+')">+</button>

      <button type="button" :class="[keyClass, utilityClass]" @click="backspace">
        <span class="inline-flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M9 7a3 3 0 0 1 3-3h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6a3 3 0 0 1-3-3L8 9Z" />
            <path d="M10 9c-1.5 1.5-1.5 4.5 0 6" />
          </svg>
        </span>
      </button>
      <button type="button" :class="[keyClass, 'col-span-3', pendingOp ? 'bg-emerald-700 text-white hover:bg-emerald-600 active:bg-emerald-800' : operatorClass]" @click="evaluate">=</button>
    </div>

    <div v-if="quickFractions.length > 0" class="grid grid-cols-3 gap-1.5">
      <button
        v-for="quick in quickFractions"
        :key="quick.label"
        type="button"
        :class="[keyClass, quickClass]"
        @click="pressFraction(quick.minor)"
      >
        {{ quick.label }}
      </button>
    </div>

    <button
      type="button"
      :disabled="!canApply"
      class="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      @click="apply"
    >
      Save — {{ display }}
    </button>
  </div>
</template>
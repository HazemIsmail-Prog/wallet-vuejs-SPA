<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ColorDot from '../components/ColorDot.vue'
import { formatMoney } from '../utils/money'
import { apiError } from '../services/api'
import * as api from '../services/resources'
import { useCountryStore } from '../stores/country'
import { useDataVersion } from '../services/dataEvents'
import type { CategoryRollup, DashboardResponse } from '../types/api'

type DashboardData = DashboardResponse['data']

const countries = useCountryStore()
const router = useRouter()
const { dataVersion } = useDataVersion()

const data = ref<DashboardData | null>(null)
const loading = ref(false)
const error = ref('')

const countryId = computed(() => countries.activeCountryId)

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

const now = new Date()
const dateFrom = ref(toDateString(startOfMonth(now)))
const dateTo = ref(toDateString(endOfMonth(now)))

async function load(): Promise<void> {
  if (countryId.value === null) {
    data.value = null
    return
  }

  loading.value = true
  error.value = ''
  try {
    data.value = await api.getDashboard(countryId.value, {
      date_from: dateFrom.value,
      date_to: dateTo.value,
    })
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
watch(dataVersion, () => {
  void load()
})
watch(countryId, () => {
  const today = new Date()
  dateFrom.value = toDateString(startOfMonth(today))
  dateTo.value = toDateString(endOfMonth(today))
  void load()
})

function setThisMonth(): void {
  const today = new Date()
  dateFrom.value = toDateString(startOfMonth(today))
  dateTo.value = toDateString(endOfMonth(today))
  void load()
}

function shiftMonths(months: number): void {
  const from = new Date(`${dateFrom.value}T00:00:00`)
  const target = new Date(from.getFullYear(), from.getMonth() + months, 1)
  dateFrom.value = toDateString(startOfMonth(target))
  dateTo.value = toDateString(endOfMonth(target))
  void load()
}

function formatAmount(minor: number, symbol: string | undefined, decimalPlaces: number): string {
  return formatMoney(minor, decimalPlaces, symbol)
}

function amountClass(minor: number): string {
  if (minor > 0) {
    return 'text-emerald-700 dark:text-emerald-400'
  }

  if (minor < 0) {
    return 'text-red-600 dark:text-red-400'
  }

  return 'text-slate-400 dark:text-slate-500'
}

const hasActivity = (category: CategoryRollup): boolean =>
  category.total > 0 || (category.children ?? []).some((child) => child.total > 0)

const activeChildren = (category: CategoryRollup): CategoryRollup[] =>
  (category.children ?? []).filter((child) => child.total > 0).sort((a, b) => b.total - a.total)

const grandTotal = (category: CategoryRollup): number =>
  category.total + activeChildren(category).reduce((sum, child) => sum + child.total, 0)

const expenseCategories = computed(() =>
  (data.value?.categories ?? [])
    .filter((category) => category.type === 'expense' && hasActivity(category))
    .sort((a, b) => grandTotal(b) - grandTotal(a)),
)

const incomeCategories = computed(() =>
  (data.value?.categories ?? [])
    .filter((category) => category.type === 'income' && hasActivity(category))
    .sort((a, b) => grandTotal(b) - grandTotal(a)),
)

function categoryWidth(total: number, groupMax: number): string {
  if (groupMax === 0) {
    return '0%'
  }
  return `${Math.round((total / groupMax) * 100)}%`
}

function maxTreeTotal(categories: CategoryRollup[]): number {
  return Math.max(
    ...categories.flatMap((category) => [category.total, ...(category.children ?? []).map((child) => child.total)]),
    0,
  )
}

const maxExpense = computed(() => maxTreeTotal(expenseCategories.value))
const maxIncome = computed(() => maxTreeTotal(incomeCategories.value))

function openCategory(category: CategoryRollup): void {
  void router.push({
    name: 'transactions',
    query: {
      [category.type === 'expense' ? 'expense_category_id' : 'income_category_id']: String(category.id),
      date_from: dateFrom.value,
      date_to: dateTo.value,
    },
  })
}
</script>

<template>
  <section class="space-y-4">
    <p v-if="countryId === null" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Select or create a country first.
    </p>

    <template v-else>
      <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>

      <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <label class="flex items-center gap-1.5">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">From</span>
            <input
              v-model="dateFrom"
              type="date"
              class="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load()"
            />
          </label>
          <label class="flex items-center gap-1.5">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">To</span>
            <input
              v-model="dateTo"
              type="date"
              class="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load()"
            />
          </label>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
            aria-label="Previous month"
            @click="shiftMonths(-1)"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
            @click="setThisMonth"
          >
            This month
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
            aria-label="Next month"
            @click="shiftMonths(1)"
          >
            Next ›
          </button>
        </div>
      </div>

      <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

      <template v-else-if="data">
        <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Net this period</p>
          <p
            :class="['mt-1 text-2xl font-bold', amountClass(data.net)]"
          >
            {{ formatAmount(Math.abs(data.net), data.currency.symbol, data.currency.decimal_points) }}
          </p>

          <div class="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Income</p>
              <p class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                {{ formatAmount(data.income_total, data.currency.symbol, data.currency.decimal_points) }}
              </p>
            </div>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-red-500 dark:text-red-400">Expenses</p>
              <p class="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                {{ formatAmount(data.expense_total, data.currency.symbol, data.currency.decimal_points) }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total balance</p>
            <p :class="['text-lg font-semibold', amountClass(data.wallet_total)]">
              {{ formatAmount(Math.abs(data.wallet_total), data.currency.symbol, data.currency.decimal_points) }}
            </p>
          </div>

          <ul class="mt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2 text-sm">
            <li v-for="wallet in data.wallets" :key="wallet.id" class="flex items-center justify-between">
              <span class="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                <ColorDot :color="wallet.color" />
                <span class="truncate">{{ wallet.name }}</span>
              </span>
              <span :class="['font-medium', amountClass(wallet.current_balance)]">
                {{ formatAmount(Math.abs(wallet.current_balance), data.currency.symbol, data.currency.decimal_points) }}
              </span>
            </li>
          </ul>
        </div>

        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-medium uppercase tracking-wide text-red-500 dark:text-red-400">Expenses</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ formatAmount(data.expense_total, data.currency.symbol, data.currency.decimal_points) }}
            </p>
          </div>

          <div v-if="expenseCategories.length > 0" class="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div v-for="category in expenseCategories" :key="category.id" class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 text-sm"
                @click="openCategory(category)"
              >
                <span class="truncate font-medium text-slate-900 dark:text-slate-100">{{ category.name }}</span>
                <span class="shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                  {{ formatAmount(category.total, data.currency.symbol, data.currency.decimal_points) }}
                </span>
              </button>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div class="h-full rounded-full bg-red-400" :style="{ width: categoryWidth(category.total, maxExpense) }" />
              </div>

              <ul v-if="activeChildren(category).length > 0" class="mt-2 space-y-2 pl-5">
                <li v-for="child in activeChildren(category)" :key="child.id">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-2 text-sm"
                    @click="openCategory(child)"
                  >
                    <span class="truncate text-slate-600 dark:text-slate-300">{{ child.name }}</span>
                    <span class="shrink-0 font-medium text-slate-600 dark:text-slate-400">
                      {{ formatAmount(child.total, data.currency.symbol, data.currency.decimal_points) }}
                    </span>
                  </button>
                  <div class="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div class="h-full rounded-full bg-red-300" :style="{ width: categoryWidth(child.total, maxExpense) }" />
                  </div>
                </li>
              </ul>

              <div v-if="activeChildren(category).length > 0" class="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Total</span>
                <span class="font-medium">
                  {{ formatAmount(grandTotal(category), data.currency.symbol, data.currency.decimal_points) }}
                </span>
              </div>
            </div>
          </div>

          <p v-else class="mt-3 border-t border-slate-100 pb-2 pt-3 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
            No expense activity this period.
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Income</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ formatAmount(data.income_total, data.currency.symbol, data.currency.decimal_points) }}
            </p>
          </div>

          <div v-if="incomeCategories.length > 0" class="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div v-for="category in incomeCategories" :key="category.id" class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 text-sm"
                @click="openCategory(category)"
              >
                <span class="truncate font-medium text-slate-900 dark:text-slate-100">{{ category.name }}</span>
                <span class="shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                  {{ formatAmount(category.total, data.currency.symbol, data.currency.decimal_points) }}
                </span>
              </button>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div class="h-full rounded-full bg-emerald-400" :style="{ width: categoryWidth(category.total, maxIncome) }" />
              </div>

              <ul v-if="activeChildren(category).length > 0" class="mt-2 space-y-2 pl-5">
                <li v-for="child in activeChildren(category)" :key="child.id">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-2 text-sm"
                    @click="openCategory(child)"
                  >
                    <span class="truncate text-slate-600 dark:text-slate-300">{{ child.name }}</span>
                    <span class="shrink-0 font-medium text-slate-600 dark:text-slate-400">
                      {{ formatAmount(child.total, data.currency.symbol, data.currency.decimal_points) }}
                    </span>
                  </button>
                  <div class="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div class="h-full rounded-full bg-emerald-300" :style="{ width: categoryWidth(child.total, maxIncome) }" />
                  </div>
                </li>
              </ul>

              <div v-if="activeChildren(category).length > 0" class="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Total</span>
                <span class="font-medium">
                  {{ formatAmount(grandTotal(category), data.currency.symbol, data.currency.decimal_points) }}
                </span>
              </div>
            </div>
          </div>

          <p v-else class="mt-3 border-t border-slate-100 pb-2 pt-3 text-sm text-slate-400 dark:border-slate-800 dark:text-slate-500">
            No income activity this period.
          </p>
        </div>
      </div>
      </template>
    </template>
  </section>
</template>
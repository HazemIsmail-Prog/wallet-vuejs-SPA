<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import DropdownMenu, { type DropdownMenuItem } from '../components/DropdownMenu.vue'
import type { OptionCardsOption } from '../components/OptionCards.vue'
import ColorDot from '../components/ColorDot.vue'
import { useCurrencyFormat } from '../composables/useCurrencyFormat'
import { apiError } from '../services/api'
import * as api from '../services/resources'
import { useCountryStore } from '../stores/country'
import { useTransactionDialogStore } from '../stores/transactionDialog'
import { notifyDataChanged, useDataVersion } from '../services/dataEvents'
import type { Category, Contact, Transaction, TransactionType, Wallet, WalletTarget } from '../types/api'

const countries = useCountryStore()
const route = useRoute()
const { format } = useCurrencyFormat()
const { dataVersion } = useDataVersion()

const countryId = computed(() => countries.activeCountryId)

const transactions = ref<Transaction[]>([])
const wallets = ref<Wallet[]>([])
const categories = ref<Category[]>([])
const contacts = ref<Contact[]>([])
const loading = ref(false)
const loadingNext = ref(false)
const error = ref('')
const sentinel = ref<HTMLDivElement | null>(null)
const totals = ref<{ income: number; expense: number }>({ income: 0, expense: 0 })
const meta = ref<{ current_page: number; last_page: number; total: number } | null>(null)

const filters = reactive({
  type: '' as TransactionType | '',
  wallet_id: '' as number | '',
  category_id: '' as number | '',
  expense_category_id: '' as number | '',
  income_category_id: '' as number | '',
  contact_id: '' as number | '',
  date_from: '',
  date_to: '',
  search: '',
})

const filtersOpen = ref(false)

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'loan_to', label: 'Given to contact' },
  { value: 'loan_from', label: 'Received from contact' },
]

const typeFilterOptions: OptionCardsOption[] = [{ value: '', label: 'All' }, ...typeOptions]

const walletFilterOptions = computed<OptionCardsOption[]>(() => [
  { value: '', label: 'All' },
  ...wallets.value.map((wallet) => ({ value: wallet.id, label: wallet.name, color: wallet.color })),
])

function categoryFilterOptions(type: 'expense' | 'income'): OptionCardsOption[] {
  const options: OptionCardsOption[] = [{ value: '', label: 'All' }]

  const byName = (a: Category, b: Category): number =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

  const inType = categories.value.filter((category) => category.type === type)
  const roots = inType.filter((category) => category.category_id === null).sort(byName)

  for (const root of roots) {
    options.push({ value: root.id, label: root.name })

    inType
      .filter((category) => category.category_id === root.id)
      .sort(byName)
      .forEach((child) => options.push({ value: child.id, label: `- ${child.name}` }))
  }

  return options
}

const expenseCategoryFilterOptions = computed<OptionCardsOption[]>(() => categoryFilterOptions('expense'))

const incomeCategoryFilterOptions = computed<OptionCardsOption[]>(() => categoryFilterOptions('income'))

function queryId(name: string): number | '' {
  const value = route.query[name]
  if (value === undefined) {
    return ''
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? '' : parsed
}

function applyQueryFilters(): void {
  const walletId = queryId('wallet_id')
  const categoryId = queryId('category_id')
  const expenseCategoryId = queryId('expense_category_id')
  const incomeCategoryId = queryId('income_category_id')
  const contactId = queryId('contact_id')
  const dateFrom = route.query.date_from
  const dateTo = route.query.date_to

  if (walletId !== '') {
    filters.wallet_id = walletId
  }
  if (categoryId !== '') {
    filters.category_id = categoryId
  }
  if (expenseCategoryId !== '') {
    filters.expense_category_id = expenseCategoryId
  }
  if (incomeCategoryId !== '') {
    filters.income_category_id = incomeCategoryId
  }
  if (contactId !== '') {
    filters.contact_id = contactId
  }
  if (typeof dateFrom === 'string' && dateFrom !== '') {
    filters.date_from = dateFrom
  }
  if (typeof dateTo === 'string' && dateTo !== '') {
    filters.date_to = dateTo
  }
}

async function load(page = 1, append = false): Promise<void> {
  if (countryId.value === null) {
    transactions.value = []
    totals.value = { income: 0, expense: 0 }
    meta.value = null
    return
  }

  if (!append) {
    loading.value = true
  }
  error.value = ''
  try {
    const result = await api.listTransactions(countryId.value, {
      type: filters.type || undefined,
      wallet_id: filters.wallet_id || undefined,
      category_id: filters.category_id || undefined,
      expense_category_id: filters.expense_category_id || undefined,
      income_category_id: filters.income_category_id || undefined,
      contact_id: filters.contact_id || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      search: filters.search || undefined,
      page,
    })
    if (append) {
      const seen = new Set(transactions.value.map((transaction) => transaction.id))
      transactions.value = [
        ...transactions.value,
        ...result.data.filter((transaction) => !seen.has(transaction.id)),
      ]
    } else {
      transactions.value = result.data
    }
    totals.value = result.totals ?? { income: 0, expense: 0 }
    meta.value = { current_page: result.meta.current_page, last_page: result.meta.last_page, total: result.meta.total }
  } catch (err) {
    error.value = apiError(err)
  } finally {
    if (!append) {
      loading.value = false
    }
    void nextTick(observeSentinel)
  }
}

async function loadNext(): Promise<void> {
  if (loading.value || loadingNext.value || meta.value === null) {
    return
  }

  if (meta.value.current_page >= meta.value.last_page) {
    return
  }

  loadingNext.value = true
  try {
    await load(meta.value.current_page + 1, true)
  } finally {
    loadingNext.value = false
  }
}

let observer: IntersectionObserver | null = null

function observeSentinel(): void {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadNext()
      }
    },
    { rootMargin: '200px 0px' },
  )
  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
}

async function loadOptions(): Promise<void> {
  if (countryId.value === null) {
    return
  }

  const [walletList, categoryList, contactList] = await Promise.all([
    api.listWallets(countryId.value, true),
    api.listCategories(countryId.value),
    api.listContacts(countryId.value),
  ])

  wallets.value = walletList
  categories.value = categoryList
  contacts.value = contactList
}

onMounted(() => {
  void loadOptions()
  applyQueryFilters()
  void load()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(
  () => route.query,
  () => {
    applyQueryFilters()
    void load(1)
  },
)

watch(dataVersion, () => {
  void load(meta.value?.current_page ?? 1)
})

watch(countryId, () => {
  filters.type = ''
  filters.wallet_id = ''
  filters.category_id = ''
  filters.expense_category_id = ''
  filters.income_category_id = ''
  filters.contact_id = ''
  filters.date_from = ''
  filters.date_to = ''
  filters.search = ''
  applyQueryFilters()
  void loadOptions()
  void load()
})

function resetFilters(): void {
  filters.type = ''
  filters.wallet_id = ''
  filters.category_id = ''
  filters.expense_category_id = ''
  filters.income_category_id = ''
  filters.contact_id = ''
  filters.date_from = ''
  filters.date_to = ''
  filters.search = ''
  void load(1)
}

let searchTimer: number | undefined

function onSearchInput(): void {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => void load(1), 400)
}

const deletingId = ref<number | null>(null)
const dialog = useTransactionDialogStore()

async function remove(transaction: Transaction): Promise<void> {
  deletingId.value = transaction.id
  error.value = ''
  try {
    await api.deleteTransaction(transaction.id)
    notifyDataChanged()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    deletingId.value = null
  }
}

function dateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startOfToday.getTime() - dateObj.getTime()) / 86400000)

  if (diffDays === 0) {
    return 'Today'
  }
  if (diffDays === 1) {
    return 'Yesterday'
  }
  return dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const groupedTransactions = computed(() => {
  const groups: { date: string; label: string; income: number; expense: number; items: Transaction[] }[] = []

  for (const transaction of transactions.value) {
    const date = transaction.date
    const last = groups[groups.length - 1]
    if (last && last.date === date) {
      last.items.push(transaction)
    } else {
      groups.push({ date, label: dateLabel(date), income: 0, expense: 0, items: [transaction] })
    }

    const current = groups[groups.length - 1]!
    if (transaction.type === 'income' || transaction.type === 'loan_from') {
      current.income += transaction.amount
    } else if (transaction.type === 'expense' || transaction.type === 'loan_to') {
      current.expense += transaction.amount
    }
  }

  return groups
})

function cardActions(transaction: Transaction): DropdownMenuItem[] {
  return [
    { label: 'Edit', onClick: () => dialog.openEdit(transaction) },
    {
      label: deletingId.value === transaction.id ? 'Deleting…' : 'Delete',
      danger: true,
      disabled: deletingId.value === transaction.id,
      onClick: () => remove(transaction),
    },
  ]
}

const typeStyles: Record<TransactionType, string> = {
  expense: 'text-red-600 dark:text-red-400',
  income: 'text-emerald-600 dark:text-emerald-400',
  transfer: 'text-slate-500 dark:text-slate-400',
  loan_to: 'text-red-600 dark:text-red-400',
  loan_from: 'text-emerald-600 dark:text-emerald-400',
}

const typeLabels: Record<TransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  loan_to: 'Given to contact',
  loan_from: 'Received from contact',
}

function amountFor(transaction: Transaction): string {
  return format(transaction.amount)
}

function transferTarget(transaction: Transaction): WalletTarget | null {
  return transaction.target_type === 'wallet' ? (transaction.target as WalletTarget | null) : null
}

function titleFor(transaction: Transaction): string {
  if (transaction.type === 'transfer') {
    return 'Transfer'
  }

  if (transaction.type === 'loan_to' || transaction.type === 'loan_from') {
    return transaction.target?.name ?? typeLabels[transaction.type]
  }

  const category =
    transaction.target_type === 'category' ? categories.value.find((c) => c.id === transaction.target_id) : undefined
  if (!category) {
    return typeLabels[transaction.type]
  }

  if (category.category_id === null) {
    return category.name
  }

  const parent = categories.value.find((c) => c.id === category.category_id)

  return parent ? `${parent.name} - ${category.name}` : category.name
}
</script>

<template>
  <section class="space-y-4">
    <p v-if="countryId === null" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Select or create a country first.
    </p>

    <template v-else>
      <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>

      <form class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3" @submit.prevent>
        <div class="flex items-center justify-between gap-2" :class="filtersOpen ? 'mb-3' : ''">
          <button
            type="button"
            class="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
            :aria-expanded="filtersOpen"
            @click="filtersOpen = !filtersOpen"
          >
            <svg
              class="h-4 w-4 transition-transform"
              :class="filtersOpen ? 'rotate-90' : ''"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clip-rule="evenodd" />
            </svg>
            Filters
          </button>
          <button type="button" class="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300" @click="resetFilters">
            Reset
          </button>
        </div>

        <div v-show="filtersOpen" class="space-y-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="block">
            <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</span>
            <select
              v-model="filters.type"
              class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800/60 dark:text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load(1)"
            >
              <option v-for="option in typeFilterOptions" :key="String(option.value)" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="block">
            <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Wallet</span>
            <select
              v-model="filters.wallet_id"
              class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800/60 dark:text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load(1)"
            >
              <option v-for="option in walletFilterOptions" :key="String(option.value)" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="block">
            <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Expense category</span>
            <select
              v-model="filters.expense_category_id"
              class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800/60 dark:text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load(1)"
            >
              <option v-for="option in expenseCategoryFilterOptions" :key="String(option.value)" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="block">
            <span class="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Income category</span>
            <select
              v-model="filters.income_category_id"
              class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-800/60 dark:text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load(1)"
            >
              <option v-for="option in incomeCategoryFilterOptions" :key="String(option.value)" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <label class="flex items-center gap-1">
            <span class="text-slate-500 dark:text-slate-400">From</span>
            <input
              v-model="filters.date_from"
              type="date"
              class="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load(1)"
            />
          </label>
          <label class="flex items-center gap-1">
            <span class="text-slate-500 dark:text-slate-400">To</span>
            <input
              v-model="filters.date_to"
              type="date"
              class="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              @change="void load(1)"
            />
          </label>
          <input
            v-model="filters.search"
            type="search"
            placeholder="Search…"
            class="min-w-40 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            @input="onSearchInput"
          />
        </div>
        </div>
      </form>

      <div v-if="totals.income > 0 || totals.expense > 0" class="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5">
        <span class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Totals</span>
        <div class="flex items-center gap-3 text-sm">
          <span v-if="totals.income > 0" class="font-semibold text-emerald-600 dark:text-emerald-400">{{ format(Math.abs(totals.income)) }}</span>
          <span v-if="totals.expense > 0" class="font-semibold text-red-600 dark:text-red-400">{{ format(Math.abs(totals.expense)) }}</span>
        </div>
      </div>

      <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

      <template v-else>
        <div v-if="transactions.length === 0" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No transactions{{ filters.type || filters.search ? ' match your filters' : ' yet' }}.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="group in groupedTransactions"
            :key="group.date"
            class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ group.label }}</h3>
              <div class="flex items-center gap-2 text-xs">
                <span v-if="group.income > 0" class="font-semibold text-emerald-600 dark:text-emerald-400">{{ format(Math.abs(group.income)) }}</span>
                <span v-if="group.expense > 0" class="font-semibold text-red-600 dark:text-red-400">{{ format(Math.abs(group.expense)) }}</span>
              </div>
            </div>
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              <li v-for="transaction in group.items" :key="transaction.id">
                <div class="flex items-center justify-between gap-3 px-4 py-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {{ titleFor(transaction) }}
                    </p>
                    <p class="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      <template v-if="transaction.type === 'transfer'">
                        <ColorDot :color="transaction.wallet?.color ?? null" />
                        <span class="min-w-0 truncate">{{ transaction.wallet?.name ?? 'Source wallet' }}</span>
                        <span aria-hidden="true">→</span>
                        <ColorDot :color="transferTarget(transaction)?.color ?? null" />
                        <span class="min-w-0 truncate">{{ transferTarget(transaction)?.name ?? 'Destination wallet' }}</span>
                      </template>
                      <template v-else>
                        <ColorDot :color="transaction.wallet?.color ?? null" />
                        <span class="min-w-0 truncate">{{ transaction.wallet?.name ?? 'Wallet' }}</span>
                      </template>
                    </p>
                    <p v-if="transaction.notes" class="mt-0.5 whitespace-pre-line break-words text-xs text-slate-400 dark:text-slate-500">
                      {{ transaction.notes }}
                    </p>
                  </div>

                  <div class="flex shrink-0 items-center gap-1">
                    <div class="flex flex-col items-end gap-0.5">
                      <p :class="['text-sm font-semibold', typeStyles[transaction.type]]">
                        {{ amountFor(transaction) }}
                      </p>
                      <span class="text-xs text-slate-400 dark:text-slate-500">{{ transaction.time }}</span>
                    </div>
                    <DropdownMenu :items="cardActions(transaction)" />
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <p v-if="loadingNext" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading more…
        </p>

        <p
          v-else-if="meta && meta.last_page > 1 && meta.current_page >= meta.last_page"
          class="py-4 text-center text-xs text-slate-400 dark:text-slate-500"
        >
          End of list · {{ meta.total }} total
        </p>

        <div ref="sentinel" aria-hidden="true" />
      </template>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import CalculatorStep from './CalculatorStep.vue'
import CategoryStep from './CategoryStep.vue'
import ModalDialog from './ModalDialog.vue'
import OptionCards, { type OptionCardsOption } from './OptionCards.vue'
import { useCurrencyFormat } from '../composables/useCurrencyFormat'
import { apiError } from '../services/api'
import * as api from '../services/resources'
import type { TransactionPayload } from '../services/resources'
import { useCountryStore } from '../stores/country'
import { notifyDataChanged, useDataVersion } from '../services/dataEvents'
import { toMajor, toMinor } from '../utils/money'
import type { Category, CategoryType, Contact, Transaction, TransactionTargetType, TransactionType, Wallet } from '../types/api'

const props = defineProps<{
  open: boolean
  initialWalletId?: number | null
  editing?: Transaction | null
}>()

const emit = defineEmits<{ close: []; saved: [] }>()

const countries = useCountryStore()
const { active, convertToMinor, format } = useCurrencyFormat()

const countryId = computed(() => countries.activeCountryId)
const { dataVersion } = useDataVersion()

const wallets = ref<Wallet[]>([])
const categories = ref<Category[]>([])
const contacts = ref<Contact[]>([])
const optionsKey = ref('')
const loadingOptions = ref(false)
const awaitingStep = ref(0)
let loadPromise: Promise<void> | null = null

function loadOptions(): Promise<void> {
  if (countryId.value === null) {
    return Promise.resolve()
  }

  const key = `${countryId.value}:${dataVersion.value}`
  if (optionsKey.value === key) {
    return Promise.resolve()
  }
  optionsKey.value = key

  if (loadPromise === null) {
    loadingOptions.value = true
    loadPromise = Promise.all([
      api.listWallets(countryId.value, true),
      api.listCategories(countryId.value),
      api.listContacts(countryId.value),
    ])
      .then(([walletList, categoryList, contactList]) => {
        wallets.value = walletList
        categories.value = categoryList
        contacts.value = contactList
      })
      .finally(() => {
        loadingOptions.value = false
        loadPromise = null
      })
  }

  return loadPromise
}

watch(countryId, () => {
  void loadOptions()
})

function toLocalDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toLocalTime(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const submitting = ref(false)
const formError = ref('')
const form = reactive({
  type: '' as TransactionType,
  amount: '',
  wallet_id: '' as number | '',
  target_type: '' as TransactionTargetType | '',
  target_id: '' as number | '',
  notes: '',
  date: toLocalDate(new Date()),
  time: toLocalTime(new Date()),
})

function resetForm(): void {
  form.type = '' as TransactionType
  form.amount = ''
  form.wallet_id = ''
  form.target_type = ''
  form.target_id = ''
  form.notes = ''
  form.date = toLocalDate(new Date())
  form.time = toLocalTime(new Date())
}

const stepLabels = computed(() => {
  switch (form.type) {
    case 'transfer':
      return ['Type', 'From wallet', 'To wallet', 'Amount', 'Description']
    case 'loan_to':
      return ['Type', 'From wallet', 'To who', 'Amount', 'Description']
    case 'loan_from':
      return ['Type', 'From who', 'To wallet', 'Amount', 'Description']
    default:
      return ['Type', 'Wallet', 'Category', 'Amount', 'Description']
  }
})
const step = ref(1)
const stepAreaRef = ref<HTMLElement | null>(null)

let stepHeightAnim: Animation | null = null

function beforeStepLeave(): void {
  const el = stepAreaRef.value
  if (!el) return
  stepHeightAnim?.cancel()
  stepHeightAnim = null
  el.style.height = `${el.offsetHeight}px`
}

function beforeStepEnter(): void {
  const el = stepAreaRef.value
  if (!el) return
  stepHeightAnim?.cancel()
  stepHeightAnim = null

  const from = el.offsetHeight
  const to = el.scrollHeight
  if (from === to) {
    el.style.height = 'auto'
    return
  }

  el.style.height = `${to}px`
  const anim = el.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    { duration: 300, easing: 'ease-in-out' },
  )
  anim.addEventListener('finish', () => {
    stepHeightAnim = null
    const area = stepAreaRef.value
    if (area) {
      area.style.height = 'auto'
    }
  })
  stepHeightAnim = anim
}

function walletName(id: number | ''): string {
  if (id === '') {
    return ''
  }
  return wallets.value.find((wallet) => wallet.id === id)?.name ?? ''
}

function contactName(id: number | ''): string {
  if (id === '') {
    return ''
  }
  return contacts.value.find((contact) => contact.id === id)?.name ?? ''
}

function categoryName(id: number | ''): string {
  if (id === '') {
    return ''
  }
  const category = categories.value.find((c) => c.id === id)
  if (!category) {
    return ''
  }
  if (category.category_id !== null) {
    const parent = categories.value.find((c) => c.id === category.category_id)
    if (parent) {
      return `${parent.name} - ${category.name}`
    }
  }
  return category.name
}

const stepSummaries = computed<string[]>(() => {
  const type = typeOptions.find((option) => option.value === form.type)?.label ?? ''

  let second = ''
  let third = ''
  if (isLoanFrom.value) {
    second = contactName(form.target_id)
    third = walletName(form.wallet_id)
  } else {
    second = walletName(form.wallet_id)
    third = isTransfer.value
      ? walletName(form.target_id)
      : isLoanTo.value
        ? contactName(form.target_id)
        : categoryName(form.target_id)
  }

  const amount = amountValid.value ? format(toMinor(form.amount, active.value?.decimal_points ?? 2)) : ''
  const notes = form.notes.trim() !== '' ? 'Notes added' : ''

  return [type, second, third, amount, notes]
})

async function goTo(next: number): Promise<void> {
  formError.value = ''
  if (next > 1) {
    awaitingStep.value = next
    await loadOptions()
    awaitingStep.value = 0
  }
  step.value = next
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.editing) {
        const edited = props.editing
        form.type = edited.type
        form.amount = String(toMajor(edited.amount, active.value?.decimal_points ?? 2))
        form.wallet_id = edited.wallet_id
        form.target_type = edited.target_type
        form.target_id = edited.target_id
        form.notes = edited.notes ?? ''
        form.date = edited.date
        form.time = edited.time.slice(0, 5)
      } else {
        resetForm()
        form.wallet_id = props.initialWalletId ?? ''
      }
      goTo(1)
      void loadOptions()
    }
  },
  { immediate: true },
)

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'loan_from', label: 'Received from contact' },
  { value: 'loan_to', label: 'Given to contact' },
]

const greenCard = {
  selected: 'border-emerald-600 bg-emerald-100 ring-2 ring-emerald-500/30 dark:bg-emerald-500/20 dark:ring-emerald-400/30',
  idle: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20',
}

const redCard = {
  selected: 'border-red-500 bg-red-100 ring-2 ring-red-500/30 dark:bg-red-500/20 dark:ring-red-400/30',
  idle: 'border-red-300 bg-red-50 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:hover:bg-red-500/20',
}

const typeCardStyles: Record<TransactionType, { selected: string; idle: string }> = {
  income: greenCard,
  loan_from: greenCard,
  expense: redCard,
  loan_to: redCard,
  transfer: {
    selected: 'border-sky-500 bg-sky-100 ring-2 ring-sky-500/30 dark:bg-sky-500/20 dark:ring-sky-400/30',
    idle: 'border-sky-300 bg-sky-50 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:hover:bg-sky-500/20',
  },
}

const typeHints: Record<TransactionType, string> = {
  expense: 'Money leaves the wallet',
  income: 'Money enters the wallet',
  transfer: 'Move money between wallets',
  loan_to: 'Give money to someone',
  loan_from: 'Receive money from someone',
}

function selectType(type: TransactionType): void {
  if (type !== form.type) {
    form.type = type
    form.target_type = type === 'transfer' ? 'wallet' : type === 'loan_to' || type === 'loan_from' ? 'contact' : 'category'
    form.target_id = ''
  }
  goTo(prefilledWallet.value && type !== 'loan_from' ? 3 : 2)
}

const isCategoryType = computed(() => form.type === 'expense' || form.type === 'income')
const isTransfer = computed(() => form.type === 'transfer')
const isLoanTo = computed(() => form.type === 'loan_to')
const isLoanFrom = computed(() => form.type === 'loan_from')

const walletOptions = computed<OptionCardsOption[]>(() =>
  wallets.value.map((wallet) => ({
    value: wallet.id,
    label: wallet.name,
    hint: format(Math.abs(wallet.current_balance)),
    hintClass: walletBalanceHintClass(wallet.current_balance),
    color: wallet.color,
  })),
)

function walletBalanceHintClass(balance: number): string {
  return balance < 0 ? 'font-semibold text-red-400' : 'text-white/80'
}

const transferTargetOptions = computed<OptionCardsOption[]>(() =>
  wallets.value
    .filter((wallet) => wallet.id !== form.wallet_id)
    .map((wallet) => ({
      value: wallet.id,
      label: wallet.name,
      hint: format(Math.abs(wallet.current_balance)),
      hintClass: walletBalanceHintClass(wallet.current_balance),
      color: wallet.color,
    })),
)

function balanceHintClass(balance: number): string {
  if (balance < 0) return 'font-semibold text-red-600 dark:text-red-400'
  if (balance > 0) return 'font-semibold text-emerald-600 dark:text-emerald-400'
  return 'text-slate-500 dark:text-slate-400'
}

const contactOptions = computed<OptionCardsOption[]>(() =>
  contacts.value.map((contact) => ({
    value: contact.id,
    label: contact.name,
    hint: contact.balance === 0 ? undefined : format(Math.abs(contact.balance)),
    hintClass: balanceHintClass(contact.balance),
  })),
)

const prefilledWallet = computed(() => props.initialWalletId !== null)

function nextStepAfterSelection(): number {
  if (!prefilledWallet.value) {
    return step.value + 1
  }

  const next = step.value + 1

  if (next === 2) {
    return 3
  }

  if (next === 3 && isLoanFrom.value) {
    return 4
  }

  return next
}

function setWallet(value: string | number | null): void {
  form.wallet_id = (value ?? '') as number | ''
  goTo(nextStepAfterSelection())
}

function setDestination(value: string | number | null): void {
  form.target_id = (value ?? '') as number | ''
  goTo(nextStepAfterSelection())
}

function setContact(value: string | number | null): void {
  form.target_id = (value ?? '') as number | ''
  goTo(nextStepAfterSelection())
}

function setCategory(value: string | number | null): void {
  form.target_id = (value ?? '') as number | ''
  goTo(nextStepAfterSelection())
}

const step3Label = computed(() => (isLoanTo.value ? 'To who' : 'To wallet'))

const sourceLabel = computed(() => (isTransfer.value || isLoanTo.value ? 'From wallet' : 'Wallet'))

const step3Options = computed<OptionCardsOption[]>(() => {
  if (isLoanTo.value) {
    return contactOptions.value
  }
  if (isTransfer.value) {
    return transferTargetOptions.value
  }
  return walletOptions.value
})

const step3Model = computed((): number | '' => {
  if (isLoanTo.value || isTransfer.value) {
    return form.target_id
  }
  return form.wallet_id
})

function setStep3(value: string | number | null): void {
  if (isLoanTo.value) {
    setContact(value)
  } else if (isTransfer.value) {
    setDestination(value)
  } else {
    setWallet(value)
  }
}

const amountValid = computed(() => toMinor(form.amount, active.value?.decimal_points ?? 2) > 0)

const calculatorRef = ref<InstanceType<typeof CalculatorStep> | null>(null)

function continueToDescription(): void {
  const value = calculatorRef.value?.formattedEntry()
  if (value) {
    form.amount = value
  }
  goTo(5)
}

const balanceWallet = computed(() => wallets.value.find((wallet) => wallet.id === form.wallet_id))

async function save(): Promise<void> {
  formError.value = ''
  submitting.value = true
  const payload: TransactionPayload = {
    type: form.type,
    amount: convertToMinor(form.amount),
    wallet_id: form.wallet_id as number,
    target_type: form.target_type as TransactionTargetType,
    target_id: form.target_id as number,
    notes: form.notes || null,
    date: form.date,
    time: form.time,
  }
  try {
    if (props.editing) {
      await api.updateTransaction(props.editing.id, payload)
    } else {
      await api.storeTransaction(countryId.value as number, payload)
    }
    resetForm()
    goTo(1)
    notifyDataChanged()
    emit('saved')
  } catch (err) {
    formError.value = apiError(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <ModalDialog :title="editing ? 'Edit transaction' : 'Add transaction'" :open="open" @close="emit('close')">
      <template #header>
        <div class="flex gap-1.5">
          <div v-for="(label, index) in stepLabels" :key="label" class="min-w-0 flex-1">
            <div
              class="h-1.5 rounded-full"
              :class="index + 1 <= step ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'"
            />
            <p
              class="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide"
              :class="index + 1 === step ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'"
            >
              {{ label }}
            </p>
            <p class="truncate text-[10px] font-medium text-slate-600 dark:text-slate-300">
              {{ stepSummaries[index] || '\u00A0' }}
            </p>
          </div>
        </div>
      </template>

      <div ref="stepAreaRef" class="relative overflow-hidden">
        <Transition
          name="step"
          mode="out-in"
          @before-leave="beforeStepLeave"
          @before-enter="beforeStepEnter"
        >
          <div v-if="step === 1" key="1">
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="rounded-xl border p-3.5 text-center transition"
              :class="[
                option.value === 'transfer' ? 'col-span-2' : '',
                form.type === option.value
                  ? typeCardStyles[option.value].selected
                  : typeCardStyles[option.value].idle,
              ]"
              @click="selectType(option.value)"
            >
              <span class="block text-sm font-semibold text-slate-900 dark:text-slate-100">{{ option.label }}</span>
              <span class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{{ typeHints[option.value] }}</span>
            </button>
          </div>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Tap a type to continue.</p>
        </div>

        <div v-else-if="step === 2" key="2" class="space-y-3">
          <div v-if="isLoanFrom" class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">From who</span>
            <OptionCards
              :options="contactOptions"
              :model-value="form.target_id"
              @update:model-value="setContact"
            />
          </div>
          <div v-else class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{{ sourceLabel }}</span>
            <OptionCards
              :options="walletOptions"
              :model-value="form.wallet_id"
              solid
              glossy
              @update:model-value="setWallet"
            />
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400">Tap a card to continue.</p>
        </div>

        <div v-else-if="step === 3" key="3" class="space-y-3">
          <template v-if="isCategoryType">
            <div class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
              <CategoryStep
                :categories="categories"
                :model-value="form.target_id"
                :type="form.type as CategoryType"
                @select="setCategory"
              />
            </div>
          </template>
          <template v-else>
            <div class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{{ step3Label }}</span>
              <OptionCards
                :options="step3Options"
                :model-value="step3Model"
                solid
                glossy
                @update:model-value="setStep3"
              />
            </div>

            <p class="text-xs text-slate-500 dark:text-slate-400">Tap a card to continue.</p>
          </template>
        </div>

        <div v-else-if="step === 4" key="4" class="space-y-3">
          <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400" role="alert">{{ formError }}</p>

          <CalculatorStep
            ref="calculatorRef"
            :active="step === 4"
            :decimal-places="active?.decimal_points ?? 2"
            :model-value="form.amount"
            :wallet-balance="balanceWallet?.current_balance"
            @update:model-value="form.amount = $event"
            @apply="save"
          />
        </div>

        <div v-else-if="step === 5" key="5" class="space-y-3">
          <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400" role="alert">{{ formError }}</p>

          <label class="block">
            <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Notes</span>
            <textarea
              v-model="form.notes"
              rows="3"
              maxlength="500"
              class="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700"
            />
          </label>

          <div class="grid grid-cols-2 gap-2">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Date</span>
              <input
                v-model="form.date"
                type="date"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Time</span>
              <input
                v-model="form.time"
                type="time"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700"
              />
            </label>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="loadingOptions && awaitingStep > 0"
          class="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-white/70 text-sm font-medium text-slate-600 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-300"
          aria-live="polite"
        >
          <span
            class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300"
            aria-hidden="true"
          />
          Loading options…
        </div>
      </Transition>
      </div>
      <template #footer>
        <div class="flex flex-col gap-2">
          <div v-if="step === 1" class="min-h-[38px]" aria-hidden="true" />

          <button
            v-if="step === 2"
            type="button"
            class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
            @click="goTo(1)"
          >
            Back
          </button>

          <div v-else-if="step === 3 && isCategoryType" class="flex gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
              @click="goTo(2)"
            >
              Back
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="form.target_id === ''"
              @click="goTo(4)"
            >
              Continue
            </button>
          </div>

          <button
            v-else-if="step === 3"
            type="button"
            class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
            @click="goTo(2)"
          >
            Back
          </button>

          <div v-else-if="step === 4" class="flex gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
              @click="goTo(3)"
            >
              Back
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              @click="continueToDescription"
            >
              Add description
            </button>
          </div>

          <div v-else-if="step === 5" class="flex gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
              @click="goTo(4)"
            >
              Back
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              @click="save"
            >
              {{ submitting ? 'Saving…' : (editing ? 'Save changes' : 'Add transaction') }}
            </button>
          </div>
        </div>
      </template>
  </ModalDialog>
</template>

<style>
.step-enter-active,
.step-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.step-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
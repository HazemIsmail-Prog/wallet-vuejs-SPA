<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DropdownMenu, { type DropdownMenuItem } from '../components/DropdownMenu.vue'
import ModalDialog from '../components/ModalDialog.vue'
import MoneyInput from '../components/MoneyInput.vue'
import { useCurrencyFormat } from '../composables/useCurrencyFormat'
import { apiError } from '../services/api'
import * as api from '../services/resources'
import { useCountryStore } from '../stores/country'
import { useTransactionDialogStore } from '../stores/transactionDialog'
import { notifyDataChanged, useDataVersion } from '../services/dataEvents'
import { toMajor } from '../utils/money'
import { hexToRgba } from '../utils/color'
import type { Wallet } from '../types/api'

function cardBackground(color: string | null): Record<string, string> | undefined {
  if (!color) {
    return undefined
  }

  return {
    backgroundImage: [
      'linear-gradient(45deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)',
      `linear-gradient(to top right, ${color}, color-mix(in srgb, ${color} 60%, black))`,
    ].join(', '),
    borderColor: hexToRgba(color, 0.6) ?? color,
  }
}

function balanceTextClass(minor: number): string {
  if (minor > 0) {
    return 'text-emerald-600 dark:text-emerald-500'
  }

  if (minor < 0) {
    return 'text-red-600 dark:text-red-500'
  }

  return 'text-slate-400 dark:text-slate-500'
}

function walletBalanceTextClass(minor: number): string {
  return minor < 0 ? 'text-red-500 dark:text-red-400' : 'text-white'
}

const countries = useCountryStore()
const { active, convertToMinor, format } = useCurrencyFormat()
const { dataVersion } = useDataVersion()

const wallets = ref<Wallet[]>([])
const loading = ref(false)
const error = ref('')

const countryId = computed(() => countries.activeCountryId)

async function load(): Promise<void> {
  if (countryId.value === null) {
    wallets.value = []
    return
  }

  loading.value = true
  error.value = ''
  try {
    wallets.value = await api.listWallets(countryId.value)
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(dataVersion, () => {
  void load()
})
watch(countryId, () => {
  showCreate.value = false
  editing.value = null
  void load()
})

const visibleWallets = computed(() => wallets.value.filter((wallet) => wallet.is_visible))
const hiddenWallets = computed(() => wallets.value.filter((wallet) => !wallet.is_visible))

const totalBalance = computed(() => wallets.value.reduce((sum, wallet) => sum + wallet.current_balance, 0))

const showCreate = ref(false)
const submitting = ref(false)
const form = reactive({
  name: '',
  init_amount: '',
  color: null as string | null,
})

const formColorModel = computed<string>({
  get: () => form.color ?? '#10b981',
  set: (value: string) => {
    form.color = value
  },
})

function resetForm(): void {
  form.name = ''
  form.init_amount = ''
  form.color = null
}

async function create(): Promise<void> {
  error.value = ''
  submitting.value = true
  try {
    await api.storeWallet(countryId.value as number, {
      name: form.name,
      init_amount: convertToMinor(form.init_amount),
      color: form.color,
    })
    showCreate.value = false
    resetForm()
    notifyDataChanged()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

const editing = ref<Wallet | null>(null)
const editName = ref('')
const editInitAmount = ref('')
const editColor = ref<string | null>(null)
const editError = ref('')

const editColorModel = computed<string>({
  get: () => editColor.value ?? '#10b981',
  set: (value: string) => {
    editColor.value = value
  },
})

function startEdit(wallet: Wallet): void {
  editing.value = wallet
  editName.value = wallet.name
  editInitAmount.value =
    wallet.init_amount != null ? String(toMajor(wallet.init_amount, active.value?.decimal_points ?? 2)) : ''
  editColor.value = wallet.color
  editError.value = ''
}

async function saveEdit(): Promise<void> {
  if (!editing.value) {
    return
  }

  editError.value = ''
  submitting.value = true
  try {
    await api.updateWallet(countryId.value as number, editing.value.id, {
      name: editName.value,
      init_amount: convertToMinor(editInitAmount.value),
      color: editColor.value,
    })
    editing.value = null
    notifyDataChanged()
  } catch (err) {
    editError.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

async function toggleVisible(wallet: Wallet): Promise<void> {
  try {
    await api.updateWallet(countryId.value as number, wallet.id, {
      is_visible: !wallet.is_visible,
    })
    notifyDataChanged()
  } catch (err) {
    error.value = apiError(err)
  }
}

const moveError = ref('')

async function moveWallet(wallet: Wallet, direction: -1 | 1): Promise<void> {
  if (countryId.value === null) {
    return
  }

  moveError.value = ''
  const group = wallets.value.filter((item) => item.is_visible === wallet.is_visible)
  const index = group.findIndex((item) => item.id === wallet.id)
  const neighbor = group[index + direction]

  if (neighbor === undefined) {
    return
  }

  const sequence = wallets.value.map((item) => item.id)
  const from = sequence.indexOf(wallet.id)
  const to = sequence.indexOf(neighbor.id)
  ;[sequence[from], sequence[to]] = [sequence[to], sequence[from]]

  try {
    await api.reorderWallets(countryId.value, sequence)
    await load()
  } catch (err) {
    moveError.value = apiError(err)
  }
}

function canMoveUp(wallet: Wallet): boolean {
  const group = wallets.value.filter((item) => item.is_visible === wallet.is_visible)
  return group.findIndex((item) => item.id === wallet.id) > 0
}

function canMoveDown(wallet: Wallet): boolean {
  const group = wallets.value.filter((item) => item.is_visible === wallet.is_visible)
  return group.findIndex((item) => item.id === wallet.id) < group.length - 1
}

const deletingId = ref<number | null>(null)

async function remove(wallet: Wallet): Promise<void> {
  deletingId.value = wallet.id
  error.value = ''
  try {
    await api.deleteWallet(countryId.value as number, wallet.id)
    notifyDataChanged()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    deletingId.value = null
  }
}

const dialog = useTransactionDialogStore()

function openAddTransaction(wallet: Wallet): void {
  dialog.openCreate(wallet.id)
}

const router = useRouter()

function viewTransactions(wallet: Wallet): void {
  void router.push({ name: 'transactions', query: { wallet_id: wallet.id } })
}

function cardActions(wallet: Wallet): DropdownMenuItem[] {
  return [
    { label: 'Move up', disabled: !canMoveUp(wallet), onClick: () => moveWallet(wallet, -1) },
    { label: 'Move down', disabled: !canMoveDown(wallet), onClick: () => moveWallet(wallet, 1) },
    { label: 'View transactions', onClick: () => viewTransactions(wallet) },
    { label: 'Edit', onClick: () => startEdit(wallet) },
    { label: 'Hide', onClick: () => toggleVisible(wallet) },
    { label: 'Delete', danger: true, onClick: () => remove(wallet) },
  ]
}

function archiveActions(wallet: Wallet): DropdownMenuItem[] {
  return [
    { label: 'Move up', disabled: !canMoveUp(wallet), onClick: () => moveWallet(wallet, -1) },
    { label: 'Move down', disabled: !canMoveDown(wallet), onClick: () => moveWallet(wallet, 1) },
    { label: 'View transactions', onClick: () => viewTransactions(wallet) },
    { label: 'Show', onClick: () => toggleVisible(wallet) },
    { label: 'Delete', danger: true, onClick: () => remove(wallet) },
  ]
}
</script>

<template>
  <section class="space-y-4">
    <p v-if="countryId === null" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Select or create a country first.
    </p>

    <template v-else>
      <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>

      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Total balance</p>
        <p :class="['text-2xl font-bold', balanceTextClass(totalBalance)]">{{ format(Math.abs(totalBalance)) }}</p>
      </div>

      <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

      <template v-else>
        <div v-if="wallets.length === 0" class="space-y-2">
          <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No wallets in {{ countries.activeCountry?.name }} yet.
          </div>
          <button
            type="button"
            class="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
            @click="showCreate = true"
          >
            + Add wallet
          </button>
        </div>

        <template v-else>
          <ul class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <li v-for="wallet in visibleWallets" :key="wallet.id">
              <div class="relative h-full">
                <button
                  type="button"
                  class="flex h-full w-full items-center justify-between gap-3 rounded-xl border p-5 py-10 text-left transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-emerald-600/25"
                  :style="cardBackground(wallet.color)"
                  :aria-label="`Add transaction from ${wallet.name}`"
                  title="Add transaction from this wallet"
                  @click="openAddTransaction(wallet)"
                >
                  <p class="min-w-0 text-white">{{ wallet.name }}</p>
                  <p :class="`shrink-0 text-lg font-normal ${walletBalanceTextClass(wallet.current_balance)}`">{{ format(Math.abs(wallet.current_balance)) }}</p>
                </button>
                <div class="absolute right-1.5 top-1.5">
                  <DropdownMenu
                  :items="cardActions(wallet)"
                  icon-class="text-white hover:bg-white/10 hover:text-white dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                />
                </div>
              </div>
            </li>
            <li>
              <button
                type="button"
                class="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                @click="showCreate = true"
              >
                + Add wallet
              </button>
            </li>
          </ul>

          <div v-if="hiddenWallets.length > 0" class="space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Hidden</h3>
            <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <li v-for="wallet in hiddenWallets" :key="wallet.id">
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 opacity-70" :style="cardBackground(wallet.color)">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-medium text-white">{{ wallet.name }}</p>
                    </div>
                    <div class="flex items-center gap-1">
                      <p :class="`shrink-0 text-lg font-semibold ${walletBalanceTextClass(wallet.current_balance)}`">{{ format(Math.abs(wallet.current_balance)) }}</p>
                      <DropdownMenu :items="archiveActions(wallet)" />
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          </template>
      </template>
    </template>

    <ModalDialog title="Add wallet" :open="showCreate" @close="showCreate = false">
      <form class="space-y-3" @submit.prevent="create">
<p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>
      <p v-if="moveError" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ moveError }}</p>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
          <input
            v-model="form.name"
            type="text"
            required
            maxlength="255"
            placeholder="e.g. Cash"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <div class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Color</span>
          <div class="flex items-center gap-2">
            <input
              v-model="formColorModel"
              type="color"
              class="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 p-1"
              :aria-label="`Color for ${form.name || 'new wallet'}`"
            />
            <button
              v-if="form.color"
              type="button"
              class="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300"
              @click="form.color = null"
            >
              Default
            </button>
            <span v-else class="text-xs text-slate-500 dark:text-slate-400">No color</span>
          </div>
        </div>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Initial amount</span>
          <MoneyInput
            v-model="form.init_amount"
            :decimal-places="active?.decimal_points ?? 2"
            placeholder="0.00"
          />
        </label>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Saving…' : 'Create wallet' }}
        </button>
      </form>
    </ModalDialog>

    <ModalDialog title="Edit wallet" :open="editing !== null" @close="editing = null">
      <form v-if="editing" class="space-y-3" @submit.prevent="saveEdit">
        <p v-if="editError" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ editError }}</p>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
          <input
            v-model="editName"
            type="text"
            required
            maxlength="255"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <div class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Color</span>
          <div class="flex items-center gap-2">
            <input
              v-model="editColorModel"
              type="color"
              class="h-9 w-14 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 p-1"
              aria-label="Color for this wallet"
            />
            <button
              v-if="editColor"
              type="button"
              class="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300"
              @click="editColor = null"
            >
              Default
            </button>
            <span v-else class="text-xs text-slate-500 dark:text-slate-400">No color</span>
          </div>
        </div>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Initial amount</span>
          <MoneyInput
            v-model="editInitAmount"
            :decimal-places="active?.decimal_points ?? 2"
            placeholder="0.00"
          />
        </label>

        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="submitting"
            class="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300"
            @click="editing = null"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalDialog>
  </section>
</template>
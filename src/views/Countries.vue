<script setup lang="ts">
import { reactive, ref } from 'vue'
import DropdownMenu, { type DropdownMenuItem } from '../components/DropdownMenu.vue'
import ModalDialog from '../components/ModalDialog.vue'
import OptionCards, { type OptionCardsOption } from '../components/OptionCards.vue'
import { apiError } from '../services/api'
import * as api from '../services/resources'
import { useCountryStore } from '../stores/country'
import { formatMoney } from '../utils/money'
import type { Country } from '../types/api'

const countries = useCountryStore()

function balanceTextClass(minor: number): string {
  if (minor > 0) {
    return 'text-emerald-700 dark:text-emerald-400'
  }

  if (minor < 0) {
    return 'text-red-600 dark:text-red-400'
  }

  return 'text-slate-400 dark:text-slate-500'
}

const decimalOptions: OptionCardsOption[] = [
  { value: 0, label: '0', hint: 'e.g. JPY' },
  { value: 2, label: '2', hint: 'e.g. USD' },
  { value: 3, label: '3', hint: 'e.g. KWD' },
]

function setFormDecimals(value: string | number | null): void {
  form.decimal_points = Number(value)
}

function setEditDecimals(value: string | number | null): void {
  editForm.decimal_points = Number(value)
}

const showCreate = ref(false)
const submitting = ref(false)
const error = ref('')
const form = reactive({
  name: '',
  currency: '',
  decimal_points: 3,
})

async function create(): Promise<void> {
  error.value = ''
  submitting.value = true
  try {
    await api.storeCountry({
      name: form.name,
      currency: form.currency,
      decimal_points: form.decimal_points,
    })
    await countries.reload()
    showCreate.value = false
    form.name = ''
    form.currency = ''
  } catch (err) {
    error.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

const editing = ref<Country | null>(null)
const editForm = reactive({
  name: '',
  currency: '',
  decimal_points: 2,
})
const editError = ref('')

function startEdit(country: Country): void {
  editing.value = country
  editForm.name = country.name
  editForm.currency = country.currency
  editForm.decimal_points = country.decimal_points
  editError.value = ''
}

async function saveEdit(): Promise<void> {
  if (!editing.value) {
    return
  }

  editError.value = ''
  submitting.value = true
  try {
    const original = editing.value
    const changes: Partial<Country> = {}
    if (editForm.name !== original.name) changes.name = editForm.name
    if (editForm.currency !== original.currency) changes.currency = editForm.currency
    if (editForm.decimal_points !== original.decimal_points) changes.decimal_points = editForm.decimal_points
    await api.updateCountry(original.id, changes)
    await countries.reload()
    editing.value = null
  } catch (err) {
    editError.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

const deletingId = ref<number | null>(null)

function cardActions(country: Country): DropdownMenuItem[] {
  const items: DropdownMenuItem[] = []
  if (countries.activeCountryId !== country.id) {
    items.push({ label: 'Make active', onClick: () => void countries.select(country.id) })
  }
  items.push(
    { label: 'Edit', onClick: () => startEdit(country) },
    {
      label: deletingId.value === country.id ? 'Deleting…' : 'Delete',
      danger: true,
      disabled: deletingId.value === country.id,
      onClick: () => void remove(country),
    },
  )
  return items
}

async function remove(country: Country): Promise<void> {
  deletingId.value = country.id
  error.value = ''
  try {
    await api.deleteCountry(country.id)
    await countries.reload()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <section class="space-y-4">
    <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>

    <div v-if="countries.countries.length === 0" class="space-y-2">
      <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No countries yet. Add one to start tracking money.
      </div>
      <button
        type="button"
        class="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
        @click="showCreate = true"
      >
        + Add country
      </button>
    </div>

    <ul v-else class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="country in countries.countries"
        :key="country.id"
        :class="[
          'rounded-xl border',
          countries.activeCountryId === country.id
            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20 dark:border-emerald-500/60 dark:bg-emerald-500/10'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        ]"
      >
        <div class="p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-slate-900 dark:text-slate-100">
                {{ country.name }}
              </p>
              <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {{ country.currency }}
              </p>
            </div>

            <DropdownMenu :items="cardActions(country)" />
          </div>

          <div class="mt-2 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span v-if="country.wallet_count !== null">{{ country.wallet_count }} wallet{{ country.wallet_count === 1 ? '' : 's' }}</span>
            </div>

            <p
              v-if="country.wallet_total !== null"
              :class="['shrink-0 text-base font-semibold', balanceTextClass(country.wallet_total)]"
            >
              {{ formatMoney(Math.abs(country.wallet_total), country.decimal_points, country.currency) }}
            </p>
          </div>
        </div>
      </li>
      <li v-if="countries.countries.length > 0">
        <button
          type="button"
          class="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
          @click="showCreate = true"
        >
          + Add country
        </button>
      </li>
      </ul>

    <ModalDialog title="Add country" :open="showCreate" @close="showCreate = false">
      <form class="space-y-3" @submit.prevent="create">
        <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
          <input
            v-model="form.name"
            type="text"
            required
            maxlength="255"
            placeholder="e.g. Kuwait Cash"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Currency</span>
          <input
            v-model="form.currency"
            type="text"
            required
            maxlength="10"
            placeholder="د.ك"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <div class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Decimal points</span>
          <OptionCards
            :options="decimalOptions"
            :model-value="form.decimal_points"
            :columns="3"
            @update:model-value="setFormDecimals"
          />
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400">Decimal points are permanent once the country has transactions.</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Saving…' : 'Create country' }}
        </button>
      </form>
    </ModalDialog>

    <ModalDialog title="Edit country" :open="editing !== null" @close="editing = null">
      <form v-if="editing" class="space-y-3" @submit.prevent="saveEdit">
        <p v-if="editError" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ editError }}</p>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
          <input
            v-model="editForm.name"
            type="text"
            required
            maxlength="255"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Currency</span>
          <input
            v-model="editForm.currency"
            type="text"
            required
            maxlength="10"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <div class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Decimal points</span>
          <OptionCards
            :options="decimalOptions"
            :model-value="editForm.decimal_points"
            :columns="3"
            @update:model-value="setEditDecimals"
          />
        </div>

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
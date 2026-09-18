<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DropdownMenu, { type DropdownMenuItem } from '../components/DropdownMenu.vue'
import ModalDialog from '../components/ModalDialog.vue'
import { useCurrencyFormat } from '../composables/useCurrencyFormat'
import { apiError } from '../services/api'
import * as api from '../services/resources'
import { useCountryStore } from '../stores/country'
import { useDataVersion } from '../services/dataEvents'
import type { Contact } from '../types/api'

const countries = useCountryStore()
const countryId = computed(() => countries.activeCountryId)
const { format } = useCurrencyFormat()
const { dataVersion } = useDataVersion()

const contacts = ref<Contact[]>([])
const loading = ref(false)
const error = ref('')

async function load(): Promise<void> {
  if (countryId.value === null) {
    contacts.value = []
    return
  }

  loading.value = true
  error.value = ''
  try {
    contacts.value = await api.listContacts(countryId.value)
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
  editingId.value = null
  void load()
})

const showCreate = ref(false)
const submitting = ref(false)
const form = reactive({
  name: '',
})

function resetForm(): void {
  form.name = ''
}

async function create(): Promise<void> {
  error.value = ''
  submitting.value = true
  try {
    await api.storeContact(countryId.value as number, {
      name: form.name,
    })
    showCreate.value = false
    resetForm()
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

const editingId = ref<number | null>(null)
const editForm = reactive({ name: '' })
const editError = ref('')

function startEdit(contact: Contact): void {
  editingId.value = contact.id
  editForm.name = contact.name
  editError.value = ''
}

async function saveEdit(contact: Contact): Promise<void> {
  editError.value = ''
  submitting.value = true
  try {
    await api.updateContact(countryId.value as number, contact.id, {
      name: editForm.name,
    })
    editingId.value = null
    await load()
  } catch (err) {
    editError.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

const deletingId = ref<number | null>(null)

function balanceAmount(balance: number): string {
  return balance === 0 ? '' : format(Math.abs(balance))
}

function balanceClass(balance: number): string {
  if (balance > 0) {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  if (balance < 0) {
    return 'text-red-600 dark:text-red-400'
  }
  return 'text-slate-400 dark:text-slate-500'
}

async function remove(contact: Contact): Promise<void> {
  deletingId.value = contact.id
  error.value = ''
  try {
    await api.deleteContact(countryId.value as number, contact.id)
    await load()
  } catch (err) {
    error.value = apiError(err)
  } finally {
    deletingId.value = null
  }
}

const router = useRouter()

function viewTransactions(contact: Contact): void {
  void router.push({ name: 'transactions', query: { contact_id: contact.id } })
}

function cardActions(contact: Contact): DropdownMenuItem[] {
  return [
    { label: 'View transactions', onClick: () => viewTransactions(contact) },
    { label: 'Edit', onClick: () => startEdit(contact) },
    { label: 'Delete', danger: true, onClick: () => remove(contact) },
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

      <p v-if="loading" class="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

      <div v-else-if="contacts.length === 0" class="space-y-2">
        <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No contacts in {{ countries.activeCountry?.name }} yet. Add the people you lend to or borrow from.
        </div>
        <button
          type="button"
          class="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
          @click="showCreate = true"
        >
          + Add contact
        </button>
      </div>

      <ul v-else class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="contact in contacts" :key="contact.id">
          <div class="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div class="flex items-center gap-2">
              <p class="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-slate-100">{{ contact.name }}</p>
              <p class="shrink-0 text-sm font-semibold" :class="balanceClass(contact.balance)">
                {{ balanceAmount(contact.balance) }}
              </p>

              <DropdownMenu :items="cardActions(contact)" />
            </div>
          </div>
        </li>
        <li>
          <button
            type="button"
            class="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
            @click="showCreate = true"
          >
            + Add contact
          </button>
        </li>
      </ul>
    </template>

    <ModalDialog title="Add contact" :open="showCreate" @close="showCreate = false">
      <form class="space-y-3" @submit.prevent="create">
        <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>

<label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
          <input
            v-model="form.name"
            type="text"
            required
            maxlength="255"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Saving…' : 'Add contact' }}
        </button>
      </form>
    </ModalDialog>

    <ModalDialog title="Edit contact" :open="editingId !== null" @close="editingId = null">
      <form v-if="editingId !== null" class="space-y-3" @submit.prevent="saveEdit(contacts.find((c) => c.id === editingId) as Contact)">
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
            @click="editingId = null"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalDialog>
  </section>
</template>
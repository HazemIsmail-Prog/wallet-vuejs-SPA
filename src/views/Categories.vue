<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DropdownMenu, { type DropdownMenuItem } from '../components/DropdownMenu.vue'
import ModalDialog from '../components/ModalDialog.vue'
import OptionCards, { type OptionCardsOption } from '../components/OptionCards.vue'
import { apiError } from '../services/api'
import * as api from '../services/resources'
import { useCountryStore } from '../stores/country'
import type { Category, CategoryType } from '../types/api'

const countries = useCountryStore()
const route = useRoute()
const router = useRouter()

const type = computed<CategoryType>(() => (route.meta.categoryType === 'income' ? 'income' : 'expense'))
const typeLabel = computed(() => (type.value === 'income' ? 'Income' : 'Expense'))

const categories = ref<Category[]>([])
const loading = ref(false)
const error = ref('')

const expandedIds = ref<Set<number>>(new Set())

function isExpanded(id: number): boolean {
  return expandedIds.value.has(id)
}

function toggleExpanded(id: number): void {
  const next = new Set(expandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedIds.value = next
}

function expandAll(): void {
  expandedIds.value = new Set(roots.value.map((root) => root.id))
}

function collapseAll(): void {
  expandedIds.value = new Set()
}

const countryId = computed(() => countries.activeCountryId)

async function load(): Promise<void> {
  if (countryId.value === null) {
    categories.value = []
    return
  }

  loading.value = true
  error.value = ''
  try {
    categories.value = await api.listCategories(countryId.value)
    expandedIds.value = new Set(categories.value.filter((category) => category.category_id === null).map((category) => category.id))
  } catch (err) {
    error.value = apiError(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(countryId, () => {
  editing.value = null
  showCreate.value = false
  void load()
})

const roots = computed(() =>
  categories.value.filter((category) => category.category_id === null && category.type === type.value),
)

function childrenOf(parentId: number): Category[] {
  return categories.value.filter((category) => category.category_id === parentId && category.type === type.value)
}

function availableParents(ignoreId: number | null = null): Category[] {
  return roots.value.filter((category) => category.id !== ignoreId)
}

const parentOptions = computed<OptionCardsOption[]>(() => [
  { value: null, label: 'Top-level' },
  ...availableParents().map((parent) => ({ value: parent.id, label: parent.name })),
])

const editParentOptions = computed<OptionCardsOption[]>(() => {
  const category = editing.value
  if (!category) {
    return []
  }
  return [
    { value: null, label: 'Top-level' },
    ...availableParents(category.id).map((parent) => ({ value: parent.id, label: parent.name })),
  ]
})

function setFormParent(value: string | number | null): void {
  form.category_id = value as number | null
}

function setEditParent(value: string | number | null): void {
  editParentId.value = value as number | null
}

function openCreate(): void {
  form.name = ''
  form.category_id = null
  error.value = ''
  showCreate.value = true
}

function startAddChild(parent: Category): void {
  form.name = ''
  form.category_id = parent.id
  error.value = ''
  showCreate.value = true
}

const showCreate = ref(false)
const submitting = ref(false)
const form = reactive<{ name: string; category_id: number | null }>({
  name: '',
  category_id: null,
})

async function create(): Promise<void> {
  error.value = ''
  submitting.value = true
  try {
    const created = await api.storeCategory(countryId.value as number, {
      type: type.value,
      name: form.name,
      category_id: form.category_id,
    })
    showCreate.value = false
    form.name = ''
    form.category_id = null
    categories.value.push(created)
    if (created.category_id === null) {
      expandedIds.value = new Set([...expandedIds.value, created.id])
    }
  } catch (err) {
    error.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

const editing = ref<Category | null>(null)
const editName = ref('')
const editParentId = ref<number | null>(null)
const editError = ref('')

function startEdit(category: Category): void {
  editing.value = category
  editName.value = category.name
  editParentId.value = category.category_id
  editError.value = ''
}

function closeEdit(): void {
  editing.value = null
  editError.value = ''
}

async function saveEdit(): Promise<void> {
  if (!editing.value) {
    return
  }

  editError.value = ''
  submitting.value = true
  try {
    const updated = await api.updateCategory(countryId.value as number, editing.value.id, {
      name: editName.value,
      category_id: editParentId.value,
    })
    const idx = categories.value.findIndex((c) => c.id === updated.id)
    if (idx !== -1) {
      categories.value[idx] = updated
    }
    closeEdit()
  } catch (err) {
    editError.value = apiError(err)
  } finally {
    submitting.value = false
  }
}

const deletingId = ref<number | null>(null)

async function remove(category: Category): Promise<void> {
  deletingId.value = category.id
  error.value = ''
  try {
    await api.deleteCategory(countryId.value as number, category.id)
    categories.value = categories.value.filter((c) => c.id !== category.id && c.category_id !== category.id)
  } catch (err) {
    error.value = apiError(err)
  } finally {
    deletingId.value = null
  }
}

function viewTransactions(category: Category): void {
  void router.push({ name: 'transactions', query: { category_id: category.id } })
}

function cardActions(category: Category): DropdownMenuItem[] {
  const parentItems: DropdownMenuItem[] = []
  if (category.category_id === null) {
    parentItems.push({ label: 'Add sub-category', onClick: () => startAddChild(category) })
  }
  return [
    ...parentItems,
    { label: 'View transactions', onClick: () => viewTransactions(category) },
    { label: 'Edit', onClick: () => startEdit(category) },
    {
      label: deletingId.value === category.id ? 'Deleting…' : 'Delete',
      danger: true,
      disabled: deletingId.value === category.id,
      onClick: () => remove(category),
    },
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

      <template v-else>
        <div v-if="categories.length === 0" class="space-y-2">
          <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No {{ typeLabel.toLowerCase() }} categories in {{ countries.activeCountry?.name }} yet.
          </div>
          <button
            type="button"
            class="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-600 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
            @click="openCreate"
          >
            + Add {{ typeLabel.toLowerCase() }} category
          </button>
        </div>

        <div v-else class="space-y-2">
          <div v-if="roots.some((root) => childrenOf(root.id).length > 0)" class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              @click="collapseAll"
            >
              Collapse all
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              @click="expandAll"
            >
              Expand all
            </button>
          </div>

          <div class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            <template v-for="(root, index) in roots" :key="root.id">
              <div
                :class="[
                  'flex items-center gap-3 p-3',
                  index === 0 ? 'rounded-t-xl' : '',
                  index === roots.length - 1 && !(isExpanded(root.id) && childrenOf(root.id).length > 0) ? 'rounded-b-xl' : '',
                ]"
              >
                <button
                  type="button"
                  class="rounded p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
                  :disabled="childrenOf(root.id).length === 0"
                  :aria-expanded="isExpanded(root.id)"
                  aria-label="Toggle sub-categories"
                  @click="toggleExpanded(root.id)"
                >
                  <svg
                    :class="['h-4 w-4 transition-transform', isExpanded(root.id) ? 'rotate-90' : '']"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ root.name }}</p>
                  <p v-if="childrenOf(root.id).length > 0" class="text-xs text-slate-500 dark:text-slate-400">
                    {{ childrenOf(root.id).length }} sub-categor{{ childrenOf(root.id).length === 1 ? 'y' : 'ies' }}
                  </p>
                </div>

                <DropdownMenu :items="cardActions(root)" />
              </div>

              <div v-if="isExpanded(root.id)" class="divide-y divide-slate-100 border-l-2 border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                <div
                  v-for="(child, childIndex) in childrenOf(root.id)"
                  :key="child.id"
                  :class="[
                    'flex items-center gap-3 bg-slate-50 py-2.5 pl-6 pr-3 dark:bg-slate-800/40',
                    childIndex === childrenOf(root.id).length - 1 ? 'rounded-b-xl' : '',
                  ]"
                >
                  <span class="text-slate-300 dark:text-slate-600" aria-hidden="true">↳</span>
                  <p class="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{{ child.name }}</p>
                  <DropdownMenu :items="cardActions(child)" />
                </div>
              </div>
            </template>
          </div>

          <button
            type="button"
            class="w-full rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-medium text-slate-500 hover:border-emerald-600 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
            @click="openCreate"
          >
            + Add {{ typeLabel.toLowerCase() }} category
          </button>
      </div>
      </template>
    </template>

    <ModalDialog :title="`Add ${typeLabel.toLowerCase()} category`" :open="showCreate" @close="showCreate = false">
      <form class="space-y-3" @submit.prevent="create">
        <p v-if="error" class="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400" role="alert">{{ error }}</p>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</span>
          <input
            v-model="form.name"
            type="text"
            required
            maxlength="255"
            placeholder="e.g. Restaurant"
            class="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </label>

        <div class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Parent</span>
          <OptionCards
            :options="parentOptions"
            :model-value="form.category_id"
            :columns="2"
            @update:model-value="setFormParent"
          />
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Saving…' : 'Create category' }}
        </button>
      </form>
    </ModalDialog>

    <ModalDialog title="Edit category" :open="editing !== null" @close="closeEdit">
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
          <span class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Parent</span>
          <OptionCards
            :options="editParentOptions"
            :model-value="editParentId"
            :columns="2"
            @update:model-value="setEditParent"
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
            @click="closeEdit"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalDialog>
  </section>
</template>
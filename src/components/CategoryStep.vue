<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Category, CategoryType } from '../types/api'

const props = defineProps<{
  categories: Category[]
  modelValue: number | ''
  type: CategoryType
}>()

const emit = defineEmits<{ select: [value: number | ''] }>()

const search = ref('')
const expandedIds = ref<Set<number>>(new Set())

const typedCategories = computed(() => props.categories.filter((category) => category.type === props.type))

const quickCategories = computed(() =>
  [...typedCategories.value]
    .filter((category) => (category.usage_count ?? 0) > 0)
    .sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
    .slice(0, 10),
)

const roots = computed(() =>
  typedCategories.value
    .filter((category) => category.category_id === null)
    .sort((a, b) => a.id - b.id),
)

function childrenOf(parentId: number): Category[] {
  return typedCategories.value
    .filter((category) => category.category_id === parentId)
    .sort((a, b) => a.id - b.id)
}

const query = computed(() => search.value.trim().toLocaleLowerCase())
const isSearching = computed(() => query.value.length > 0)

function matches(category: Category): boolean {
  return category.name.toLocaleLowerCase().includes(query.value)
}

function visibleRoots(): Category[] {
  return roots.value.filter((root) => {
    if (!isSearching.value) {
      return true
    }
    if (matches(root)) {
      return true
    }
    return childrenOf(root.id).some((child) => matches(child))
  })
}

function visibleChildren(root: Category): Category[] {
  const children = childrenOf(root.id)
  if (!isSearching.value) {
    return children
  }
  if (matches(root)) {
    return children
  }
  return children.filter((child) => matches(child))
}

function isExpanded(root: Category): boolean {
  if (isSearching.value) {
    return true
  }
  return expandedIds.value.has(root.id)
}

function toggleExpand(root: Category): void {
  const next = new Set(expandedIds.value)
  if (next.has(root.id)) {
    next.delete(root.id)
  } else {
    next.add(root.id)
  }
  expandedIds.value = next
}

function select(value: number | ''): void {
  emit('select', value)
}

watch(
  () => [props.type, props.modelValue],
  () => {
    search.value = ''
    const selected = typedCategories.value.find((category) => category.id === props.modelValue)
    if (selected?.category_id !== null && selected?.category_id !== undefined) {
      const next = new Set(expandedIds.value)
      next.add(selected.category_id)
      expandedIds.value = next
    }
  },
  { immediate: true },
)

watch(
  () => [props.type, props.categories],
  () => {
    expandedIds.value = new Set(typedCategories.value.filter((category) => category.category_id === null).map((category) => category.id))
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-3">
    <div v-if="quickCategories.length > 0">
      <div class="mt-3 flex flex-row-reverse flex-wrap justify-start gap-2">
        <button
          v-for="category in quickCategories"
          :key="category.id"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm transition"
          :class="
            modelValue === category.id
              ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:ring-1 hover:ring-emerald-600/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60'
          "
          @click="select(category.id)"
        >
          {{ category.name }}
        </button>
      </div>
    </div>

    <label class="relative block">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        v-model.trim="search"
        type="search"
        :placeholder="`Search ${type === 'expense' ? 'expense' : 'income'} categories…`"
        class="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
      />
    </label>

    <div v-if="visibleRoots().length === 0" class="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      No matching categories.
    </div>

    <ul v-else class="space-y-2">
      <li v-for="root in visibleRoots()" :key="root.id" class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-2 p-3">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
            @click="select(root.id)"
          >
            <span
              class="truncate text-sm"
              :class="
                modelValue === root.id
                  ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                  : 'font-medium text-slate-900 dark:text-slate-100'
              "
            >{{ root.name }}</span>
            <svg
              v-if="modelValue === root.id"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4 shrink-0 text-emerald-600"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <button
            v-if="childrenOf(root.id).length > 0"
            type="button"
            class="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            :aria-label="`Toggle ${root.name} sub-categories`"
            @click.stop="toggleExpand(root)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4 transition-transform"
              :class="isExpanded(root) ? 'rotate-90' : ''"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <ul v-if="isExpanded(root) && visibleChildren(root).length > 0" class="space-y-1 border-t border-slate-100 p-1.5 dark:border-slate-800">
          <li v-for="child in visibleChildren(root)" :key="child.id">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              :class="
                modelValue === child.id
                  ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-300'
              "
              @click="select(child.id)"
            >
              <span class="truncate">{{ child.name }}</span>
              <svg
                v-if="modelValue === child.id"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4 shrink-0 text-emerald-600"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ModalDialog from './ModalDialog.vue'
import OptionCards, { type OptionCardsOption } from './OptionCards.vue'
import { useCountryStore } from '../stores/country'
import { useThemeStore, type ThemeMode } from '../stores/theme'

const route = useRoute()
const countries = useCountryStore()
const theme = useThemeStore()

const title = computed(() => route.meta.title as string | undefined)

const countryPickerOpen = ref(false)

const countryPickerOptions = computed<OptionCardsOption[]>(() =>
  countries.countries.map((country) => ({
    value: country.id,
    label: country.name,
    hint: country.currency,
  })),
)

const activeCountry = computed(() =>
  countries.countries.find((country) => country.id === countries.activeCountryId) ?? null,
)

function switchCountry(value: string | number | null): void {
  if (value !== null) {
    countries.select(Number(value))
  }
  countryPickerOpen.value = false
}

const cycle: ThemeMode[] = ['light', 'dark', 'system']

function cycleTheme(): void {
  const current = cycle.indexOf(theme.mode)
  theme.set(cycle[(current + 1) % cycle.length]!)
}

const themeLabels: Record<ThemeMode, string> = {
  light: 'Switch to dark theme',
  dark: 'Switch to automatic theme',
  system: 'Switch to light theme',
}
</script>

<template>
  <header class="border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] dark:border-slate-800 dark:bg-slate-900">
    <div class="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6 lg:max-w-5xl xl:max-w-6xl lg:px-8">
      <div class="flex items-center gap-3">
        <h1 class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ title ?? 'Wallet' }}</h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="countries.countries.length > 0"
          type="button"
          :aria-label="themeLabels[theme.mode]"
          :title="themeLabels[theme.mode]"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="cycleTheme"
        >
          <svg
            v-if="theme.mode === 'light'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
          <svg
            v-else-if="theme.mode === 'dark'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <rect width="20" height="14" x="2" y="3" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </button>

        <button
          v-if="countries.countries.length > 0"
          type="button"
          class="flex min-w-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60"
          aria-label="Switch country"
          @click="countryPickerOpen = true"
        >
          <span class="max-w-28 truncate">
            {{ activeCountry ? `${activeCountry.name}` : 'Select country' }}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <ModalDialog title="Switch country" :open="countryPickerOpen" @close="countryPickerOpen = false">
    <OptionCards
      :options="countryPickerOptions"
      :model-value="countries.activeCountryId"
      @update:model-value="switchCountry"
    />
  </ModalDialog>
</template>
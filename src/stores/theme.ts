import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'wallet.theme'
const systemMedia = window.matchMedia('(prefers-color-scheme: dark)')

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }

  return 'system'
}

function isDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'system' && systemMedia.matches)
}

function apply(mode: ThemeMode): void {
  const dark = isDark(mode)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#f8fafc')
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: readStoredMode() as ThemeMode,
  }),

  actions: {
    init(): void {
      apply(this.mode)
      systemMedia.addEventListener('change', () => {
        if (this.mode === 'system') {
          apply('system')
        }
      })
    },

    set(mode: ThemeMode): void {
      this.mode = mode
      localStorage.setItem(STORAGE_KEY, mode)
      apply(mode)
    },
  },
})
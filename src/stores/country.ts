import { defineStore } from 'pinia'
import type { Country } from '../types/api'
import * as api from '../services/resources'

const STORAGE_KEY = 'wallet.activeCountryId'

export const useCountryStore = defineStore('country', {
  state: () => ({
    countries: [] as Country[],
    activeCountryId: Number(localStorage.getItem(STORAGE_KEY)) || null,
    loaded: false,
  }),

  getters: {
    activeCountry(state): Country | null {
      return state.countries.find((country) => country.id === state.activeCountryId) ?? null
    },
  },

  actions: {
    async load(): Promise<void> {
      if (this.loaded) {
        return
      }

      this.countries = await api.listCountries()
      this.loaded = true

      if (!this.activeCountry && this.countries.length > 0) {
        this.activeCountryId = this.countries[0]!.id
      }

      if (!this.activeCountry) {
        this.activeCountryId = null
      }

      this.persist()
    },

    select(countryId: number): void {
      this.activeCountryId = countryId
      this.persist()
    },

    async reload(): Promise<void> {
      this.loaded = false
      await this.load()
    },

    persist(): void {
      if (this.activeCountryId === null) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, String(this.activeCountryId))
      }
    },
  },
})
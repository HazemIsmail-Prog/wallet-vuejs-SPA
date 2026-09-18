import { computed } from 'vue'
import { useCountryStore } from '../stores/country'
import { formatMoney, toMinor } from '../utils/money'

export function useCurrencyFormat() {
  const countries = useCountryStore()

  const active = computed(() => countries.activeCountry)

  function convertToMinor(input: number | string): number {
    return toMinor(input, active.value?.decimal_points ?? 2)
  }

  function format(minor: number, opts: { symbol?: string } = {}): string {
    return formatMoney(minor, active.value?.decimal_points ?? 2, opts.symbol ?? active.value?.currency)
  }

  return { active, convertToMinor, format }
}
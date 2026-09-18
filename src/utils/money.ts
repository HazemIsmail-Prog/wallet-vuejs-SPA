export function toMinor(amount: number | string, decimalPlaces: number): number {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount

  if (Number.isNaN(value)) {
    return 0
  }

  return Math.round((value + Number.EPSILON) * 10 ** decimalPlaces)
}

export function toMajor(minor: number, decimalPlaces: number): number {
  return minor / 10 ** decimalPlaces
}

export function formatMoney(minor: number, decimalPlaces: number, symbol?: string): string {
  const major = toMajor(minor, decimalPlaces)
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(major)

  return symbol ? `${symbol}\u00A0${formatted}` : formatted
}

export function formatLargeNumber(minor: number, decimalPlaces: number): string {
  const major = toMajor(minor, decimalPlaces)

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(major)
}
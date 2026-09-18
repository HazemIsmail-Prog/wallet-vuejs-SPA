export function hexToRgba(hex: string | null | undefined, alpha: number): string | undefined {
  if (!hex) {
    return undefined
  }

  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) {
    return undefined
  }

  const value = match[1]
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function tintHex(hex: string | null | undefined, percent: number): string | undefined {
  if (!hex) {
    return undefined
  }

  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) {
    return undefined
  }

  const value = match[1]
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const mix = (channel: number): number => Math.round(channel + (255 - channel) * percent)
  const toHex = (n: number): string => n.toString(16).padStart(2, '0')

  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}
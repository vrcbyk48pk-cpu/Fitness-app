import type { Macros } from './types'

// Turns a Date into "YYYY-MM-DD" using the phone's local time zone.
export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Moves a day key forwards or backwards by a number of days.
export function shiftDay(key: string, days: number): string {
  const date = keyToDate(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

// "Today", "Yesterday" or e.g. "Sat 14 Nov".
export function formatDay(key: string): string {
  if (key === todayKey()) return 'Today'
  if (key === shiftDay(todayKey(), -1)) return 'Yesterday'
  return keyToDate(key).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// Per-100g values -> values for the amount actually eaten.
export function macrosFor(per100g: Macros, grams: number): Macros {
  const factor = grams / 100
  return {
    kcal: per100g.kcal * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    fat: per100g.fat * factor,
  }
}

export function sumMacros(items: Macros[]): Macros {
  const total: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  for (const item of items) {
    total.kcal += item.kcal
    total.protein += item.protein
    total.carbs += item.carbs
    total.fat += item.fat
  }
  return total
}

// Reads a number from a text field. Accepts "12.5" and "12,5".
// Returns null when the text is empty, not a number, or negative.
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 0 ? value : null
}

// Shows at most one decimal: 12 -> "12", 12.34 -> "12.3".
export function fmt(value: number): string {
  return String(Math.round(value * 10) / 10)
}

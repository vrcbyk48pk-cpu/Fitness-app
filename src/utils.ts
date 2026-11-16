import { locale, num, t } from './i18n'
import type { Extra, Macros, Meal, Nutrients } from './types'

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

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Moves a day key forwards or backwards by a number of days.
export function shiftDay(key: string, days: number): string {
  const date = keyToDate(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

// "Today", "Yesterday", or the date written out: "Monday 16 November" / "maandag 16 november".
export function formatDay(key: string): string {
  if (key === todayKey()) return t('day.today')
  if (key === shiftDay(todayKey(), -1)) return t('day.yesterday')
  return keyToDate(key).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })
}

export const EXTRAS: Extra[] = ['fibre', 'sugar', 'salt']

// Multiplies every nutrient by a factor. Unknown extras stay unknown.
export function scaleNutrients(nutrients: Nutrients, factor: number): Nutrients {
  const scaled: Nutrients = {
    kcal: nutrients.kcal * factor,
    protein: nutrients.protein * factor,
    carbs: nutrients.carbs * factor,
    fat: nutrients.fat * factor,
  }
  for (const key of EXTRAS) {
    const value = nutrients[key]
    if (value !== undefined) scaled[key] = value * factor
  }
  return scaled
}

// Per-100g values -> values for the amount actually eaten.
export function nutrientsFor(per100g: Nutrients, grams: number): Nutrients {
  return scaleNutrients(per100g, grams / 100)
}

// Adds up one of the extras (fibre, sugar or salt) over a list of foods.
// Foods without a value are not counted as 0: they are reported as "unknown".
export function sumExtra(items: Nutrients[], key: Extra): { total: number; unknown: number } {
  let total = 0
  let unknown = 0
  for (const item of items) {
    const value = item[key]
    if (value === undefined) unknown++
    else total += value
  }
  return { total, unknown }
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

// Shows at most one decimal, the way the language writes it: 12.34 -> "12.3" or "12,3".
export function fmt(value: number): string {
  return num(value, 1)
}

// ---------- Meals ----------

export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snacks']

// The name of a meal in the current language.
export function mealLabel(meal: Meal): string {
  return t(`meal.${meal}`)
}

// Guesses the meal from the time of day.
export function mealForTime(time: Date): Meal {
  const hour = time.getHours()
  if (hour >= 4 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 21) return 'dinner'
  return 'snacks' // afternoon and late evening
}

// ---------- Periods (for the History tab) ----------

// The Monday of the week that contains this day.
export function startOfWeek(key: string): string {
  const weekday = keyToDate(key).getDay() // 0 = Sunday, 1 = Monday, ...
  return shiftDay(key, -((weekday + 6) % 7))
}

export function startOfMonth(key: string): string {
  return key.slice(0, 8) + '01'
}

export function daysInMonth(key: string): number {
  const date = keyToDate(key)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// A list of day keys: "count" days starting at "from".
export function dayList(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftDay(from, i))
}

// e.g. "25 January 2027" / "25 januari 2027"
export function formatDate(date: Date): string {
  return date.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
}

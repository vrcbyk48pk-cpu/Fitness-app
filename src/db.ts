import Dexie, { type Table } from 'dexie'
import type { Entry, Meal, Product, Profile, SavedMeal, Targets, WeightEntry } from './types'
import { macrosFor, mealForTime, shiftDay, todayKey } from './utils'

// One row in the settings table. The keys in use:
//   "targets"           -> Targets (daily goals)
//   "profile"           -> Profile (answers from the onboarding)
//   "onboardingSkipped" -> true
interface Setting {
  key: string
  value: unknown
}

// The local database (IndexedDB, via Dexie). Everything stays on the phone.
class AppDatabase extends Dexie {
  products!: Table<Product, string>
  entries!: Table<Entry, number>
  settings!: Table<Setting, string>
  savedMeals!: Table<SavedMeal, number>
  weights!: Table<WeightEntry, string>

  constructor() {
    super('calorie-tracker')

    // Version 1: the original app.
    // Only the fields we search or sort by are listed. "++id" = auto-incrementing number.
    this.version(1).stores({
      products: 'id, lastUsed',
      entries: '++id, date',
      settings: 'key',
    })

    // Version 2: meals, saved meals and the weight log.
    // Tables not mentioned here (products, entries, settings) are kept exactly as they are.
    // The upgrade function runs once, on a phone that still has the version 1 database.
    this.version(2)
      .stores({
        savedMeals: '++id',
        weights: 'date',
      })
      .upgrade((tx) =>
        // Old entries have no meal yet: derive it from the time they were logged.
        tx
          .table('entries')
          .toCollection()
          .modify((entry) => {
            if (!entry.meal) entry.meal = mealForTime(new Date(entry.createdAt))
          }),
      )
  }
}

export const db = new AppDatabase()

// ---------- Targets ----------

export const DEFAULT_TARGETS: Targets = { kcal: 2200, protein: 130, carbs: 250, fat: 70 }

export async function getTargets(): Promise<Targets> {
  const row = await db.settings.get('targets')
  return (row?.value as Targets | undefined) ?? DEFAULT_TARGETS
}

export async function saveTargets(targets: Targets): Promise<void> {
  await db.settings.put({ key: 'targets', value: targets })
}

// ---------- Profile and onboarding ----------

export async function getProfile(): Promise<Profile | null> {
  const row = await db.settings.get('profile')
  return (row?.value as Profile | undefined) ?? null
}

export async function saveProfile(profile: Profile): Promise<void> {
  await db.settings.put({ key: 'profile', value: profile })
}

export async function skipOnboarding(): Promise<void> {
  await db.settings.put({ key: 'onboardingSkipped', value: true })
}

// The onboarding is shown until it was either completed or skipped.
export async function needsOnboarding(): Promise<boolean> {
  const rows = await db.settings.bulkGet(['profile', 'onboardingSkipped'])
  return rows.every((row) => row === undefined)
}

// ---------- Products ----------

export async function saveProduct(product: Product): Promise<void> {
  await db.products.put(product)
}

export async function setFavourite(id: string, favourite: boolean): Promise<void> {
  await db.products.update(id, { favourite })
}

// ---------- Entries ----------

// Logs a product for a given day and meal, and remembers it as recently used.
export async function addEntry(product: Product, grams: number, date: string, meal: Meal): Promise<void> {
  const now = Date.now()
  await db.entries.add({
    date,
    meal,
    productId: product.id,
    name: product.name,
    grams,
    ...macrosFor(product, grams),
    createdAt: now,
  })
  await db.products.update(product.id, { lastUsed: now, lastGrams: grams })
}

// Changes the grams and/or the meal of an entry. The macros scale with the grams.
export async function updateEntry(entry: Entry, grams: number, meal: Meal): Promise<void> {
  const factor = grams / entry.grams
  await db.entries.update(entry.id!, {
    grams,
    meal,
    kcal: entry.kcal * factor,
    protein: entry.protein * factor,
    carbs: entry.carbs * factor,
    fat: entry.fat * factor,
  })
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}

export async function entriesForMeal(date: string, meal: Meal): Promise<Entry[]> {
  const entries = await db.entries.where('date').equals(date).toArray()
  return entries.filter((e) => e.meal === meal)
}

// Copies one meal from the day before "date" into "date". Returns how many entries were copied.
export async function copyMealFromDayBefore(date: string, meal: Meal): Promise<number> {
  const source = await entriesForMeal(shiftDay(date, -1), meal)
  const now = Date.now()
  // Leaving out "id" makes the database create new rows instead of overwriting the old ones.
  await db.entries.bulkAdd(source.map(({ id: _id, ...rest }) => ({ ...rest, date, createdAt: now })))
  return source.length
}

// ---------- Saved meals ----------

export async function saveMeal(name: string, entries: Entry[]): Promise<void> {
  await db.savedMeals.add({
    name,
    items: entries.map((e) => ({
      productId: e.productId,
      name: e.name,
      grams: e.grams,
      kcal: e.kcal,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
    })),
  })
}

// Logs every food of a saved meal in one go.
export async function logSavedMeal(saved: SavedMeal, date: string, meal: Meal): Promise<void> {
  const now = Date.now()
  await db.entries.bulkAdd(saved.items.map((item) => ({ ...item, date, meal, createdAt: now })))
}

export async function deleteSavedMeal(id: number): Promise<void> {
  await db.savedMeals.delete(id)
}

// ---------- Weight ----------

// Saving twice on the same day replaces the earlier value.
export async function saveWeight(date: string, kg: number): Promise<void> {
  await db.weights.put({ date, kg })
}

export async function deleteWeight(date: string): Promise<void> {
  await db.weights.delete(date)
}

// ---------- Protein streak ----------

// How many days in a row (counting back from today) the protein target was reached.
// Today only counts once it is reached, so the streak doesn't drop to 0 every morning.
export async function proteinStreak(target: number): Promise<number> {
  if (target <= 0) return 0

  // Add up the protein per day.
  const proteinByDay = new Map<string, number>()
  await db.entries.each((e) => {
    proteinByDay.set(e.date, (proteinByDay.get(e.date) ?? 0) + e.protein)
  })

  const reached = (day: string) => (proteinByDay.get(day) ?? 0) >= target
  let day = todayKey()
  if (!reached(day)) day = shiftDay(day, -1)

  let streak = 0
  while (reached(day)) {
    streak++
    day = shiftDay(day, -1)
  }
  return streak
}

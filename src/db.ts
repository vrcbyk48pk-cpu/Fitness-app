import Dexie, { type Table } from 'dexie'
import type { SettingRow } from './backupData'
import { t } from './i18n'
import { prepProductId, toProduct } from './mealPrep'
import type { Entry, Meal, MealPrep, Product, Profile, SavedMeal, Targets, WeightEntry } from './types'
import { mealForTime, nutrientsFor, scaleNutrients, shiftDay, todayKey } from './utils'

// The settings table holds one row per key:
//   "targets"           -> Targets (daily goals)
//   "profile"           -> Profile (answers from the onboarding)
//   "onboardingSkipped" -> true
//   "paceAsked"         -> true (tapped "Not now" on the pace question)
//   "lastBackup"        -> timestamp of the last backup made on this phone
//   "backupBannerDismissed" -> timestamp of when the backup reminder was closed
//   "language"          -> 'en' | 'nl'
//   "theme"             -> the id of the chosen theme
//   "appearanceChosen"  -> true once language and theme were picked

// The local database (IndexedDB, via Dexie). Everything stays on the phone.
class AppDatabase extends Dexie {
  products!: Table<Product, string>
  entries!: Table<Entry, number>
  settings!: Table<SettingRow, string>
  savedMeals!: Table<SavedMeal, number>
  weights!: Table<WeightEntry, string>
  mealPreps!: Table<MealPrep, string>

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

    // Version 3: meal preps, and fibre / sugar / salt.
    // The new nutrient fields are optional, so existing products and entries need no change:
    // a missing value simply means "unknown". Only the saved targets get a fibre goal.
    this.version(3)
      .stores({
        mealPreps: 'id',
      })
      .upgrade((tx) =>
        tx
          .table('settings')
          .where('key')
          .equals('targets')
          .modify((row) => {
            if (row.value.fibre === undefined) row.value.fibre = DEFAULT_TARGETS.fibre
          }),
      )
  }
}

export const db = new AppDatabase()

// ---------- Settings ----------

async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined
}

async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export const DEFAULT_TARGETS: Targets = { kcal: 2200, protein: 130, carbs: 250, fat: 70, fibre: 30 }

export async function getTargets(): Promise<Targets> {
  // Defaults first, so anything missing from the saved targets is filled in.
  return { ...DEFAULT_TARGETS, ...(await getSetting<Partial<Targets>>('targets')) }
}

// Saves some or all of the targets; the ones not mentioned keep their value.
export async function saveTargets(targets: Partial<Targets>): Promise<void> {
  await setSetting('targets', { ...(await getTargets()), ...targets })
}

export async function hasSavedTargets(): Promise<boolean> {
  return (await db.settings.get('targets')) !== undefined
}

// ---------- Profile and onboarding ----------

export async function getProfile(): Promise<Profile | null> {
  return (await getSetting<Profile>('profile')) ?? null
}

export const saveProfile = (profile: Profile) => setSetting('profile', profile)
export const skipOnboarding = () => setSetting('onboardingSkipped', true)

// The onboarding is shown until it was either completed or skipped.
export async function needsOnboarding(): Promise<boolean> {
  const rows = await db.settings.bulkGet(['profile', 'onboardingSkipped'])
  return rows.every((row) => row === undefined)
}

export const paceAsked = async () => (await getSetting('paceAsked')) !== undefined
export const dismissPaceQuestion = () => setSetting('paceAsked', true)

// ---------- Appearance ----------

export const getAppearanceChosen = async () => (await getSetting('appearanceChosen')) === true

export async function saveAppearance(language: string, theme: string): Promise<void> {
  await db.settings.bulkPut([
    { key: 'language', value: language },
    { key: 'theme', value: theme },
    { key: 'appearanceChosen', value: true },
  ])
}

export const getSavedAppearance = async () => ({
  language: await getSetting<string>('language'),
  theme: await getSetting<string>('theme'),
})

// ---------- Backups ----------

export const getLastBackup = () => getSetting<number>('lastBackup')
export const setLastBackup = (timestamp: number) => setSetting('lastBackup', timestamp)
export const getBackupBannerDismissed = () => getSetting<number>('backupBannerDismissed')
export const dismissBackupBanner = () => setSetting('backupBannerDismissed', Date.now())

// When the first food was logged, or undefined when nothing was logged yet.
export async function firstUse(): Promise<number | undefined> {
  return (await db.entries.orderBy(':id').first())?.createdAt
}

// ---------- Products ----------

export async function saveProduct(product: Product): Promise<void> {
  await db.products.put(product)
}

export async function setFavourite(id: string, favourite: boolean): Promise<void> {
  await db.products.update(id, { favourite })
}

// "Recent" lists the products with a lastUsed time. Setting it to 0 takes a product off that
// list without deleting it: favourites, meal preps and scanned barcodes keep working.
export async function removeFromRecents(id: string): Promise<void> {
  await db.products.update(id, { lastUsed: 0 })
}

export async function clearRecents(): Promise<void> {
  await db.products.toCollection().modify({ lastUsed: 0 })
}

// ---------- Entries ----------

// Logs a product for a given day and meal, and remembers it as recently used.
// "portions" is given when the amount was chosen in portions rather than grams.
export async function addEntry(product: Product, grams: number, date: string, meal: Meal, portions?: number): Promise<void> {
  const now = Date.now()
  await db.entries.add({
    ...nutrientsFor(product, grams),
    date,
    meal,
    productId: product.id,
    name: product.name,
    grams,
    portions,
    createdAt: now,
  })
  await db.products.update(product.id, { lastUsed: now, lastGrams: grams })
}

// Changes the grams and/or the meal of an entry. All nutrients scale with the grams.
export async function updateEntry(entry: Entry, grams: number, meal: Meal): Promise<void> {
  const factor = grams / entry.grams
  await db.entries.update(entry.id!, {
    ...scaleNutrients(entry, factor),
    grams,
    meal,
    // The portion count scales along, so "1 portion" becomes "1.5 portions".
    portions: entry.portions === undefined ? undefined : entry.portions * factor,
  })
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}

export async function entriesForMeal(date: string, meal: Meal): Promise<Entry[]> {
  const entries = await db.entries.where('date').equals(date).toArray()
  return entries.filter((e) => e.meal === meal)
}

// Logs an earlier entry again, on another day and meal.
// Leaving out "id" makes the database create a new row instead of overwriting the old one.
export async function logAgain({ id: _id, ...entry }: Entry, date: string, meal: Meal): Promise<void> {
  await db.entries.add({ ...entry, date, meal, createdAt: Date.now() })
}

// Copies one meal from the day before "date" into "date". Returns how many entries were copied.
export async function copyMealFromDayBefore(date: string, meal: Meal): Promise<number> {
  const source = await entriesForMeal(shiftDay(date, -1), meal)
  const now = Date.now()
  await db.entries.bulkAdd(source.map(({ id: _id, ...rest }) => ({ ...rest, date, createdAt: now })))
  return source.length
}

// ---------- Saved meals ----------

export async function saveMeal(name: string, entries: Entry[]): Promise<void> {
  await db.savedMeals.add({
    name,
    // Keep what describes the food; drop what describes the moment it was eaten.
    items: entries.map(({ id: _id, date: _date, meal: _meal, createdAt: _createdAt, ...item }) => item),
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

// ---------- Meal preps ----------

// Saves a meal prep together with its product (the thing you log and find in search).
// Entries logged earlier are not touched: they keep the values they were logged with.
export async function saveMealPrep(prep: MealPrep): Promise<void> {
  await db.transaction('rw', db.mealPreps, db.products, async () => {
    const existing = await db.products.get(prepProductId(prep.id))
    await db.mealPreps.put(prep)
    await db.products.put(toProduct(prep, existing))
  })
}

export async function deleteMealPrep(id: string): Promise<void> {
  await db.transaction('rw', db.mealPreps, db.products, async () => {
    await db.mealPreps.delete(id)
    await db.products.delete(prepProductId(id))
  })
}

export async function duplicateMealPrep(prep: MealPrep): Promise<void> {
  await saveMealPrep({ ...prep, id: crypto.randomUUID(), name: t('prep.copyName', { name: prep.name }), updatedAt: Date.now() })
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

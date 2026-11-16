// Reading, checking and merging backup files. Pure functions (no database, no browser),
// unit-tested in backupData.test.ts. The file handling itself is in backup.ts.
import { t } from './i18n'
import type { Entry, MealPrep, Product, SavedMeal, WeightEntry } from './types'
import { mealForTime } from './utils'

export interface SettingRow {
  key: string
  value: unknown
}

// Everything the app stores.
export interface BackupData {
  products: Product[]
  entries: Entry[]
  settings: SettingRow[]
  savedMeals: SavedMeal[]
  weights: WeightEntry[]
  mealPreps: MealPrep[]
  exportedAt?: string
}

// The number written into new backup files. Older files (1 to 3) are still accepted.
export const BACKUP_VERSION = 4

// Settings that describe this phone rather than your data. They are left out of backups.
export const DEVICE_SETTINGS = ['lastBackup', 'backupBannerDismissed']

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

// Returns the list, or an empty one when an older backup doesn't have it. Throws when it isn't a list.
function list(file: Record<string, unknown>, key: string): unknown[] {
  const value = file[key]
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(t('backup.err.list', { key }))
  return value
}

// Turns the text of a backup file into checked, up-to-date data.
// Accepts backups from every version of the app. Throws an Error with a readable message otherwise.
export function readBackup(text: string): BackupData {
  let file: unknown
  try {
    file = JSON.parse(text)
  } catch {
    throw new Error(t('backup.err.json'))
  }
  if (!isObject(file) || file.app !== 'calorie-tracker') {
    throw new Error(t('backup.err.notOurs'))
  }
  if (isNumber(file.version) && file.version > BACKUP_VERSION) {
    throw new Error(t('backup.err.newer'))
  }
  if (!Array.isArray(file.products) || !Array.isArray(file.entries)) {
    throw new Error(t('backup.err.noData'))
  }

  const products = file.products.map((p, i) => {
    if (!isObject(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || !isNumber(p.kcal)) {
      throw new Error(t('backup.err.product', { n: i + 1 }))
    }
    return p as unknown as Product
  })

  const entries = file.entries.map((e, i) => {
    if (
      !isObject(e) ||
      typeof e.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
      typeof e.name !== 'string' ||
      !isNumber(e.grams) ||
      !isNumber(e.kcal)
    ) {
      throw new Error(t('backup.err.entry', { n: i + 1 }))
    }
    const entry = e as unknown as Entry
    // Backups from the first version have no meals yet: derive them from the time logged.
    return entry.meal ? entry : { ...entry, meal: mealForTime(new Date(entry.createdAt)) }
  })

  const settings = (list(file, 'settings') as SettingRow[])
    .filter((row) => isObject(row) && typeof row.key === 'string' && !DEVICE_SETTINGS.includes(row.key))
    .map((row) =>
      // Older backups have targets without fibre: add the default.
      row.key === 'targets' && isObject(row.value) && row.value.fibre === undefined
        ? { key: row.key, value: { ...row.value, fibre: 30 } }
        : row,
    )

  return {
    products,
    entries,
    settings,
    savedMeals: list(file, 'savedMeals') as SavedMeal[],
    weights: list(file, 'weights') as WeightEntry[],
    mealPreps: list(file, 'mealPreps') as MealPrep[],
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : undefined,
  }
}

// Two entries are the same when they were logged at the same moment for the same food.
const entryKey = (e: Entry) => `${e.date}|${e.productId}|${e.grams}|${e.createdAt}`
// Saved meals have no stable id across phones, so compare their contents.
const savedMealKey = (m: SavedMeal) => JSON.stringify([m.name, m.items])

export interface MergeResult {
  toAdd: BackupData // only the rows that are not on this phone yet
  added: number
  skipped: number // duplicates that were left out
}

// Works out what a backup would add to the data that is already here.
// Nothing that exists is changed or removed: where both have the same thing, this phone's version wins.
export function mergeBackups(current: BackupData, incoming: BackupData): MergeResult {
  // Keeps the incoming rows whose key is not present yet (also dropping duplicates inside the backup).
  function missing<T>(here: T[], there: T[], key: (row: T) => string): T[] {
    const seen = new Set(here.map(key))
    return there.filter((row) => {
      if (seen.has(key(row))) return false
      seen.add(key(row))
      return true
    })
  }

  const toAdd: BackupData = {
    products: missing(current.products, incoming.products, (p) => p.id),
    // Without their id, so the database gives them new ones instead of overwriting other entries.
    entries: missing(current.entries, incoming.entries, entryKey).map(({ id: _id, ...entry }) => entry),
    savedMeals: missing(current.savedMeals, incoming.savedMeals, savedMealKey).map(({ id: _id, ...meal }) => meal),
    weights: missing(current.weights, incoming.weights, (w) => w.date),
    mealPreps: missing(current.mealPreps, incoming.mealPreps, (m) => m.id),
    settings: missing(current.settings, incoming.settings, (s) => s.key),
  }

  const count = (data: BackupData) =>
    data.products.length + data.entries.length + data.savedMeals.length + data.weights.length + data.mealPreps.length
  const added = count(toAdd)
  return { toAdd, added, skipped: count(incoming) - added }
}

// ---------- Backup reminders ----------

const DAY = 24 * 60 * 60 * 1000

// Whole days since a moment in time.
export function daysSince(timestamp: number, now: number): number {
  return Math.floor((now - timestamp) / DAY)
}

// "Last backup: ..." text for Settings.
export function lastBackupText(lastBackup: number | undefined, now: number): string {
  if (lastBackup === undefined) return t('backup.never')
  const days = daysSince(lastBackup, now)
  if (days <= 0) return t('backup.today')
  return days === 1 ? t('backup.yesterday') : t('backup.daysAgo', { days })
}

// Should Today show the backup reminder?
//   lastBackup  = when the last backup was made (undefined = never)
//   firstUse    = when the first food was logged (undefined = nothing logged yet)
//   dismissedAt = when the reminder was last closed
export function backupIsDue(now: number, lastBackup?: number, firstUse?: number, dismissedAt?: number): boolean {
  // Without a backup, count from the first logged food: nothing to lose before that.
  const since = lastBackup ?? firstUse
  if (since === undefined || daysSince(since, now) <= 7) return false
  // After closing the reminder it stays away for a week.
  return dismissedAt === undefined || daysSince(dismissedAt, now) >= 7
}

import { describe, expect, it } from 'vitest'
import { backupIsDue, type BackupData, lastBackupText, mergeBackups, readBackup } from './backupData'
import type { Entry, Product } from './types'

const product = (id: string, name = 'Oats'): Product => ({
  id, name, kcal: 370, protein: 13, carbs: 60, fat: 7, source: 'custom', favourite: false, lastUsed: 1, lastGrams: 100,
})
const entry = (createdAt: number, extra: Partial<Entry> = {}): Entry => ({
  date: '2026-11-10', meal: 'breakfast', productId: 'p1', name: 'Oats', grams: 50, kcal: 185, protein: 6.5, carbs: 30, fat: 3.5, createdAt, ...extra,
})
const empty: BackupData = { products: [], entries: [], settings: [], savedMeals: [], weights: [], mealPreps: [] }
const file = (content: object) => JSON.stringify({ app: 'calorie-tracker', ...content })

describe('readBackup: backups from every version', () => {
  it('reads a version 1 backup: no meals, no saved meals, no weights', () => {
    // 2026-11-10 08:15 local time -> breakfast
    const morning = new Date(2026, 10, 10, 8, 15).getTime()
    const { meal: _meal, ...withoutMeal } = entry(morning)
    const data = readBackup(file({ version: 1, products: [product('p1')], entries: [{ id: 1, ...withoutMeal }], settings: [{ key: 'targets', value: { kcal: 2000, protein: 120, carbs: 220, fat: 60 } }] }))
    expect(data.entries[0].meal).toBe('breakfast')
    expect(data.savedMeals).toEqual([])
    expect(data.weights).toEqual([])
    expect(data.mealPreps).toEqual([])
    // Targets get the fibre default.
    expect(data.settings[0].value).toEqual({ kcal: 2000, protein: 120, carbs: 220, fat: 60, fibre: 30 })
  })

  it('reads a version 2 backup: meals, saved meals and weights', () => {
    const data = readBackup(file({
      version: 2,
      products: [product('p1')],
      entries: [{ id: 5, ...entry(1000, { meal: 'dinner' }) }],
      settings: [],
      savedMeals: [{ id: 1, name: 'Usual', items: [] }],
      weights: [{ date: '2026-11-10', kg: 80 }],
    }))
    expect(data.entries[0].meal).toBe('dinner')
    expect(data.savedMeals).toHaveLength(1)
    expect(data.weights).toEqual([{ date: '2026-11-10', kg: 80 }])
    expect(data.mealPreps).toEqual([])
  })

  it('reads a backup with a profile (version 2 file from the onboarding era)', () => {
    const profile = { goal: 'lose', sex: 'male', age: 25, heightCm: 180, weightKg: 80, activity: 'moderate' }
    const data = readBackup(file({ version: 2, products: [], entries: [], settings: [{ key: 'profile', value: profile }, { key: 'onboardingSkipped', value: true }] }))
    expect(data.settings.find((s) => s.key === 'profile')?.value).toEqual(profile)
  })

  it('reads a current backup with meal preps and fibre', () => {
    const prep = { id: 'x', name: 'Soup', ingredients: [], cookedWeight: 1000, updatedAt: 1 }
    const data = readBackup(file({ version: 4, exportedAt: '2026-11-16T10:00:00.000Z', products: [{ ...product('p1'), fibre: 10 }], entries: [entry(1, { fibre: 5 })], settings: [], savedMeals: [], weights: [], mealPreps: [prep] }))
    expect(data.mealPreps).toEqual([prep])
    expect(data.products[0].fibre).toBe(10)
    expect(data.entries[0].fibre).toBe(5)
    expect(data.exportedAt).toBe('2026-11-16T10:00:00.000Z')
  })

  it('leaves old entries without fibre as unknown, not zero', () => {
    const data = readBackup(file({ version: 2, products: [], entries: [entry(1)] }))
    expect(data.entries[0].fibre).toBeUndefined()
  })

  it('drops settings that belong to the phone, not to the data', () => {
    const data = readBackup(file({ version: 4, products: [], entries: [], settings: [{ key: 'lastBackup', value: 123 }, { key: 'backupBannerDismissed', value: 5 }, { key: 'profile', value: {} }] }))
    expect(data.settings.map((s) => s.key)).toEqual(['profile'])
  })
})

describe('readBackup: files that are not valid backups', () => {
  it('rejects text that is not JSON', () => {
    expect(() => readBackup('hello')).toThrow('not valid JSON')
    expect(() => readBackup('')).toThrow('not valid JSON')
  })

  it('rejects JSON from somewhere else', () => {
    expect(() => readBackup('{"foo": 1}')).toThrow('not a backup from this app')
    expect(() => readBackup('[1, 2]')).toThrow('not a backup from this app')
    expect(() => readBackup('null')).toThrow('not a backup from this app')
  })

  it('rejects a backup from a newer app', () => {
    expect(() => readBackup(file({ version: 99, products: [], entries: [] }))).toThrow('newer version')
  })

  it('rejects a backup without products or entries', () => {
    expect(() => readBackup(file({ version: 2, products: [] }))).toThrow('damaged')
    expect(() => readBackup(file({ version: 2, products: 'x', entries: [] }))).toThrow('damaged')
  })

  it('rejects incomplete rows and says which one', () => {
    expect(() => readBackup(file({ products: [{ id: 'a' }], entries: [] }))).toThrow('product 1')
    expect(() => readBackup(file({ products: [], entries: [entry(1), { date: 'yesterday', name: 'x', grams: 1, kcal: 1 }] }))).toThrow('entry 2')
    expect(() => readBackup(file({ products: [], entries: [{ ...entry(1), kcal: 'many' }] }))).toThrow('entry 1')
  })

  it('rejects a list that is not a list', () => {
    expect(() => readBackup(file({ products: [], entries: [], weights: 'none' }))).toThrow('"weights" is not a list')
  })
})

describe('mergeBackups', () => {
  it('adds everything to an empty app', () => {
    const incoming: BackupData = { ...empty, products: [product('p1')], entries: [{ id: 7, ...entry(1) }], weights: [{ date: '2026-11-10', kg: 80 }] }
    const result = mergeBackups(empty, incoming)
    expect(result.added).toBe(3)
    expect(result.skipped).toBe(0)
    expect(result.toAdd.products).toHaveLength(1)
  })

  it('skips everything when the same backup is imported twice', () => {
    const data: BackupData = {
      ...empty,
      products: [product('p1')],
      entries: [{ id: 1, ...entry(1) }, { id: 2, ...entry(2) }],
      savedMeals: [{ id: 1, name: 'Usual', items: [] }],
      weights: [{ date: '2026-11-10', kg: 80 }],
      mealPreps: [{ id: 'x', name: 'Soup', ingredients: [], cookedWeight: 1000, updatedAt: 1 }],
    }
    const result = mergeBackups(data, data)
    expect(result.added).toBe(0)
    expect(result.skipped).toBe(6)
  })

  it('adds only the entries that are missing', () => {
    const here: BackupData = { ...empty, entries: [{ id: 1, ...entry(1) }] }
    const there: BackupData = { ...empty, entries: [{ id: 1, ...entry(1) }, { id: 2, ...entry(2) }] }
    const result = mergeBackups(here, there)
    expect(result.toAdd.entries).toHaveLength(1)
    expect(result.toAdd.entries[0].createdAt).toBe(2)
    expect(result.skipped).toBe(1)
  })

  it('removes ids from added entries so they cannot overwrite other entries', () => {
    // On this phone id 1 is a different entry than id 1 in the backup.
    const here: BackupData = { ...empty, entries: [{ id: 1, ...entry(100, { name: 'Banana' }) }] }
    const there: BackupData = { ...empty, entries: [{ id: 1, ...entry(200) }] }
    const result = mergeBackups(here, there)
    expect(result.toAdd.entries).toHaveLength(1)
    expect(result.toAdd.entries[0].id).toBeUndefined()
  })

  it('treats the same food logged at a different moment as a new entry', () => {
    const result = mergeBackups({ ...empty, entries: [entry(1)] }, { ...empty, entries: [entry(1), entry(5)] })
    expect(result.toAdd.entries).toHaveLength(1)
  })

  it('keeps this phone\'s version of a product, weight and setting', () => {
    const here: BackupData = { ...empty, products: [product('p1', 'My oats')], weights: [{ date: '2026-11-10', kg: 79 }], settings: [{ key: 'targets', value: { kcal: 1800 } }] }
    const there: BackupData = { ...empty, products: [product('p1', 'Their oats'), product('p2')], weights: [{ date: '2026-11-10', kg: 85 }, { date: '2026-11-11', kg: 84 }], settings: [{ key: 'targets', value: { kcal: 2500 } }, { key: 'profile', value: {} }] }
    const { toAdd } = mergeBackups(here, there)
    expect(toAdd.products.map((p) => p.id)).toEqual(['p2'])
    expect(toAdd.weights).toEqual([{ date: '2026-11-11', kg: 84 }])
    expect(toAdd.settings.map((s) => s.key)).toEqual(['profile'])
  })

  it('compares saved meals by their contents', () => {
    const usual = { name: 'Usual', items: [] }
    const { toAdd } = mergeBackups({ ...empty, savedMeals: [{ id: 3, ...usual }] }, { ...empty, savedMeals: [{ id: 1, ...usual }, { id: 2, name: 'Other', items: [] }] })
    expect(toAdd.savedMeals).toEqual([{ name: 'Other', items: [] }])
  })

  it('merges meal preps by id', () => {
    const prep = (id: string) => ({ id, name: 'Soup', ingredients: [], cookedWeight: 1000, updatedAt: 1 })
    const { toAdd } = mergeBackups({ ...empty, mealPreps: [prep('a')] }, { ...empty, mealPreps: [prep('a'), prep('b')] })
    expect(toAdd.mealPreps.map((m) => m.id)).toEqual(['b'])
  })

  it('does not add a duplicate that appears twice inside the backup', () => {
    const { toAdd } = mergeBackups(empty, { ...empty, entries: [entry(1), entry(1)] })
    expect(toAdd.entries).toHaveLength(1)
  })
})

describe('backup reminders', () => {
  const DAY = 24 * 60 * 60 * 1000
  const now = 100 * DAY

  it('describes the last backup', () => {
    expect(lastBackupText(undefined, now)).toBe('never')
    expect(lastBackupText(now - 1000, now)).toBe('today')
    expect(lastBackupText(now - 1.5 * DAY, now)).toBe('yesterday')
    expect(lastBackupText(now - 9 * DAY, now)).toBe('9 days ago')
  })

  it('reminds when the last backup is older than 7 days', () => {
    expect(backupIsDue(now, now - 3 * DAY)).toBe(false)
    expect(backupIsDue(now, now - 7 * DAY)).toBe(false)
    expect(backupIsDue(now, now - 8 * DAY)).toBe(true)
  })

  it('counts from the first logged food when there never was a backup', () => {
    expect(backupIsDue(now, undefined, undefined)).toBe(false) // nothing logged, nothing to lose
    expect(backupIsDue(now, undefined, now - 2 * DAY)).toBe(false)
    expect(backupIsDue(now, undefined, now - 10 * DAY)).toBe(true)
  })

  it('stays away for a week after being dismissed', () => {
    expect(backupIsDue(now, now - 20 * DAY, undefined, now - 2 * DAY)).toBe(false)
    expect(backupIsDue(now, now - 20 * DAY, undefined, now - 7 * DAY)).toBe(true)
  })
})

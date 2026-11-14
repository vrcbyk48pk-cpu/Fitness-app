import { db } from './db'
import type { Entry } from './types'
import { mealForTime, todayKey } from './utils'

// Collects everything in the database into one JSON file.
export async function exportBackup(): Promise<void> {
  const backup = {
    app: 'calorie-tracker',
    version: 2,
    exportedAt: new Date().toISOString(),
    products: await db.products.toArray(),
    entries: await db.entries.toArray(),
    settings: await db.settings.toArray(),
    savedMeals: await db.savedMeals.toArray(),
    weights: await db.weights.toArray(),
  }
  const fileName = `calories-backup-${todayKey()}.json`
  const file = new File([JSON.stringify(backup, null, 2)], fileName, { type: 'application/json' })

  // On iPhone the share sheet ("Save to Files") is the most reliable way to save a file.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      // Closing the share sheet is not an error worth reporting.
      if ((error as Error).name !== 'AbortError') throw error
    }
    return
  }

  // Everywhere else: a normal download.
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

// Replaces everything in the database with the contents of a backup file.
// Returns how many entries were restored.
export async function importBackup(file: File): Promise<number> {
  let backup: any
  try {
    backup = JSON.parse(await file.text())
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (
    backup?.app !== 'calorie-tracker' ||
    !Array.isArray(backup.products) ||
    !Array.isArray(backup.entries)
  ) {
    throw new Error('That file is not a backup from this app.')
  }

  // Backups made by version 1 of the app have no meals yet: fill them in from the time logged.
  const entries: Entry[] = backup.entries.map((e: Entry) => ({
    ...e,
    meal: e.meal ?? mealForTime(new Date(e.createdAt)),
  }))

  // A transaction means: either everything succeeds, or nothing changes.
  await db.transaction('rw', [db.products, db.entries, db.settings, db.savedMeals, db.weights], async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.products.bulkPut(backup.products)
    await db.entries.bulkPut(entries)
    await db.settings.bulkPut(backup.settings ?? [])
    await db.savedMeals.bulkPut(backup.savedMeals ?? [])
    await db.weights.bulkPut(backup.weights ?? [])
  })
  return backup.entries.length
}

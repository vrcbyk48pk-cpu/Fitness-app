import { db } from './db'
import { todayKey } from './utils'

// Collects everything in the database into one JSON file.
export async function exportBackup(): Promise<void> {
  const backup = {
    app: 'calorie-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    products: await db.products.toArray(),
    entries: await db.entries.toArray(),
    settings: await db.settings.toArray(),
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

  // A transaction means: either everything succeeds, or nothing changes.
  await db.transaction('rw', db.products, db.entries, db.settings, async () => {
    await db.products.clear()
    await db.entries.clear()
    await db.settings.clear()
    await db.products.bulkPut(backup.products)
    await db.entries.bulkPut(backup.entries)
    await db.settings.bulkPut(backup.settings ?? [])
  })
  return backup.entries.length
}

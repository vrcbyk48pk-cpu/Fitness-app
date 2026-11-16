// Making and restoring backup files. The checking and merging logic is in backupData.ts.
import { BACKUP_VERSION, type BackupData, DEVICE_SETTINGS, mergeBackups } from './backupData'
import { db, setLastBackup } from './db'
import { todayKey } from './utils'

// Everything in the database, as one object.
async function collect(): Promise<BackupData> {
  return {
    products: await db.products.toArray(),
    entries: await db.entries.toArray(),
    // Settings about this phone (like "last backup") are not part of your data.
    settings: (await db.settings.toArray()).filter((row) => !DEVICE_SETTINGS.includes(row.key)),
    savedMeals: await db.savedMeals.toArray(),
    weights: await db.weights.toArray(),
    mealPreps: await db.mealPreps.toArray(),
  }
}

// Saves a backup file. Returns true when it was saved, false when the share sheet was closed.
export async function backUpNow(): Promise<boolean> {
  const backup = { app: 'calorie-tracker', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...(await collect()) }
  const fileName = `calories-backup-${todayKey()}.json`
  const file = new File([JSON.stringify(backup, null, 2)], fileName, { type: 'application/json' })

  // On iPhone the share sheet offers "Save to Files" (iCloud Drive) and other places.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (error) {
      // Closing the share sheet without choosing anything: no backup was made.
      if ((error as Error).name === 'AbortError') return false
      throw error
    }
  } else {
    // Everywhere else: a normal download.
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  await setLastBackup(Date.now())
  return true
}

const allTables = [db.products, db.entries, db.settings, db.savedMeals, db.weights, db.mealPreps]

// Replaces everything in the app with the backup.
export async function replaceWithBackup(backup: BackupData): Promise<void> {
  // A transaction means: either everything succeeds, or nothing changes.
  await db.transaction('rw', allTables, async () => {
    // Keep this phone's own settings (they are not in the backup).
    const deviceSettings = await db.settings.bulkGet(DEVICE_SETTINGS)
    await Promise.all(allTables.map((table) => table.clear()))
    await db.products.bulkPut(backup.products)
    await db.entries.bulkPut(backup.entries)
    await db.settings.bulkPut([...backup.settings, ...deviceSettings.filter((row) => row !== undefined)])
    await db.savedMeals.bulkPut(backup.savedMeals)
    await db.weights.bulkPut(backup.weights)
    await db.mealPreps.bulkPut(backup.mealPreps)
  })
}

// Adds what the backup has and this phone doesn't. Nothing here is changed or removed.
// Returns how many things were added and how many duplicates were skipped.
export async function mergeBackup(backup: BackupData): Promise<{ added: number; skipped: number }> {
  return db.transaction('rw', allTables, async () => {
    const { toAdd, added, skipped } = mergeBackups(await collect(), backup)
    await db.products.bulkAdd(toAdd.products)
    await db.entries.bulkAdd(toAdd.entries)
    await db.settings.bulkAdd(toAdd.settings)
    await db.savedMeals.bulkAdd(toAdd.savedMeals)
    await db.weights.bulkAdd(toAdd.weights)
    await db.mealPreps.bulkAdd(toAdd.mealPreps)
    return { added, skipped }
  })
}

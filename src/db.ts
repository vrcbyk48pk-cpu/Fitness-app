import Dexie, { type Table } from 'dexie'
import type { Entry, Product, Targets } from './types'
import { macrosFor } from './utils'

// One row in the settings table. Right now the only key is "targets".
interface Setting {
  key: string
  value: Targets
}

// The local database (IndexedDB, via Dexie). Everything stays on the phone.
class AppDatabase extends Dexie {
  products!: Table<Product, string>
  entries!: Table<Entry, number>
  settings!: Table<Setting, string>

  constructor() {
    super('calorie-tracker')
    // Only the fields we search or sort by are listed here.
    // "++id" means an auto-incrementing number.
    this.version(1).stores({
      products: 'id, lastUsed',
      entries: '++id, date',
      settings: 'key',
    })
  }
}

export const db = new AppDatabase()

export const DEFAULT_TARGETS: Targets = { kcal: 2200, protein: 130, carbs: 250, fat: 70 }

export async function getTargets(): Promise<Targets> {
  const row = await db.settings.get('targets')
  return row?.value ?? DEFAULT_TARGETS
}

export async function saveTargets(targets: Targets): Promise<void> {
  await db.settings.put({ key: 'targets', value: targets })
}

export async function saveProduct(product: Product): Promise<void> {
  await db.products.put(product)
}

export async function setFavourite(id: string, favourite: boolean): Promise<void> {
  await db.products.update(id, { favourite })
}

// Logs a product for a given day and remembers it as recently used.
export async function addEntry(product: Product, grams: number, date: string): Promise<void> {
  const now = Date.now()
  await db.entries.add({
    date,
    productId: product.id,
    name: product.name,
    grams,
    ...macrosFor(product, grams),
    createdAt: now,
  })
  await db.products.update(product.id, { lastUsed: now, lastGrams: grams })
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id)
}

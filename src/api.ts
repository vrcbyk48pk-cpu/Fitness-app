import { db, saveProduct } from './db'
import type { Product, ProductDraft } from './types'

// What can happen when we look up a barcode.
export type LookupResult =
  | { status: 'found'; product: Product }
  | { status: 'incomplete'; draft: ProductDraft; missing: string[] } // found, but values are missing
  | { status: 'not-found' }
  | { status: 'offline' } // no connection (or the server failed) and not cached yet

// Open Food Facts sometimes sends numbers as text, so convert carefully.
function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  // 1. Local cache first: instant, and works offline.
  const cached = await db.products.get(barcode)
  if (cached) return { status: 'found', product: cached }

  // 2. Otherwise ask Open Food Facts. "fields" keeps the download small.
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
    '?fields=product_name,brands,image_front_small_url,image_front_url,nutriments'

  let data: any
  try {
    const response = await fetch(url)
    if (response.status === 404) return { status: 'not-found' }
    if (!response.ok) return { status: 'offline' }
    data = await response.json()
  } catch {
    return { status: 'offline' }
  }

  if (data.status !== 1 || !data.product) return { status: 'not-found' }

  const p = data.product
  const n = p.nutriments ?? {}

  // Some products only list energy in kJ. 1 kcal = 4.184 kJ.
  let kcal = toNumber(n['energy-kcal_100g'])
  const kj = toNumber(n['energy_100g'])
  if (kcal === undefined && kj !== undefined) kcal = Math.round(kj / 4.184)

  const draft: ProductDraft = {
    id: barcode,
    name: (p.product_name ?? '').trim() || undefined,
    brand: (p.brands ?? '').split(',')[0].trim() || undefined,
    imageUrl: p.image_front_small_url || p.image_front_url || undefined,
    kcal,
    protein: toNumber(n['proteins_100g']),
    carbs: toNumber(n['carbohydrates_100g']),
    fat: toNumber(n['fat_100g']),
  }

  // Work out what is missing, so the user can fill it in from the label.
  const missing: string[] = []
  if (!draft.name) missing.push('name')
  if (draft.kcal === undefined) missing.push('calories')
  if (draft.protein === undefined) missing.push('protein')
  if (draft.carbs === undefined) missing.push('carbs')
  if (draft.fat === undefined) missing.push('fat')
  if (missing.length > 0) return { status: 'incomplete', draft, missing }

  // 3. Complete product: save it so the next scan is instant.
  const product: Product = {
    id: barcode,
    name: draft.name!,
    brand: draft.brand,
    imageUrl: draft.imageUrl,
    kcal: draft.kcal!,
    protein: draft.protein!,
    carbs: draft.carbs!,
    fat: draft.fat!,
    source: 'openfoodfacts',
    favourite: false,
    lastUsed: Date.now(),
    lastGrams: 100,
  }
  await saveProduct(product)
  return { status: 'found', product }
}

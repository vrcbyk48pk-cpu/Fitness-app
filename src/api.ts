import { db, saveProduct } from './db'
import type { Product, ProductDraft } from './types'

// What can happen when we look up a barcode.
export type LookupResult =
  | { status: 'found'; product: Product }
  | { status: 'incomplete'; draft: ProductDraft; missing: string[] } // found, but values are missing
  | { status: 'not-found' }
  | { status: 'offline' } // no connection (or the server failed) and not cached yet

// The product fields we ask Open Food Facts for. Asking for less keeps downloads small.
const FIELDS = 'code,product_name,brands,image_front_small_url,image_front_url,nutriments'

// Open Food Facts sometimes sends numbers as text, so convert carefully.
function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

// Turns a raw Open Food Facts product into our own (possibly incomplete) shape.
function toDraft(barcode: string, p: any): ProductDraft {
  const n = p.nutriments ?? {}

  // Some products only list energy in kJ. 1 kcal = 4.184 kJ.
  let kcal = toNumber(n['energy-kcal_100g'])
  const kj = toNumber(n['energy_100g'])
  if (kcal === undefined && kj !== undefined) kcal = Math.round(kj / 4.184)

  return {
    id: barcode,
    name: (p.product_name ?? '').trim() || undefined,
    brand: (p.brands ?? '').split(',')[0].trim() || undefined,
    imageUrl: p.image_front_small_url || p.image_front_url || undefined,
    kcal,
    protein: toNumber(n['proteins_100g']),
    carbs: toNumber(n['carbohydrates_100g']),
    fat: toNumber(n['fat_100g']),
    // These three are optional: when Open Food Facts has no value they stay unknown.
    fibre: toNumber(n['fiber_100g']),
    sugar: toNumber(n['sugars_100g']),
    salt: toNumber(n['salt_100g']),
  }
}

// Lists which values are missing ('name', 'kcal', 'protein', 'carbs', 'fat'), so the user can fill them in.
function missingFields(draft: ProductDraft): string[] {
  const missing: string[] = []
  if (!draft.name) missing.push('name')
  if (draft.kcal === undefined) missing.push('kcal')
  if (draft.protein === undefined) missing.push('protein')
  if (draft.carbs === undefined) missing.push('carbs')
  if (draft.fat === undefined) missing.push('fat')
  return missing
}

// Saves a draft as a real product (so it is cached for next time), or reports what is missing.
// If the product is already saved, the saved one wins: it keeps your favourite star and last grams.
export async function saveDraft(draft: ProductDraft): Promise<LookupResult> {
  const cached = await db.products.get(draft.id!)
  if (cached) return { status: 'found', product: cached }

  const missing = missingFields(draft)
  if (missing.length > 0) return { status: 'incomplete', draft, missing }

  const product: Product = {
    id: draft.id!,
    name: draft.name!,
    brand: draft.brand,
    imageUrl: draft.imageUrl,
    kcal: draft.kcal!,
    protein: draft.protein!,
    carbs: draft.carbs!,
    fat: draft.fat!,
    fibre: draft.fibre,
    sugar: draft.sugar,
    salt: draft.salt,
    source: 'openfoodfacts',
    favourite: false,
    lastUsed: Date.now(),
    lastGrams: 100,
  }
  await saveProduct(product)
  return { status: 'found', product }
}

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  // 1. Local cache first: instant, and works offline.
  const cached = await db.products.get(barcode)
  if (cached) return { status: 'found', product: cached }

  // 2. Otherwise ask Open Food Facts.
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`

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

  // 3. Save it (if complete) so the next scan is instant.
  return saveDraft(toDraft(barcode, data.product))
}

// ---------- Search by name ----------

// Runs one search on an Open Food Facts site. "nl" only returns products sold in the Netherlands.
async function searchSite(site: 'nl' | 'world', query: string): Promise<ProductDraft[]> {
  const url =
    `https://${site}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Search failed (${response.status})`)
  const data = await response.json()
  const products: any[] = Array.isArray(data.products) ? data.products : []
  return products
    .filter((p) => p.code)
    .map((p) => toDraft(String(p.code), p))
    .filter((draft) => draft.name) // a result without a name is useless in a list
}

// Searches by name. Dutch products come first; if there are only a few,
// worldwide results are added below them. Throws when offline.
export async function searchProducts(query: string): Promise<ProductDraft[]> {
  const results = await searchSite('nl', query)
  if (results.length < 5) {
    const seen = new Set(results.map((r) => r.id))
    // If this second request fails we still show the Dutch results.
    const world = await searchSite('world', query).catch(() => [])
    for (const r of world) if (!seen.has(r.id)) results.push(r)
  }
  return results
}

// Products already saved on the phone whose name or brand matches. Works offline.
export async function searchSaved(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return db.products
    .filter((p) => `${p.name} ${p.brand ?? ''}`.toLowerCase().includes(q))
    .limit(10)
    .toArray()
}

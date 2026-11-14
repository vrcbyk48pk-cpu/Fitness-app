// The four numbers we track everywhere in the app.
export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

// A food. The macro values are always per 100 g.
export interface Product extends Macros {
  id: string // the barcode, or "custom-..." for products you typed in yourself
  name: string
  brand?: string
  imageUrl?: string
  source: 'openfoodfacts' | 'custom'
  favourite: boolean
  lastUsed: number // timestamp, used to sort the "Recent" list
  lastGrams: number // the amount you logged last time, used for one-tap re-logging
}

// One thing you ate. The macros are already calculated for the grams eaten,
// so your history never changes if a product is edited later.
export interface Entry extends Macros {
  id?: number // filled in automatically by the database
  date: string // "YYYY-MM-DD" in local time
  productId: string
  name: string
  grams: number
  createdAt: number
}

// Daily goals. Same shape as Macros: kcal, and grams of protein/carbs/fat.
export type Targets = Macros

// A product that isn't complete yet (used to pre-fill the manual entry form).
export type ProductDraft = Partial<Macros> & {
  id?: string
  name?: string
  brand?: string
  imageUrl?: string
}

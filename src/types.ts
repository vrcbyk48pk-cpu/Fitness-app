// The four numbers we track everywhere in the app.
export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

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
  meal: Meal
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

// One food inside a saved meal. The macros are for the grams listed (not per 100 g).
export interface SavedMealItem extends Macros {
  productId: string
  name: string
  grams: number
}

// A combination of foods you can log in one tap, e.g. "My usual breakfast".
export interface SavedMeal {
  id?: number
  name: string
  items: SavedMealItem[]
}

// One weigh-in. There is at most one per day (the date is the key).
export interface WeightEntry {
  date: string
  kg: number
}

// ---------- Profile (for the calorie goal calculator) ----------

export type Goal = 'lose' | 'muscle' | 'recomp' | 'maintain'
export type Sex = 'male' | 'female'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'very' | 'extreme'

export interface Profile {
  goal: Goal
  sex: Sex
  age: number // years
  heightCm: number
  weightKg: number
  activity: Activity
}

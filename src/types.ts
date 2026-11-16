// The four numbers that are always known.
export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

// The extra values. They are optional: undefined means "unknown", which is not the same as 0.
// (Foods logged before the app tracked these have no value for them.)
export type Extra = 'fibre' | 'sugar' | 'salt'

export interface Nutrients extends Macros {
  fibre?: number
  sugar?: number
  salt?: number
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

// A food. The nutrient values are always per 100 g.
export interface Product extends Nutrients {
  id: string // the barcode, "custom-..." for typed-in products, "prep-..." for meal preps
  name: string
  brand?: string
  imageUrl?: string
  source: 'openfoodfacts' | 'custom' | 'mealprep'
  favourite: boolean
  lastUsed: number // timestamp, used to sort the "Recent" list
  lastGrams: number // the amount you logged last time, used for one-tap re-logging
  portionGrams?: number // the weight of one portion, for meal preps that were divided into portions
}

// One thing you ate. The nutrients are already calculated for the grams eaten,
// so your history never changes if a product is edited later.
export interface Entry extends Nutrients {
  id?: number // filled in automatically by the database
  date: string // "YYYY-MM-DD" in local time
  meal: Meal
  productId: string
  name: string
  grams: number
  portions?: number // set when it was logged as portions, e.g. 1.5
  createdAt: number
}

// Daily goals: kcal, grams of protein/carbs/fat, and grams of fibre.
export interface Targets extends Macros {
  fibre: number
}

// A product that isn't complete yet (used to pre-fill the manual entry form).
export type ProductDraft = Partial<Nutrients> & {
  id?: string
  name?: string
  brand?: string
  imageUrl?: string
}

// One food inside a saved meal. The nutrients are for the grams listed (not per 100 g).
export interface SavedMealItem extends Nutrients {
  productId: string
  name: string
  grams: number
  portions?: number
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

// ---------- Meal prep ----------

// One ingredient of a meal prep. The nutrients are for the grams used (not per 100 g).
export interface Ingredient extends Nutrients {
  productId: string
  name: string
  grams: number
}

// A dish you cook in bulk. Its nutrition per 100 g follows from the ingredients
// and the weight of the finished dish.
export interface MealPrep {
  id: string
  name: string
  ingredients: Ingredient[]
  cookedWeight: number // grams of the whole finished dish
  portions?: number // how many containers it was divided into, if any
  updatedAt: number
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
  weightKg: number // the current weight
  activity: Activity

  // Goal details. Optional: "stay healthy" has none, and older profiles may lack them.
  targetWeightKg?: number
  pace?: number // kg per week
  startWeightKg?: number // the weight when this target was set, for the progress bar
  startDate?: string // "YYYY-MM-DD"
}

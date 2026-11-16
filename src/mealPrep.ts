// The maths of meal prepping. Pure functions, unit-tested in mealPrep.test.ts.
import { t } from './i18n'
import type { MealPrep, Nutrients, Product } from './types'
import { EXTRAS, scaleNutrients } from './utils'

// Adds up the nutrients of a list of foods (the ingredients of a dish, or the items of a saved meal).
// For fibre, sugar and salt: ingredients without a value are left out of the sum, because
// things like oil and spices rarely have one. Only when NO ingredient has a value does
// the result stay unknown.
export function totalNutrients(items: Nutrients[]): Nutrients {
  const total: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  for (const item of items) {
    total.kcal += item.kcal
    total.protein += item.protein
    total.carbs += item.carbs
    total.fat += item.fat
    for (const key of EXTRAS) {
      const value = item[key]
      if (value !== undefined) total[key] = (total[key] ?? 0) + value
    }
  }
  return total
}

// The weight of all raw ingredients together.
export function rawWeight(prep: Pick<MealPrep, 'ingredients'>): number {
  return prep.ingredients.reduce((sum, ingredient) => sum + ingredient.grams, 0)
}

// Nutrition per 100 g of the finished dish. Cooking changes the weight (water boils off, or
// rice soaks it up) but not the nutrients, so everything in the pot is spread over the cooked weight.
export function per100g(prep: Pick<MealPrep, 'ingredients' | 'cookedWeight'>): Nutrients {
  return scaleNutrients(totalNutrients(prep.ingredients), 100 / prep.cookedWeight)
}

// The weight of one portion, or undefined when the dish was not divided into portions.
export function portionGrams(prep: Pick<MealPrep, 'cookedWeight' | 'portions'>): number | undefined {
  return prep.portions ? prep.cookedWeight / prep.portions : undefined
}

// Nutrition of one portion, or undefined when there are no portions.
export function perPortion(prep: Pick<MealPrep, 'ingredients' | 'portions'>): Nutrients | undefined {
  return prep.portions ? scaleNutrients(totalNutrients(prep.ingredients), 1 / prep.portions) : undefined
}

// What is still wrong with a meal prep before it can be saved, or null when it is complete.
export function prepProblem(prep: Pick<MealPrep, 'name' | 'ingredients' | 'cookedWeight' | 'portions'>): string | null {
  if (prep.name.trim() === '') return t('prep.problem.name')
  if (prep.ingredients.length === 0) return t('prep.problem.ingredients')
  if (!(prep.cookedWeight > 0)) return t('prep.problem.weight')
  if (prep.portions !== undefined && !(prep.portions > 0)) return t('prep.problem.portions')
  return null
}

// A meal prep is also stored as a product, so it shows up in search, recents and favourites.
export function prepProductId(prepId: string): string {
  return `prep-${prepId}`
}

// The product for a meal prep. When the product already exists (the prep was edited),
// its favourite star and "recently used" position are kept.
export function toProduct(prep: MealPrep, existing?: Product): Product {
  const portion = portionGrams(prep)
  return {
    ...per100g(prep),
    id: prepProductId(prep.id),
    name: prep.name,
    source: 'mealprep',
    favourite: existing?.favourite ?? false,
    lastUsed: existing?.lastUsed ?? prep.updatedAt,
    // One portion is the natural amount to log; without portions, 100 g.
    lastGrams: portion ?? 100,
    portionGrams: portion,
  }
}

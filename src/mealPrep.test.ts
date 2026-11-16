import { describe, expect, it } from 'vitest'
import { per100g, perPortion, portionGrams, prepProblem, prepProductId, rawWeight, toProduct, totalNutrients } from './mealPrep'
import type { Ingredient, MealPrep, Product, SavedMealItem } from './types'
import { nutrientsFor, sumExtra } from './utils'

// 500 g chicken breast, 300 g dry rice, 20 g olive oil (no fibre/sugar/salt known for the oil)
const chicken: Ingredient = { productId: 'a', name: 'Chicken', grams: 500, kcal: 550, protein: 115, carbs: 0, fat: 10, fibre: 0, sugar: 0, salt: 0.5 }
const rice: Ingredient = { productId: 'b', name: 'Rice', grams: 300, kcal: 1050, protein: 21, carbs: 234, fat: 3, fibre: 3, sugar: 0.6, salt: 0 }
const oil: Ingredient = { productId: 'c', name: 'Olive oil', grams: 20, kcal: 180, protein: 0, carbs: 0, fat: 20 }

const prep: MealPrep = {
  id: 'abc',
  name: 'Chicken and rice',
  ingredients: [chicken, rice, oil],
  cookedWeight: 1400, // the rice soaked up water
  portions: 5,
  updatedAt: 1000,
}

describe('totals', () => {
  it('adds up the ingredients', () => {
    const total = totalNutrients(prep.ingredients)
    expect(total.kcal).toBe(1780)
    expect(total.protein).toBe(136)
    expect(total.carbs).toBe(234)
    expect(total.fat).toBe(33)
  })

  it('sums the known fibre, sugar and salt, skipping ingredients without a value', () => {
    const total = totalNutrients(prep.ingredients)
    expect(total.fibre).toBe(3)
    expect(total.sugar).toBeCloseTo(0.6)
    expect(total.salt).toBe(0.5)
  })

  it('keeps a value unknown when no ingredient has it', () => {
    expect(totalNutrients([oil]).fibre).toBeUndefined()
    expect(totalNutrients([]).salt).toBeUndefined()
  })

  it('knows the raw weight', () => {
    expect(rawWeight(prep)).toBe(820)
  })
})

describe('cooked weight', () => {
  it('spreads the nutrients over the cooked weight', () => {
    const n = per100g(prep)
    expect(n.kcal).toBeCloseTo(127.14, 2) // 1780 / 14
    expect(n.protein).toBeCloseTo(9.71, 2)
    expect(n.fibre).toBeCloseTo(0.214, 3)
  })

  it('gives denser food when water cooks off', () => {
    // The same ingredients reduced to 700 g have twice the calories per 100 g.
    expect(per100g({ ...prep, cookedWeight: 700 }).kcal).toBeCloseTo(2 * per100g(prep).kcal)
  })

  it('logging the whole pot gives back the total', () => {
    expect(nutrientsFor(per100g(prep), prep.cookedWeight).kcal).toBeCloseTo(1780)
  })
})

describe('portions', () => {
  it('divides the dish into equal portions', () => {
    expect(portionGrams(prep)).toBe(280) // 1400 / 5
    const portion = perPortion(prep)!
    expect(portion.kcal).toBe(356) // 1780 / 5
    expect(portion.protein).toBeCloseTo(27.2)
    expect(portion.fibre).toBeCloseTo(0.6)
  })

  it('a portion logged by its grams equals a portion', () => {
    expect(nutrientsFor(per100g(prep), portionGrams(prep)!).kcal).toBeCloseTo(perPortion(prep)!.kcal)
  })

  it('has no portions when none were set', () => {
    expect(portionGrams({ ...prep, portions: undefined })).toBeUndefined()
    expect(perPortion({ ...prep, portions: undefined })).toBeUndefined()
  })
})

describe('prepProblem', () => {
  it('accepts a complete meal prep', () => {
    expect(prepProblem(prep)).toBeNull()
    expect(prepProblem({ ...prep, portions: undefined })).toBeNull()
  })

  it('says what is missing', () => {
    expect(prepProblem({ ...prep, name: '  ' })).toContain('name')
    expect(prepProblem({ ...prep, ingredients: [] })).toContain('ingredient')
    expect(prepProblem({ ...prep, cookedWeight: 0 })).toContain('weight')
    expect(prepProblem({ ...prep, cookedWeight: NaN })).toContain('weight')
    expect(prepProblem({ ...prep, portions: 0 })).toContain('portions')
  })
})

describe('toProduct', () => {
  it('makes a product with per-100g values and the portion size', () => {
    const product = toProduct(prep)
    expect(product.id).toBe('prep-abc')
    expect(product.id).toBe(prepProductId('abc'))
    expect(product.name).toBe('Chicken and rice')
    expect(product.source).toBe('mealprep')
    expect(product.kcal).toBeCloseTo(127.14, 2)
    expect(product.portionGrams).toBe(280)
    expect(product.lastGrams).toBe(280) // one portion
    expect(product.favourite).toBe(false)
  })

  it('logs 100 g by default when there are no portions', () => {
    const product = toProduct({ ...prep, portions: undefined })
    expect(product.portionGrams).toBeUndefined()
    expect(product.lastGrams).toBe(100)
  })

  it('keeps the favourite star and recency when a prep is edited', () => {
    const existing: Product = { ...toProduct(prep), favourite: true, lastUsed: 5000 }
    const edited = toProduct({ ...prep, name: 'Chicken rice v2', cookedWeight: 1500, updatedAt: 9000 }, existing)
    expect(edited.favourite).toBe(true)
    expect(edited.lastUsed).toBe(5000)
    expect(edited.name).toBe('Chicken rice v2')
    expect(edited.portionGrams).toBe(300)
  })
})

describe('combos (saved meals)', () => {
  // "Chicken soup (1 portion) + protein pasta (100 g)"
  const soup: SavedMealItem = { productId: 'prep-soup', name: 'Chicken soup', grams: 350, portions: 1, kcal: 210, protein: 18, carbs: 14, fat: 8, fibre: 3.5 }
  const pasta: SavedMealItem = { productId: 'p', name: 'Protein pasta', grams: 100, kcal: 340, protein: 22, carbs: 55, fat: 2.5, fibre: 8 }

  it('adds a portion-based item and a gram-based item together', () => {
    const total = totalNutrients([soup, pasta])
    expect(total.kcal).toBe(550)
    expect(total.protein).toBe(40)
    expect(total.fibre).toBe(11.5)
  })

  it('reports how many items have unknown fibre', () => {
    const noFibre: SavedMealItem = { ...pasta, fibre: undefined }
    expect(sumExtra([soup, noFibre], 'fibre')).toEqual({ total: 3.5, unknown: 1 })
    expect(sumExtra([soup, pasta], 'fibre')).toEqual({ total: 11.5, unknown: 0 })
    expect(sumExtra([], 'salt')).toEqual({ total: 0, unknown: 0 })
  })
})

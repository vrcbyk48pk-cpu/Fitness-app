import { describe, expect, it } from 'vitest'
import { bmr, maintenance, suggestTargets } from './calculator'
import type { Profile } from './types'

const man: Profile = { goal: 'maintain', sex: 'male', age: 25, heightCm: 180, weightKg: 80, activity: 'moderate' }
const woman: Profile = { goal: 'maintain', sex: 'female', age: 30, heightCm: 165, weightKg: 60, activity: 'sedentary' }

describe('bmr (Mifflin-St Jeor)', () => {
  it('calculates for a man: 10*80 + 6.25*180 - 5*25 + 5', () => {
    expect(bmr(man)).toBe(1805)
  })

  it('calculates for a woman: 10*60 + 6.25*165 - 5*30 - 161', () => {
    expect(bmr(woman)).toBe(1320.25)
  })
})

describe('maintenance', () => {
  it('multiplies the BMR by the activity factor', () => {
    expect(maintenance({ ...man, activity: 'sedentary' })).toBeCloseTo(1805 * 1.2)
    expect(maintenance({ ...man, activity: 'light' })).toBeCloseTo(1805 * 1.375)
    expect(maintenance({ ...man, activity: 'moderate' })).toBeCloseTo(1805 * 1.55)
    expect(maintenance({ ...man, activity: 'very' })).toBeCloseTo(1805 * 1.725)
    expect(maintenance({ ...man, activity: 'extreme' })).toBeCloseTo(1805 * 1.9)
  })
})

describe('suggestTargets', () => {
  it('keeps maintenance calories for "stay healthy"', () => {
    // 1805 * 1.55 = 2797.75 -> 2800. Protein 1.6 g/kg, fat 30%.
    expect(suggestTargets(man).targets).toEqual({ kcal: 2800, protein: 128, carbs: 363, fat: 93 })
  })

  it('takes 20% off to lose weight', () => {
    // 2797.75 * 0.8 = 2238.2 -> 2240. Protein 2.0 g/kg, fat 25%.
    expect(suggestTargets({ ...man, goal: 'lose' }).targets).toEqual({ kcal: 2240, protein: 160, carbs: 261, fat: 62 })
  })

  it('adds 10% to build muscle', () => {
    // 2797.75 * 1.1 = 3077.5 -> 3080. Protein 1.8 g/kg.
    const { targets } = suggestTargets({ ...man, goal: 'muscle' })
    expect(targets.kcal).toBe(3080)
    expect(targets.protein).toBe(144)
  })

  it('takes 10% off for recomposition, with the most protein', () => {
    // 2797.75 * 0.9 = 2517.98 -> 2520. Protein 2.2 g/kg.
    const { targets } = suggestTargets({ ...man, goal: 'recomp' })
    expect(targets.kcal).toBe(2520)
    expect(targets.protein).toBe(176)
  })

  it('makes the macros add up to the calories', () => {
    for (const goal of ['lose', 'muscle', 'recomp', 'maintain'] as const) {
      for (const profile of [man, woman]) {
        const { kcal, protein, carbs, fat } = suggestTargets({ ...profile, goal }).targets
        // Rounding each macro to whole grams may shift the total by a few kcal.
        expect(Math.abs(4 * protein + 4 * carbs + 9 * fat - kcal)).toBeLessThanOrEqual(8)
      }
    }
  })

  it('keeps fat between 25% and 30% of the calories', () => {
    for (const goal of ['lose', 'muscle', 'recomp', 'maintain'] as const) {
      const { kcal, fat } = suggestTargets({ ...man, goal }).targets
      expect((fat * 9) / kcal).toBeGreaterThan(0.24)
      expect((fat * 9) / kcal).toBeLessThan(0.31)
    }
  })

  it('does not go below 1200 kcal for a woman or 1500 for a man', () => {
    // Woman: 1320.25 * 1.2 * 0.8 = 1267 -> stays above 1200.
    expect(suggestTargets({ ...woman, goal: 'lose' }).targets.kcal).toBe(1270)
    // Smaller woman: (500 + 968.75 - 200 - 161) * 1.2 * 0.8 = 1063 -> raised to 1200.
    const small: Profile = { ...woman, goal: 'lose', age: 40, heightCm: 155, weightKg: 50 }
    expect(suggestTargets(small).targets.kcal).toBe(1200)
    expect(suggestTargets(small).explanation).toContain('safe minimum')
    // Small man: (550 + 1000 - 250 + 5) * 1.2 * 0.8 = 1253 -> raised to 1500.
    expect(suggestTargets({ ...man, goal: 'lose', age: 50, heightCm: 160, weightKg: 55, activity: 'sedentary' }).targets.kcal).toBe(1500)
  })

  it('never raises someone above their maintenance because of the minimum', () => {
    // Maintenance here is (450 + 937.5 - 300 - 161) * 1.2 = 1112, which is below 1200.
    const tiny: Profile = { goal: 'lose', sex: 'female', age: 60, heightCm: 150, weightKg: 45, activity: 'sedentary' }
    expect(suggestTargets(tiny).targets.kcal).toBe(1110)
  })

  it('does not apply a deficit under 18', () => {
    const teen: Profile = { ...man, age: 16, goal: 'lose' }
    const asMaintain = suggestTargets({ ...teen, goal: 'maintain' })
    expect(suggestTargets(teen).targets.kcal).toBe(asMaintain.targets.kcal)
    expect(suggestTargets(teen).explanation).toContain('under 18')
    // A surplus is still allowed.
    expect(suggestTargets({ ...teen, goal: 'muscle' }).targets.kcal).toBeGreaterThan(asMaintain.targets.kcal)
  })

  it('caps protein at 35% of the calories for very heavy people', () => {
    const heavy: Profile = { ...man, goal: 'recomp', weightKg: 180 }
    const { kcal, protein, carbs } = suggestTargets(heavy).targets
    expect(protein).toBeLessThan(2.2 * 180)
    expect(protein * 4).toBeLessThanOrEqual(0.35 * kcal + 2)
    expect(carbs).toBeGreaterThan(0)
  })

  it('explains the calculation in one line', () => {
    const { explanation, bmr: rest, maintenance: maintain } = suggestTargets({ ...man, goal: 'lose' })
    expect(rest).toBe(1805)
    expect(maintain).toBe(2798)
    expect(explanation).toContain('1805 kcal at rest')
    expect(explanation).toContain('1.55')
    expect(explanation).toContain('minus 20%')
  })

  it('suggests less after losing weight', () => {
    const before = suggestTargets({ ...man, goal: 'lose' }).targets
    const after = suggestTargets({ ...man, goal: 'lose', weightKg: 75 }).targets
    expect(after.kcal).toBeLessThan(before.kcal)
    expect(after.protein).toBeLessThan(before.protein)
  })
})

import { describe, expect, it } from 'vitest'
import {
  bestPace,
  bmr,
  dailyKcalForPace,
  estimateDate,
  goalDate,
  isUnderweight,
  longRoadNote,
  maintenance,
  needsGoalDetails,
  paceChoices,
  paceFor,
  recompTip,
  suggestTargets,
  targetWeightProblem,
  weeksToTarget,
} from './calculator'
import type { Profile } from './types'

// BMR 1805, maintenance 2797.75
const man: Profile = { goal: 'maintain', sex: 'male', age: 25, heightCm: 180, weightKg: 80, activity: 'moderate' }
// BMR 1320.25, maintenance 1584.3
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

describe('pace', () => {
  it('turns kg per week into kcal per day (7700 kcal per kg)', () => {
    expect(dailyKcalForPace(0.25)).toBe(275)
    expect(dailyKcalForPace(0.5)).toBe(550)
    expect(dailyKcalForPace(0.75)).toBe(825)
  })

  it('uses the chosen pace when it is one of the options', () => {
    expect(paceFor('lose', 0.75)).toBe(0.75)
    expect(paceFor('muscle', 0.5)).toBe(0.5)
  })

  it('falls back to the recommended pace', () => {
    expect(paceFor('lose')).toBe(0.5) // steady
    expect(paceFor('muscle')).toBe(0.25) // lean
    expect(paceFor('muscle', 0.75)).toBe(0.25) // 0.75 is not an option for muscle
  })

  it('offers 1 kg a week only for losing weight', () => {
    expect(paceFor('lose', 1)).toBe(1)
    expect(paceFor('recomp', 1)).toBe(0.5) // not an option: falls back to the recommended pace
    expect(paceFor('muscle', 1)).toBe(0.25)
    expect(dailyKcalForPace(1)).toBe(1100)
  })

  it('has paces for recomposition, and none for maintenance', () => {
    expect(paceFor('recomp')).toBe(0.5)
    expect(paceFor('recomp', 0.25)).toBe(0.25)
    expect(paceFor('recomp', 0.75)).toBe(0.75)
    expect(paceFor('maintain', 0.5)).toBe(0)
  })
})

describe('suggestTargets: calories from the pace', () => {
  it('keeps maintenance calories for "stay healthy"', () => {
    // 2797.75 -> 2800. Protein 1.6 g/kg, fat 30%.
    const s = suggestTargets(man)
    expect(s.targets).toEqual({ kcal: 2800, protein: 128, carbs: 363, fat: 93 })
    expect(s.weeklyChange).toBe(0)
    expect(s.note).toBeUndefined()
  })

  it('subtracts the daily deficit of the chosen pace to lose weight', () => {
    // 2797.75 - 275 / 550 / 825
    expect(suggestTargets({ ...man, goal: 'lose', pace: 0.25 }).targets.kcal).toBe(2520)
    expect(suggestTargets({ ...man, goal: 'lose', pace: 0.5 }).targets.kcal).toBe(2250)
    expect(suggestTargets({ ...man, goal: 'lose', pace: 0.75 }).targets.kcal).toBe(1970)
  })

  it('gives full targets for steady weight loss', () => {
    // 2250 kcal. Protein 2.0 g/kg = 160, fat 25% = 62.5 -> 63, carbs the rest.
    const s = suggestTargets({ ...man, goal: 'lose', pace: 0.5 })
    expect(s.targets).toEqual({ kcal: 2250, protein: 160, carbs: 261, fat: 63 })
    expect(s.weeklyChange).toBeCloseTo(-0.5)
    expect(s.explanation).toContain('Losing 0.5 kg a week takes about 550 kcal less per day')
  })

  it('adds the daily surplus of the chosen pace to build muscle', () => {
    // 2797.75 + 275 / 550
    const lean = suggestTargets({ ...man, goal: 'muscle', pace: 0.25 })
    expect(lean.targets.kcal).toBe(3070)
    expect(lean.targets.protein).toBe(144) // 1.8 g/kg
    expect(lean.weeklyChange).toBeCloseTo(0.25)
    expect(suggestTargets({ ...man, goal: 'muscle', pace: 0.5 }).targets.kcal).toBe(3350)
  })

  it('uses the recommended pace when none was chosen', () => {
    expect(suggestTargets({ ...man, goal: 'lose' }).targets.kcal).toBe(2250) // steady
    expect(suggestTargets({ ...man, goal: 'muscle' }).targets.kcal).toBe(3070) // lean
  })

  it('uses the chosen deficit for recomposition, with the most protein', () => {
    // 2797.75 - 550 = 2247.75 -> 2250. Protein 2.2 g/kg.
    const s = suggestTargets({ ...man, goal: 'recomp', pace: 0.5 })
    expect(s.targets.kcal).toBe(2250)
    expect(s.targets.protein).toBe(176)
    expect(s.weeklyChange).toBeCloseTo(-0.5)
    expect(suggestTargets({ ...man, goal: 'recomp', pace: 0.25 }).targets.kcal).toBe(2520)
    expect(suggestTargets({ ...man, goal: 'recomp', pace: 0.75 }).targets.kcal).toBe(1970)
  })

  it('goes to 1 kg a week when there is room for it', () => {
    // A bigger, very active man: BMR 2105, maintenance 3631. 3631 - 1100 = 2531.
    const big: Profile = { ...man, weightKg: 110, activity: 'very', goal: 'lose', pace: 1 }
    const s = suggestTargets(big)
    expect(s.targets.kcal).toBe(2530)
    expect(s.weeklyChange).toBeCloseTo(-1)
    expect(s.note).toBeUndefined()
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

  it('caps protein at 35% of the calories for very heavy people', () => {
    const { kcal, protein, carbs } = suggestTargets({ ...man, goal: 'recomp', weightKg: 180 }).targets
    expect(protein).toBeLessThan(2.2 * 180)
    expect(protein * 4).toBeLessThanOrEqual(0.35 * kcal + 2)
    expect(carbs).toBeGreaterThan(0)
  })
})

describe('suggestTargets: safety floor', () => {
  it('never goes below the BMR', () => {
    for (const goal of ['lose', 'recomp'] as const) {
      for (const pace of [0.25, 0.5, 0.75, 1]) {
        for (const profile of [man, woman]) {
          const candidate: Profile = { ...profile, goal, pace }
          expect(suggestTargets(candidate).targets.kcal).toBeGreaterThanOrEqual(bmr(candidate))
        }
      }
    }
  })

  it('stops at the BMR when the pace asks for more, and says so', () => {
    // 1584.3 - 550 = 1034, which is below the BMR of 1320.25 -> 1330 (rounded up).
    const s = suggestTargets({ ...woman, goal: 'lose', pace: 0.5 })
    expect(s.targets.kcal).toBe(1330)
    expect(s.note).toContain('below the 1,320 kcal your body uses at rest')
    // The deficit that is left: 1584.3 - 1320.25 = 264 kcal a day = 0.24 kg a week.
    expect(s.weeklyChange).toBeCloseTo(-0.24, 2)
    expect(s.note).toContain('0.24 kg a week')
  })

  it('does not mention the floor when the pace fits', () => {
    // 1584.3 - 275 = 1309 is below 1320 too, so even "relaxed" is capped for her...
    expect(suggestTargets({ ...woman, goal: 'lose', pace: 0.25 }).note).toBeDefined()
    // ...but not for someone with more room.
    expect(suggestTargets({ ...man, goal: 'lose', pace: 0.75 }).note).toBeUndefined()
  })

  it('does not apply a deficit under 18', () => {
    const teen: Profile = { ...man, age: 16, goal: 'lose', pace: 0.5 }
    const s = suggestTargets(teen)
    expect(s.targets.kcal).toBe(suggestTargets({ ...teen, goal: 'maintain' }).targets.kcal)
    expect(s.weeklyChange).toBe(0)
    expect(s.note).toContain('Under 18')
    // A surplus is still allowed.
    expect(suggestTargets({ ...teen, goal: 'muscle' }).weeklyChange).toBeGreaterThan(0)
  })
})

describe('paceChoices: comparing the options', () => {
  const today = new Date(2026, 10, 16)

  it('lists every pace with its calories and date', () => {
    const choices = paceChoices({ ...man, goal: 'lose', targetWeightKg: 75 }, today)
    expect(choices.map((c) => c.value)).toEqual([0.25, 0.5, 0.75, 1])
    expect(choices.map((c) => c.kcal)).toEqual([2520, 2250, 1970, 1810])
    expect(choices.map((c) => c.recommended)).toEqual([false, true, false, false])
    // 5 kg: 20 weeks, 10 weeks, 6.67 weeks
    expect(choices[0].date).toEqual(new Date(2027, 3, 5))
    expect(choices[1].date).toEqual(new Date(2027, 0, 25))
    expect(choices[2].date).toEqual(new Date(2027, 0, 2))
  })

  it('marks a pace below the BMR as not available, with the reason', () => {
    // 2797.75 - 1100 = 1698, below his BMR of 1805.
    const choices = paceChoices({ ...man, goal: 'lose', targetWeightKg: 75 }, today)
    expect(choices.map((c) => c.available)).toEqual([true, true, true, false])
    expect(choices[3].reason).toContain('less than the 1,805 kcal your body uses at rest')
    expect(choices[0].reason).toBeUndefined()
  })

  it('can leave no pace available for someone small and sedentary', () => {
    // Her room between maintenance (1584) and BMR (1320) is 264 kcal: less than the slowest pace.
    const choices = paceChoices({ ...woman, goal: 'lose', targetWeightKg: 55 }, today)
    expect(choices.every((c) => !c.available)).toBe(true)
    expect(bestPace(choices)).toBeUndefined()
  })

  it('offers two surplus paces for building muscle, always available', () => {
    const choices = paceChoices({ ...woman, goal: 'muscle', targetWeightKg: 63 }, today)
    expect(choices.map((c) => c.value)).toEqual([0.25, 0.5])
    expect(choices.every((c) => c.available)).toBe(true)
    // 1584.3 + 275 and + 550
    expect(choices.map((c) => c.kcal)).toEqual([1860, 2130])
    expect(choices[0].date).toEqual(new Date(2027, 1, 8)) // 3 kg at 0.25 = 12 weeks
  })

  it('offers three paces for recomposition', () => {
    const choices = paceChoices({ ...man, goal: 'recomp' }, today)
    expect(choices.map((c) => c.value)).toEqual([0.25, 0.5, 0.75])
    expect(choices.map((c) => c.kcal)).toEqual([2520, 2250, 1970])
    expect(choices.every((c) => c.date === null)).toBe(true) // no target, no date
  })

  it('has no deficit paces under 18, and nothing for maintenance', () => {
    const teen = paceChoices({ ...man, age: 16, goal: 'lose', targetWeightKg: 75 }, today)
    expect(teen.every((c) => !c.available && c.reason!.includes('under 18'))).toBe(true)
    expect(paceChoices({ ...man, age: 16, goal: 'muscle' }, today).every((c) => c.available)).toBe(true)
    expect(paceChoices(man, today)).toEqual([])
  })

  it('picks the pace to select', () => {
    const choices = paceChoices({ ...man, goal: 'lose', targetWeightKg: 75 }, today)
    expect(bestPace(choices, 0.75)).toBe(0.75) // the chosen one
    expect(bestPace(choices)).toBe(0.5) // the recommended one
    expect(bestPace(choices, 1)).toBe(0.5) // chosen but not available -> recommended
    // When the recommended one is not available either: the fastest that is.
    const tight: Profile = { ...woman, activity: 'light', goal: 'lose' } // room: 1815 - 1320 = 495 kcal
    expect(bestPace(paceChoices(tight, today))).toBe(0.25)
  })

  it('suggests "Lose weight" for a recomposition target more than 5 kg down', () => {
    expect(recompTip(80, 74)).toContain('Lose weight')
    expect(recompTip(80, 75)).toBeNull() // exactly 5 kg is fine
    expect(recompTip(80, 82)).toBeNull()
    expect(recompTip(80, undefined)).toBeNull()
  })
})

describe('targetWeightProblem', () => {
  it('wants a lower target for weight loss', () => {
    expect(targetWeightProblem('lose', 80, 75)).toBeNull()
    expect(targetWeightProblem('lose', 80, 80)).toContain('below your current 80 kg')
    expect(targetWeightProblem('lose', 80, 85)).toContain('below')
  })

  it('wants a higher target for building muscle', () => {
    expect(targetWeightProblem('muscle', 80, 84)).toBeNull()
    expect(targetWeightProblem('muscle', 80, 80)).toContain('above your current 80 kg')
    expect(targetWeightProblem('muscle', 80, 70)).toContain('above')
  })

  it('accepts either direction for recomposition', () => {
    expect(targetWeightProblem('recomp', 80, 78)).toBeNull()
    expect(targetWeightProblem('recomp', 80, 82)).toBeNull()
  })

  it('rejects impossible weights', () => {
    expect(targetWeightProblem('lose', 80, 5)).toContain('between 30 and 300')
    expect(targetWeightProblem('muscle', 80, 500)).toContain('between 30 and 300')
  })

  it('accepts a far-away target', () => {
    expect(targetWeightProblem('lose', 140, 75)).toBeNull()
  })
})

describe('date estimate', () => {
  const start = new Date(2026, 10, 16) // 16 November 2026

  it('counts the weeks to the target', () => {
    expect(weeksToTarget(80, 75, -0.5)).toBe(10)
    expect(weeksToTarget(70, 73, 0.25)).toBe(12)
    expect(weeksToTarget(80, 80, -0.5)).toBe(0)
  })

  it('gives no estimate without progress, or when the change goes the wrong way', () => {
    expect(weeksToTarget(80, 75, 0)).toBeNull()
    expect(weeksToTarget(80, 75, 0.25)).toBeNull() // gaining, but the target is lower
    expect(weeksToTarget(80, 85, -0.5)).toBeNull() // losing, but the target is higher
  })

  it('estimates the date: 5 kg at 0.5 kg a week is 10 weeks = 70 days', () => {
    expect(estimateDate(80, 75, -0.5, start)).toEqual(new Date(2027, 0, 25))
  })

  it('rounds part of a day up', () => {
    // 1 kg at 0.75 kg a week = 9.33 days -> 10 days
    expect(estimateDate(80, 79, -0.75, start)).toEqual(new Date(2026, 10, 26))
  })

  it('moves the date closer as weight is lost', () => {
    const before = estimateDate(80, 75, -0.5, start)!
    const after = estimateDate(78, 75, -0.5, start)!
    expect(after.getTime()).toBeLessThan(before.getTime())
  })

  it('estimates for a whole profile', () => {
    expect(goalDate({ ...man, goal: 'lose', pace: 0.5, targetWeightKg: 75 }, start)).toEqual(new Date(2027, 0, 25))
    expect(goalDate({ ...man, goal: 'muscle', pace: 0.25, targetWeightKg: 82 }, start)).toEqual(new Date(2027, 0, 11))
  })

  it('uses the slower pace when the calories hit the safety floor', () => {
    // She can only lose about 0.24 kg a week, so 2 kg takes about 8.3 weeks, not 4.
    const date = goalDate({ ...woman, goal: 'lose', pace: 0.5, targetWeightKg: 58 }, start)!
    const days = Math.round((date.getTime() - start.getTime()) / 86_400_000)
    expect(days).toBeGreaterThan(55)
    expect(days).toBeLessThan(62)
  })

  it('gives no date without a target, at maintenance, or under 18 with a deficit', () => {
    expect(goalDate({ ...man, goal: 'lose', pace: 0.5 }, start)).toBeNull()
    expect(goalDate({ ...man, goal: 'maintain', targetWeightKg: 75 }, start)).toBeNull()
    expect(goalDate({ ...man, age: 16, goal: 'lose', pace: 0.5, targetWeightKg: 75 }, start)).toBeNull()
  })

  it('estimates recomposition only towards a lower target', () => {
    // 2 kg at 0.5 kg a week = 4 weeks
    expect(goalDate({ ...man, goal: 'recomp', pace: 0.5, targetWeightKg: 78 }, start)).toEqual(new Date(2026, 11, 14))
    expect(goalDate({ ...man, goal: 'recomp', pace: 0.5, targetWeightKg: 82 }, start)).toBeNull()
  })

  it('remarks on targets more than a year away', () => {
    expect(longRoadNote(10)).toBeNull()
    expect(longRoadNote(52)).toBeNull()
    expect(longRoadNote(130)).toContain('about 30 months')
    expect(longRoadNote(null)).toBeNull()
  })
})

describe('other checks', () => {
  it('recognises an underweight target (BMI below 18.5)', () => {
    expect(isUnderweight(50, 180)).toBe(true) // BMI 15.4
    expect(isUnderweight(60, 180)).toBe(false) // BMI 18.52
    expect(isUnderweight(75, 180)).toBe(false)
  })

  it('knows which profiles still need a target weight or pace', () => {
    expect(needsGoalDetails({ ...man, goal: 'lose' })).toBe(true)
    expect(needsGoalDetails({ ...man, goal: 'lose', targetWeightKg: 75 })).toBe(true) // no pace yet
    expect(needsGoalDetails({ ...man, goal: 'lose', pace: 0.5 })).toBe(true) // no target yet
    expect(needsGoalDetails({ ...man, goal: 'lose', targetWeightKg: 75, pace: 0.5 })).toBe(false)
    expect(needsGoalDetails({ ...man, goal: 'lose', targetWeightKg: 75, pace: 1 })).toBe(false)
    expect(needsGoalDetails({ ...man, goal: 'muscle' })).toBe(true)
    expect(needsGoalDetails({ ...man, goal: 'muscle', targetWeightKg: 84, pace: 0.75 })).toBe(true) // not an option for muscle
    // Recomposition: a pace has to be chosen, the target is optional.
    expect(needsGoalDetails({ ...man, goal: 'recomp' })).toBe(true)
    expect(needsGoalDetails({ ...man, goal: 'recomp', pace: 0.5 })).toBe(false)
    expect(needsGoalDetails({ ...man, goal: 'maintain' })).toBe(false)
  })
})

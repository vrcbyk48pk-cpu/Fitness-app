// Calorie and macro suggestions from a profile. Pure maths, no browser code,
// so it is unit-tested in calculator.test.ts.
import type { Activity, Goal, Profile, Targets } from './types'

// How much more energy you use than at complete rest.
export const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extreme: 1.9,
}

// Calories relative to maintenance: -0.2 means 20% less.
const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -0.2,
  muscle: 0.1,
  recomp: -0.1,
  maintain: 0,
}

// Grams of protein per kg of body weight. Higher when eating less,
// to help keep muscle.
const PROTEIN_PER_KG: Record<Goal, number> = {
  lose: 2.0,
  muscle: 1.8,
  recomp: 2.2,
  maintain: 1.6,
}

// The share of calories that comes from fat.
const FAT_SHARE: Record<Goal, number> = {
  lose: 0.25,
  muscle: 0.25,
  recomp: 0.25,
  maintain: 0.3,
}

const GOAL_TEXT: Record<Goal, string> = {
  lose: 'minus 20% to lose weight',
  muscle: 'plus 10% to build muscle',
  recomp: 'minus 10% for body recomposition',
  maintain: 'kept as is to maintain your weight',
}

// A deficit never takes the suggestion below these (commonly used) minimums.
const MINIMUM_KCAL = { female: 1200, male: 1500 }

// Basal metabolic rate: the calories your body uses at complete rest (Mifflin-St Jeor).
export function bmr(profile: Profile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age
  return profile.sex === 'male' ? base + 5 : base - 161
}

// The calories that keep your weight the same.
export function maintenance(profile: Profile): number {
  return bmr(profile) * ACTIVITY_FACTORS[profile.activity]
}

export interface Suggestion {
  bmr: number
  maintenance: number
  targets: Targets
  explanation: string // one line: how the numbers were calculated
}

export function suggestTargets(profile: Profile): Suggestion {
  const rest = bmr(profile)
  const maintain = maintenance(profile)

  // 1. Calories: maintenance, adjusted for the goal.
  let adjustment = GOAL_ADJUSTMENT[profile.goal]
  let goalText = GOAL_TEXT[profile.goal]
  if (profile.age < 18 && adjustment < 0) {
    // Still growing: no calorie deficit without a doctor.
    adjustment = 0
    goalText = 'kept at maintenance, because a calorie deficit is not advised under 18 without a doctor'
  }
  let kcal = maintain * (1 + adjustment)

  // Never suggest less than the minimum (or less than maintenance, if that is lower still).
  const minimum = Math.min(MINIMUM_KCAL[profile.sex], maintain)
  if (kcal < minimum) {
    kcal = minimum
    goalText += `, raised to a safe minimum of ${Math.round(minimum / 10) * 10} kcal`
  }
  kcal = Math.round(kcal / 10) * 10

  // 2. Protein from body weight, but at most 35% of the calories
  //    (otherwise very heavy people would get an unrealistic amount).
  const perKg = PROTEIN_PER_KG[profile.goal]
  const protein = Math.round(Math.min(perKg * profile.weightKg, (0.35 * kcal) / 4))

  // 3. Fat as a share of the calories (fat has 9 kcal per gram).
  const fat = Math.round((FAT_SHARE[profile.goal] * kcal) / 9)

  // 4. Carbs get whatever is left (protein and carbs have 4 kcal per gram).
  const carbs = Math.max(0, Math.round((kcal - 4 * protein - 9 * fat) / 4))

  return {
    bmr: Math.round(rest),
    maintenance: Math.round(maintain),
    targets: { kcal, protein, carbs, fat },
    explanation:
      `Your body uses about ${Math.round(rest)} kcal at rest (Mifflin-St Jeor). ` +
      `Times ${ACTIVITY_FACTORS[profile.activity]} for your activity gives ${Math.round(maintain)} kcal to maintain, ${goalText}. ` +
      `Protein is about ${perKg} g per kg of body weight, fat ${FAT_SHARE[profile.goal] * 100}% of calories, and carbs the rest.`,
  }
}

// ---------- The choices, with the text shown in the onboarding and in Settings ----------

export const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: 'lose', label: 'Lose weight', description: 'Eat a bit less than you burn' },
  { value: 'muscle', label: 'Build muscle', description: 'Eat a bit more, with plenty of protein' },
  { value: 'recomp', label: 'Both', description: 'Body recomposition: lose fat while building muscle' },
  { value: 'maintain', label: 'Stay healthy', description: 'Keep your weight where it is' },
]

export const ACTIVITY_OPTIONS: { value: Activity; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Desk job or studying, little exercise' },
  { value: 'light', label: 'Lightly active', description: 'Light exercise 1–3 days a week' },
  { value: 'moderate', label: 'Moderately active', description: 'Exercise 3–5 days a week' },
  { value: 'very', label: 'Very active', description: 'Hard exercise 6–7 days a week' },
  { value: 'extreme', label: 'Extremely active', description: 'Physical job or training twice a day' },
]

export const DISCLAIMER =
  'These numbers are estimates, not medical advice. Do your own research, and talk to a doctor or dietitian for advice that fits you.'

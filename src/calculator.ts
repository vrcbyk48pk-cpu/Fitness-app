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

// One kilogram of body fat holds about 7700 kcal. So losing 0.5 kg a week
// takes a deficit of 0.5 * 7700 = 3850 kcal a week, or 550 kcal a day.
export const KCAL_PER_KG = 7700

// The paces you can choose, in kg per week.
export const PACE_OPTIONS: Record<'lose' | 'muscle', { value: number; label: string; recommended?: boolean }[]> = {
  lose: [
    { value: 0.25, label: 'Relaxed' },
    { value: 0.5, label: 'Steady', recommended: true },
    { value: 0.75, label: 'Fast' },
  ],
  muscle: [
    { value: 0.25, label: 'Lean', recommended: true },
    { value: 0.5, label: 'Faster' },
  ],
}

// Body recomposition has no pace to choose: it uses a small fixed deficit.
const RECOMP_DEFICIT = 0.1 // 10% below maintenance

// Grams of protein per kg of body weight. Higher when eating less, to help keep muscle.
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

// Basal metabolic rate: the calories your body uses at complete rest (Mifflin-St Jeor).
export function bmr(profile: Profile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age
  return profile.sex === 'male' ? base + 5 : base - 161
}

// The calories that keep your weight the same.
export function maintenance(profile: Profile): number {
  return bmr(profile) * ACTIVITY_FACTORS[profile.activity]
}

// The calories per day that go with a pace: 0.5 kg per week -> 550 kcal per day.
export function dailyKcalForPace(kgPerWeek: number): number {
  return Math.round((kgPerWeek * KCAL_PER_KG) / 7)
}

// The pace to use for a goal: the chosen one if it is a valid option, otherwise the recommended one.
// Goals without a pace (recomposition, maintain) give 0.
export function paceFor(goal: Goal, chosen?: number): number {
  if (goal !== 'lose' && goal !== 'muscle') return 0
  const options = PACE_OPTIONS[goal]
  return options.find((o) => o.value === chosen)?.value ?? options.find((o) => o.recommended)!.value
}

export interface Suggestion {
  bmr: number
  maintenance: number
  targets: Targets
  // The weight change these calories should give, in kg per week.
  // Negative = losing, positive = gaining, 0 = staying the same.
  weeklyChange: number
  explanation: string // one line: how the numbers were calculated
  note?: string // set when the calories had to be limited for safety
}

export function suggestTargets(profile: Profile): Suggestion {
  const rest = bmr(profile)
  const maintain = maintenance(profile)
  const pace = paceFor(profile.goal, profile.pace)
  const perDay = dailyKcalForPace(pace)

  // 1. Calories: maintenance, plus or minus what the goal needs.
  let kcal = maintain
  let goalText = 'That is your target, to keep your weight where it is.'
  let note: string | undefined

  if (profile.goal === 'lose') {
    kcal = maintain - perDay
    goalText = `Losing ${pace} kg a week takes about ${perDay} kcal less per day.`
  } else if (profile.goal === 'muscle') {
    kcal = maintain + perDay
    goalText = `Gaining ${pace} kg a week takes about ${perDay} kcal more per day.`
  } else if (profile.goal === 'recomp') {
    kcal = maintain * (1 - RECOMP_DEFICIT)
    goalText = 'Body recomposition uses a small deficit of 10%.'
  }

  if (profile.age < 18 && kcal < maintain) {
    // Still growing: no calorie deficit without a doctor.
    kcal = maintain
    note = 'Under 18, eating less than you burn is not advised without a doctor, so this is your maintenance level.'
  } else if (kcal < rest) {
    // Safety floor: never eat less than the body uses at rest.
    kcal = rest
    const slower = (((maintain - rest) * 7) / KCAL_PER_KG).toFixed(2)
    note =
      `Losing ${pace} kg a week would put you below the ${Math.round(rest)} kcal your body uses at rest, ` +
      `so I stopped there. Expect about ${slower} kg a week instead.`
  }

  // What these calories actually do to your weight (before rounding the calories).
  const weeklyChange = ((kcal - maintain) * 7) / KCAL_PER_KG

  // Round to a friendly number. At the floor, round up so we stay at or above it.
  kcal = kcal === rest ? Math.ceil(kcal / 10) * 10 : Math.round(kcal / 10) * 10

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
    weeklyChange,
    note,
    explanation:
      `Your body uses about ${Math.round(rest)} kcal at rest (Mifflin-St Jeor). ` +
      `Times ${ACTIVITY_FACTORS[profile.activity]} for your activity gives ${Math.round(maintain)} kcal to maintain. ` +
      `${goalText} ` +
      `Protein is about ${perKg} g per kg of body weight, fat ${FAT_SHARE[profile.goal] * 100}% of calories, and carbs the rest.`,
  }
}

// ---------- Target weight ----------

// Checks a target weight against the goal. Returns a message when it can't be used, or null when it is fine.
export function targetWeightProblem(goal: Goal, currentKg: number, targetKg: number): string | null {
  if (targetKg < 30 || targetKg > 300) return 'Enter a weight between 30 and 300 kg.'
  if (goal === 'lose' && targetKg >= currentKg) {
    return `To lose weight, your target has to be below your current ${currentKg} kg.`
  }
  if (goal === 'muscle' && targetKg <= currentKg) {
    return `To build muscle, your target has to be above your current ${currentKg} kg.`
  }
  return null
}

// How many weeks it takes to get from one weight to another at a given weekly change.
// Returns null when there is no change, or the change goes the wrong way.
export function weeksToTarget(currentKg: number, targetKg: number, weeklyChange: number): number | null {
  const toGo = targetKg - currentKg
  if (toGo === 0) return 0
  // Both must point the same way: losing towards a lower target, or gaining towards a higher one.
  if (weeklyChange === 0 || Math.sign(toGo) !== Math.sign(weeklyChange)) return null
  return toGo / weeklyChange
}

// The date on which the target should be reached, or null when it can't be estimated.
export function estimateDate(currentKg: number, targetKg: number, weeklyChange: number, from: Date): Date | null {
  const weeks = weeksToTarget(currentKg, targetKg, weeklyChange)
  if (weeks === null) return null
  const date = new Date(from)
  date.setDate(date.getDate() + Math.ceil(weeks * 7))
  return date
}

// The estimated date for a whole profile, from the current weight in it.
export function goalDate(profile: Profile, from: Date): Date | null {
  if (profile.targetWeightKg === undefined) return null
  return estimateDate(profile.weightKg, profile.targetWeightKg, suggestTargets(profile).weeklyChange, from)
}

// A friendly remark when the target is more than a year away, otherwise null.
export function longRoadNote(weeks: number | null): string | null {
  if (weeks === null || weeks <= 52) return null
  const months = Math.round(weeks / 4.345)
  return `That is about ${months} months away at this pace. A long road, but a fine goal: you can change it any time.`
}

// BMI = weight / height². Below 18.5 counts as underweight.
export function isUnderweight(weightKg: number, heightCm: number): boolean {
  return weightKg / (heightCm / 100) ** 2 < 18.5
}

// True for a profile that should have a target weight and pace but doesn't yet
// (made before the app asked for them).
export function needsGoalDetails(profile: Profile): boolean {
  const hasPace = profile.goal === 'lose' || profile.goal === 'muscle'
  return hasPace && (profile.targetWeightKg === undefined || profile.pace === undefined)
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

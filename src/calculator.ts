// Calorie and macro suggestions from a profile. Pure maths, no browser code,
// so it is unit-tested in calculator.test.ts.
import { fixed, num, t } from './i18n'
import type { Activity, Goal, Macros, Profile } from './types'

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

// The paces you can choose for each goal, in kg per week.
// (Recomposition means losing fat slowly while building muscle, so its pace is also a deficit.)
type GoalWithPace = 'lose' | 'muscle' | 'recomp'

// "labelKey" is the key of the name in the translation files.
export const PACE_OPTIONS: Record<GoalWithPace, { value: number; labelKey: string; recommended?: boolean }[]> = {
  lose: [
    { value: 0.25, labelKey: 'pace.relaxed' },
    { value: 0.5, labelKey: 'pace.steady', recommended: true },
    { value: 0.75, labelKey: 'pace.fast' },
    { value: 1, labelKey: 'pace.veryFast' },
  ],
  muscle: [
    { value: 0.25, labelKey: 'pace.lean', recommended: true },
    { value: 0.5, labelKey: 'pace.faster' },
  ],
  recomp: [
    { value: 0.25, labelKey: 'pace.gentle' },
    { value: 0.5, labelKey: 'pace.steady', recommended: true },
    { value: 0.75, labelKey: 'pace.fast' },
  ],
}

export function hasPace(goal: Goal): goal is GoalWithPace {
  return goal !== 'maintain'
}

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
// "Stay healthy" has no pace and gives 0.
export function paceFor(goal: Goal, chosen?: number): number {
  if (!hasPace(goal)) return 0
  const options = PACE_OPTIONS[goal]
  return options.find((o) => o.value === chosen)?.value ?? options.find((o) => o.recommended)!.value
}

export interface Suggestion {
  bmr: number
  maintenance: number
  targets: Macros // calories and macros; the fibre target is not part of the calculation
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
  let goalText = t('calc.maintainText')
  let note: string | undefined

  if (profile.goal === 'lose') {
    kcal = maintain - perDay
    goalText = t('calc.loseText', { pace: num(pace, 2), kcal: num(perDay) })
  } else if (profile.goal === 'muscle') {
    kcal = maintain + perDay
    goalText = t('calc.muscleText', { pace: num(pace, 2), kcal: num(perDay) })
  } else if (profile.goal === 'recomp') {
    kcal = maintain - perDay
    goalText = t('calc.recompText', { pace: num(pace, 2), kcal: num(perDay) })
  }

  if (profile.age < 18 && kcal < maintain) {
    // Still growing: no calorie deficit without a doctor.
    kcal = maintain
    note = t('calc.under18')
  } else if (kcal < rest) {
    // Safety floor: never eat less than the body uses at rest.
    kcal = rest
    const slower = fixed(((maintain - rest) * 7) / KCAL_PER_KG, 2)
    note = t('calc.floor', { pace: num(pace, 2), bmr: num(rest), slower })
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
    explanation: t('calc.explanation', {
      bmr: num(rest),
      factor: num(ACTIVITY_FACTORS[profile.activity], 3),
      maintenance: num(maintain),
      goal: goalText,
      perKg: num(perKg, 1),
      fat: FAT_SHARE[profile.goal] * 100,
    }),
  }
}

// ---------- Comparing the paces ----------

export interface PaceChoice {
  value: number // kg per week
  label: string
  recommended: boolean
  kcal: number // the daily calories this pace gives
  date: Date | null // when the target would be reached, if there is a target
  available: boolean
  reason?: string // why it is not available
}

// Every pace for the profile's goal, with its daily calories and estimated date, so they can be
// compared. A pace that would mean eating less than the BMR is marked as not available.
export function paceChoices(profile: Profile, from: Date): PaceChoice[] {
  if (!hasPace(profile.goal)) return []
  const rest = bmr(profile)
  const maintain = maintenance(profile)
  const isDeficit = profile.goal !== 'muscle'

  return PACE_OPTIONS[profile.goal].map((option) => {
    const suggestion = suggestTargets({ ...profile, pace: option.value })
    let reason: string | undefined
    if (isDeficit && profile.age < 18) {
      reason = t('calc.notUnder18')
    } else if (isDeficit && maintain - dailyKcalForPace(option.value) < rest) {
      reason = t('calc.notAvailable', { bmr: num(rest) })
    }
    return {
      value: option.value,
      label: t(option.labelKey),
      recommended: option.recommended === true,
      kcal: suggestion.targets.kcal,
      date:
        profile.targetWeightKg === undefined
          ? null
          : estimateDate(profile.weightKg, profile.targetWeightKg, suggestion.weeklyChange, from),
      available: reason === undefined,
      reason,
    }
  })
}

// The pace to select: the chosen one if it is available, otherwise the recommended one,
// otherwise the fastest one that is. Returns undefined when no pace is available at all.
export function bestPace(choices: PaceChoice[], chosen?: number): number | undefined {
  const available = choices.filter((c) => c.available)
  return (
    available.find((c) => c.value === chosen)?.value ??
    available.find((c) => c.recommended)?.value ??
    available[available.length - 1]?.value
  )
}

// Recomposition suits small changes on the scale. For a big drop, losing weight fits better.
export function recompTip(currentKg: number, targetKg: number | undefined): string | null {
  if (targetKg === undefined || currentKg - targetKg <= 5) return null
  return t('calc.recompTip')
}

// ---------- Target weight ----------

// Checks a target weight against the goal. Returns a message when it can't be used, or null when it is fine.
export function targetWeightProblem(goal: Goal, currentKg: number, targetKg: number): string | null {
  if (targetKg < 30 || targetKg > 300) return t('calc.targetRange')
  if (goal === 'lose' && targetKg >= currentKg) {
    return t('calc.targetLower', { kg: num(currentKg, 1) })
  }
  if (goal === 'muscle' && targetKg <= currentKg) {
    return t('calc.targetHigher', { kg: num(currentKg, 1) })
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
  return t('calc.longRoad', { months })
}

// BMI = weight / height². Below 18.5 counts as underweight.
export function isUnderweight(weightKg: number, heightCm: number): boolean {
  return weightKg / (heightCm / 100) ** 2 < 18.5
}

// True for a profile whose goal details are not complete yet: no pace was ever chosen
// (or it is not one of the options any more), or the target weight is missing.
export function needsGoalDetails(profile: Profile): boolean {
  if (!hasPace(profile.goal)) return false
  const paceChosen = PACE_OPTIONS[profile.goal].some((option) => option.value === profile.pace)
  // For recomposition the target weight is optional.
  const targetMissing = profile.goal !== 'recomp' && profile.targetWeightKg === undefined
  return !paceChosen || targetMissing
}

// ---------- The choices, with their text in the current language ----------

const GOALS: Goal[] = ['lose', 'muscle', 'recomp', 'maintain']
const ACTIVITIES: Activity[] = ['sedentary', 'light', 'moderate', 'very', 'extreme']

export function goalOptions(): { value: Goal; label: string; description: string }[] {
  return GOALS.map((goal) => ({ value: goal, label: t(`goal.${goal}`), description: t(`goal.${goal}.desc`) }))
}

export function activityOptions(): { value: Activity; label: string; description: string }[] {
  return ACTIVITIES.map((a) => ({ value: a, label: t(`activity.${a}`), description: t(`activity.${a}.desc`) }))
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ACTIVITY_OPTIONS,
  bestPace,
  DISCLAIMER,
  GOAL_OPTIONS,
  goalDate,
  hasPace,
  isUnderweight,
  longRoadNote,
  paceChoices,
  paceFor,
  recompTip,
  suggestTargets,
  targetWeightProblem,
  weeksToTarget,
} from '../calculator'
import { hasSavedTargets, saveProfile, saveTargets, saveWeight, skipOnboarding } from '../db'
import type { Activity, Goal, Macros, Profile, Sex } from '../types'
import { formatDate, parseNumber, todayKey } from '../utils'
import Button from './Button'
import Choices from './Choices'
import PacePicker from './PacePicker'

interface Props {
  profile: Profile | null // the saved answers, when editing from Settings
  firstRun: boolean // true the very first time the app opens
  onDone: () => void
}

type Step = 'goal' | 'weight' | 'target' | 'sex' | 'age' | 'height' | 'activity' | 'pace' | 'summary'

// The questions, in order. Every goal except "stay healthy" also asks for a target weight
// and a pace. The pace comes last, because comparing the options needs all the other answers.
function stepsFor(goal: Goal | undefined): Step[] {
  const withGoal = goal !== undefined && hasPace(goal)
  return [
    'goal',
    'weight',
    ...(withGoal ? (['target'] as const) : []),
    'sex',
    'age',
    'height',
    'activity',
    ...(withGoal ? (['pace'] as const) : []),
    'summary',
  ]
}

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]

// The simple number questions: what to ask and which answers make sense.
const NUMBER_STEPS = {
  weight: { title: 'What do you weigh now?', unit: 'kg', min: 30, max: 300, decimal: true },
  age: { title: 'How old are you?', unit: 'years', min: 13, max: 100, decimal: false },
  height: { title: 'How tall are you?', unit: 'cm', min: 100, max: 250, decimal: false },
}

// A short flow with one question per screen, ending in suggested targets.
export default function Onboarding({ profile, firstRun, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<Goal | undefined>(profile?.goal)
  const [sex, setSex] = useState<Sex | undefined>(profile?.sex)
  const [activity, setActivity] = useState<Activity | undefined>(profile?.activity)
  const [chosenPace, setChosenPace] = useState<number | undefined>(profile?.pace)
  // The number answers are kept as text while typing.
  const [numbers, setNumbers] = useState({
    weight: profile ? String(profile.weightKg) : '',
    target: profile?.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '',
    age: profile ? String(profile.age) : '',
    height: profile ? String(profile.heightCm) : '',
  })
  // The four calculated targets on the summary screen (editable).
  const [targetTexts, setTargetTexts] = useState<Record<keyof Macros, string> | null>(null)
  // Are there targets saved already? Then we also offer to keep them.
  const hasTargets = useLiveQuery(hasSavedTargets) ?? false

  const steps = stepsFor(goal)
  const name = steps[step]

  // A number answer, or null while it is empty or out of range.
  function numberAnswer(key: keyof typeof NUMBER_STEPS): number | null {
    const value = parseNumber(numbers[key])
    const { min, max } = NUMBER_STEPS[key]
    return value !== null && value >= min && value <= max ? value : null
  }
  const weight = numberAnswer('weight')
  const age = numberAnswer('age')
  const height = numberAnswer('height')

  // ----- Target weight -----
  const asksTarget = steps.includes('target')
  const target = asksTarget ? parseNumber(numbers.target) : null
  const targetProblem = goal && weight !== null && target !== null ? targetWeightProblem(goal, weight, target) : null
  // For recomposition the target may be left empty.
  const targetOk = goal === 'recomp' && numbers.target.trim() === '' ? true : target !== null && targetProblem === null
  // How long the target takes at the recommended pace, to remark on it when it is far away.
  const weeksAway =
    goal && weight !== null && target !== null && targetProblem === null
      ? weeksToTarget(weight, target, goal === 'muscle' ? paceFor(goal) : -paceFor(goal))
      : null

  // ----- Everything except the pace -----
  const draft: Profile | null =
    goal && sex && activity && age !== null && height !== null && weight !== null && (!asksTarget || targetOk)
      ? { goal, sex, activity, age, heightCm: height, weightKg: weight, targetWeightKg: target ?? undefined }
      : null

  // ----- Pace: compare the options for this person -----
  const choices = draft ? paceChoices(draft, new Date()) : []
  const pace = bestPace(choices, chosenPace)

  // The complete answers. When no pace is available, the recommended one is stored
  // and the calculator limits the calories (and says so on the summary).
  const answers: Profile | null = draft && goal ? { ...draft, pace: hasPace(goal) ? (pace ?? paceFor(goal)) : undefined } : null
  const suggestion = answers ? suggestTargets(answers) : null
  const reachDate = answers ? goalDate(answers, new Date()) : null

  const canContinue = {
    goal: goal !== undefined,
    weight: weight !== null,
    target: targetOk,
    sex: sex !== undefined,
    age: age !== null,
    height: height !== null,
    activity: activity !== undefined,
    pace: true, // the best available pace is selected until another is chosen
    summary: true,
  }[name]

  function next() {
    // Arriving at the summary: fill the editable fields with the suggestion.
    if (steps[step + 1] === 'summary' && suggestion) {
      const t = suggestion.targets
      setTargetTexts({ kcal: String(t.kcal), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) })
    }
    setStep(step + 1)
  }

  async function skip() {
    if (firstRun) await skipOnboarding()
    onDone()
  }

  // The targets as typed on the summary screen, or null if a field is not a number.
  function typedTargets(): Macros | null {
    if (!targetTexts) return null
    const kcal = parseNumber(targetTexts.kcal)
    const protein = parseNumber(targetTexts.protein)
    const carbs = parseNumber(targetTexts.carbs)
    const fat = parseNumber(targetTexts.fat)
    return kcal !== null && protein !== null && carbs !== null && fat !== null ? { kcal, protein, carbs, fat } : null
  }

  async function finish(newTargets: Macros | null) {
    if (!answers) return
    // A new weight also goes into the weight log, so the two never disagree.
    if (answers.weightKg !== profile?.weightKg) await saveWeight(todayKey(), answers.weightKg)
    if (newTargets) await saveTargets(newTargets)
    // A new goal or target starts a new journey: progress is measured from today's weight.
    const sameJourney = profile?.goal === answers.goal && profile.targetWeightKg === answers.targetWeightKg
    await saveProfile({
      ...answers,
      startWeightKg: sameJourney ? (profile.startWeightKg ?? answers.weightKg) : answers.weightKg,
      startDate: sameJourney ? (profile.startDate ?? todayKey()) : todayKey(),
    })
    onDone()
  }

  return (
    <div className="onboarding">
      <div className="onboarding-top">
        {step > 0 ? (
          <Button variant="glass" layout="round" icon="back" onClick={() => setStep(step - 1)} aria-label="Back" />
        ) : (
          <span style={{ width: 44 }} />
        )}
        <div className="steps" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
          {steps.map((s, i) => (
            <i key={s} className={i <= step ? 'done' : ''} />
          ))}
        </div>
        <Button variant="glass" size="small" onClick={skip}>
          {firstRun ? 'Skip' : 'Cancel'}
        </Button>
      </div>

      {/* key = replay the slide-in animation for every step */}
      <div className="onboarding-step" key={name}>
        {name === 'goal' && (
          <>
            <h1 className="page-title">What is your goal?</h1>
            <p className="muted">This sets how many calories and how much protein to aim for.</p>
            <Choices options={GOAL_OPTIONS} value={goal} onChange={setGoal} />
          </>
        )}

        {(name === 'weight' || name === 'age' || name === 'height') && (
          <>
            <h1 className="page-title">{NUMBER_STEPS[name].title}</h1>
            <label className="big-input glass">
              <input
                inputMode={NUMBER_STEPS[name].decimal ? 'decimal' : 'numeric'}
                autoFocus
                value={numbers[name]}
                onChange={(e) => setNumbers({ ...numbers, [name]: e.target.value })}
                aria-label={NUMBER_STEPS[name].title}
              />
              <span>{NUMBER_STEPS[name].unit}</span>
            </label>
            {numbers[name] !== '' && !canContinue && (
              <p className="muted">
                Enter a number between {NUMBER_STEPS[name].min} and {NUMBER_STEPS[name].max}.
              </p>
            )}
          </>
        )}

        {name === 'target' && weight !== null && (
          <>
            <h1 className="page-title">What weight are you aiming for?</h1>
            <p className="muted">
              {goal === 'recomp'
                ? `You weigh ${weight} kg now. A target is optional here: leave it empty if the scale is not your goal.`
                : `You weigh ${weight} kg now.`}
            </p>
            <label className="big-input glass">
              <input
                inputMode="decimal"
                autoFocus
                value={numbers.target}
                onChange={(e) => setNumbers({ ...numbers, target: e.target.value })}
                aria-label="Target weight in kg"
              />
              <span>kg</span>
            </label>
            {targetProblem && <p className="note">{targetProblem}</p>}
            {goal === 'recomp' && recompTip(weight, target ?? undefined) && (
              <p className="note">{recompTip(weight, target ?? undefined)}</p>
            )}
            {longRoadNote(weeksAway) && <p className="note">{longRoadNote(weeksAway)}</p>}
          </>
        )}

        {name === 'sex' && (
          <>
            <h1 className="page-title">What is your sex?</h1>
            <p className="muted">The formula for calories uses a different number for men and women.</p>
            <Choices options={SEX_OPTIONS} value={sex} onChange={setSex} />
          </>
        )}

        {name === 'activity' && (
          <>
            <h1 className="page-title">How active are you?</h1>
            <p className="muted">Think of a normal week, including work or study.</p>
            <Choices options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
          </>
        )}

        {name === 'pace' && draft && (
          <>
            <h1 className="page-title">How fast?</h1>
            <p className="muted">
              {goal === 'muscle'
                ? 'A slower pace adds less fat along with the muscle.'
                : 'A faster pace means eating less each day. Slower is easier to keep up.'}
            </p>
            <PacePicker choices={choices} value={pace} onChange={setChosenPace} targetKg={draft.targetWeightKg} />
            {pace === undefined && (
              <p className="note">
                None of these fit you right now, so your calories will stay at the lowest safe level instead.
              </p>
            )}
          </>
        )}

        {name === 'summary' && answers && suggestion && targetTexts && (
          <>
            <h1 className="page-title">Your daily targets</h1>
            <section className="card glass">
              <div className="field-grid">
                {(
                  [
                    ['kcal', 'Calories (kcal)'],
                    ['protein', 'Protein (g)'],
                    ['carbs', 'Carbs (g)'],
                    ['fat', 'Fat (g)'],
                  ] as const
                ).map(([key, label]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      className="input number"
                      inputMode="decimal"
                      value={targetTexts[key]}
                      onChange={(e) => setTargetTexts({ ...targetTexts, [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <p className="muted">Tap a number to change it.</p>

              {reachDate && (
                <p className="estimate">
                  Estimated to reach {answers.targetWeightKg} kg around {formatDate(reachDate)}
                </p>
              )}
              {suggestion.note && <p className="note">{suggestion.note}</p>}
              {answers.targetWeightKg !== undefined &&
                answers.targetWeightKg < answers.weightKg &&
                isUnderweight(answers.targetWeightKg, answers.heightCm) && (
                  <p className="note">
                    A target of {answers.targetWeightKg} kg is below the healthy range for your height. Consider a
                    higher target, and talk to a doctor first.
                  </p>
                )}

              <p className="note">{suggestion.explanation}</p>
              <p className="muted">{DISCLAIMER}</p>
            </section>
          </>
        )}

        <div className="onboarding-bottom">
          {name === 'summary' ? (
            <>
              <Button variant="primary" block disabled={!typedTargets()} onClick={() => finish(typedTargets())}>
                Save as my targets
              </Button>
              {hasTargets && (
                <Button variant="glass" block onClick={() => finish(null)}>
                  Keep my current targets
                </Button>
              )}
            </>
          ) : (
            <Button variant="primary" block disabled={!canContinue} onClick={next}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

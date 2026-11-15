import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ACTIVITY_OPTIONS, DISCLAIMER, GOAL_OPTIONS, suggestTargets } from '../calculator'
import { db, saveProfile, saveTargets, saveWeight, skipOnboarding } from '../db'
import type { Activity, Goal, Profile, Sex, Targets } from '../types'
import { parseNumber, todayKey } from '../utils'
import Button from './Button'
import Icon from './Icon'

interface Props {
  profile: Profile | null // the saved answers, when editing from Settings
  firstRun: boolean // true the very first time the app opens
  onDone: () => void
}

const STEPS = ['goal', 'sex', 'age', 'height', 'weight', 'activity', 'summary'] as const

const SEX_OPTIONS: { value: Sex; label: string; description: string }[] = [
  { value: 'female', label: 'Female', description: '' },
  { value: 'male', label: 'Male', description: '' },
]

// The three number questions: what to ask and which answers make sense.
const NUMBER_STEPS = {
  age: { title: 'How old are you?', unit: 'years', min: 13, max: 100, decimal: false },
  height: { title: 'How tall are you?', unit: 'cm', min: 100, max: 250, decimal: false },
  weight: { title: 'What do you weigh?', unit: 'kg', min: 30, max: 300, decimal: true },
}

// A short flow with one question per screen, ending in suggested targets.
export default function Onboarding({ profile, firstRun, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<Goal | undefined>(profile?.goal)
  const [sex, setSex] = useState<Sex | undefined>(profile?.sex)
  const [activity, setActivity] = useState<Activity | undefined>(profile?.activity)
  // The number answers are kept as text while typing.
  const [numbers, setNumbers] = useState({
    age: profile ? String(profile.age) : '',
    height: profile ? String(profile.heightCm) : '',
    weight: profile ? String(profile.weightKg) : '',
  })
  // The four target fields on the summary screen (editable).
  const [targetTexts, setTargetTexts] = useState<Record<keyof Targets, string> | null>(null)
  // Are there targets saved already? Then we also offer to keep them.
  const hasTargets = useLiveQuery(() => db.settings.get('targets').then((row) => row !== undefined)) ?? false

  const name = STEPS[step]

  // A number answer, or null while it is empty or out of range.
  function numberAnswer(key: keyof typeof NUMBER_STEPS): number | null {
    const value = parseNumber(numbers[key])
    const { min, max } = NUMBER_STEPS[key]
    return value !== null && value >= min && value <= max ? value : null
  }
  const age = numberAnswer('age')
  const height = numberAnswer('height')
  const weight = numberAnswer('weight')

  // Complete once every question has a valid answer.
  const answers: Profile | null =
    goal && sex && activity && age !== null && height !== null && weight !== null
      ? { goal, sex, activity, age, heightCm: height, weightKg: weight }
      : null
  const suggestion = answers ? suggestTargets(answers) : null

  const canContinue = {
    goal: goal !== undefined,
    sex: sex !== undefined,
    age: age !== null,
    height: height !== null,
    weight: weight !== null,
    activity: activity !== undefined,
    summary: true,
  }[name]

  function next() {
    // Arriving at the summary: fill the editable fields with the suggestion.
    if (STEPS[step + 1] === 'summary' && suggestion) {
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
  function typedTargets(): Targets | null {
    if (!targetTexts) return null
    const kcal = parseNumber(targetTexts.kcal)
    const protein = parseNumber(targetTexts.protein)
    const carbs = parseNumber(targetTexts.carbs)
    const fat = parseNumber(targetTexts.fat)
    return kcal !== null && protein !== null && carbs !== null && fat !== null ? { kcal, protein, carbs, fat } : null
  }

  async function finish(newTargets: Targets | null) {
    if (!answers) return
    // A new weight also goes into the weight log, so the two never disagree.
    if (answers.weightKg !== profile?.weightKg) await saveWeight(todayKey(), answers.weightKg)
    if (newTargets) await saveTargets(newTargets)
    await saveProfile(answers)
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
        <div className="steps" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          {STEPS.map((s, i) => (
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

        {name === 'sex' && (
          <>
            <h1 className="page-title">What is your sex?</h1>
            <p className="muted">The formula for calories uses a different number for men and women.</p>
            <Choices options={SEX_OPTIONS} value={sex} onChange={setSex} />
          </>
        )}

        {(name === 'age' || name === 'height' || name === 'weight') && (
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

        {name === 'activity' && (
          <>
            <h1 className="page-title">How active are you?</h1>
            <p className="muted">Think of a normal week, including work or study.</p>
            <Choices options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
          </>
        )}

        {name === 'summary' && suggestion && targetTexts && (
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

interface ChoicesProps<T extends string> {
  options: { value: T; label: string; description: string }[]
  value: T | undefined
  onChange: (value: T) => void
}

// A list of glass rows; the selected one gets an accent outline and a check mark.
function Choices<T extends string>({ options, value, onChange }: ChoicesProps<T>) {
  return (
    <div>
      {options.map((option) => (
        <button
          key={option.value}
          className={option.value === value ? 'row glass selected' : 'row glass'}
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
        >
          <div className="row-main">
            <div className="row-title">{option.label}</div>
            {option.description && <div className="muted">{option.description}</div>}
          </div>
          <span className="row-check">
            <Icon name="check" size={16} />
          </span>
        </button>
      ))}
    </div>
  )
}

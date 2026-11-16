import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  activityOptions,
  bestPace,
  goalOptions,
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
import { inputNumber, t } from '../i18n'
import { fmt, formatDate, parseNumber, todayKey } from '../utils'
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

const sexOptions = (): { value: Sex; label: string }[] => [
  { value: 'female', label: t('sex.female') },
  { value: 'male', label: t('sex.male') },
]

// The simple number questions: what to ask and which answers make sense.
const NUMBER_STEPS = {
  weight: { titleKey: 'onb.weightTitle', unit: 'kg', min: 30, max: 300, decimal: true },
  age: { titleKey: 'onb.ageTitle', unit: '', min: 13, max: 100, decimal: false },
  height: { titleKey: 'onb.heightTitle', unit: 'cm', min: 100, max: 250, decimal: false },
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
    weight: profile ? inputNumber(profile.weightKg) : '',
    target: profile?.targetWeightKg !== undefined ? inputNumber(profile.targetWeightKg) : '',
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
          <Button variant="soft" layout="round" icon="back" onClick={() => setStep(step - 1)} aria-label={t('common.back')} />
        ) : (
          <span style={{ width: 44 }} />
        )}
        <div className="steps" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
          {steps.map((s, i) => (
            <i key={s} className={i <= step ? 'done' : ''} />
          ))}
        </div>
        <Button variant="soft" size="small" onClick={skip}>
          {firstRun ? t('common.skip') : t('common.cancel')}
        </Button>
      </div>

      {/* key = replay the slide-in animation for every step */}
      <div className="onboarding-step" key={name}>
        {name === 'goal' && (
          <>
            <h1 className="page-title">{t('onb.goalTitle')}</h1>
            <p className="muted">{t('onb.goalText')}</p>
            <Choices options={goalOptions()} value={goal} onChange={setGoal} />
          </>
        )}

        {(name === 'weight' || name === 'age' || name === 'height') && (
          <>
            <h1 className="page-title">{t(NUMBER_STEPS[name].titleKey)}</h1>
            <label className="big-input surface">
              <input
                inputMode={NUMBER_STEPS[name].decimal ? 'decimal' : 'numeric'}
                autoFocus
                value={numbers[name]}
                onChange={(e) => setNumbers({ ...numbers, [name]: e.target.value })}
                aria-label={t(NUMBER_STEPS[name].titleKey)}
              />
              <span>{NUMBER_STEPS[name].unit || t('unit.years')}</span>
            </label>
            {numbers[name] !== '' && !canContinue && (
              <p className="muted">
                {t('onb.range', { min: NUMBER_STEPS[name].min, max: NUMBER_STEPS[name].max })}
              </p>
            )}
          </>
        )}

        {name === 'target' && weight !== null && (
          <>
            <h1 className="page-title">{t('onb.targetTitle')}</h1>
            <p className="muted">
              {t(goal === 'recomp' ? 'onb.targetOptional' : 'onb.youWeigh', { kg: fmt(weight) })}
            </p>
            <label className="big-input surface">
              <input
                inputMode="decimal"
                autoFocus
                value={numbers.target}
                onChange={(e) => setNumbers({ ...numbers, target: e.target.value })}
                aria-label={t('onb.targetAria')}
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
            <h1 className="page-title">{t('onb.sexTitle')}</h1>
            <p className="muted">{t('onb.sexText')}</p>
            <Choices options={sexOptions()} value={sex} onChange={setSex} />
          </>
        )}

        {name === 'activity' && (
          <>
            <h1 className="page-title">{t('onb.activityTitle')}</h1>
            <p className="muted">{t('onb.activityText')}</p>
            <Choices options={activityOptions()} value={activity} onChange={setActivity} />
          </>
        )}

        {name === 'pace' && draft && (
          <>
            <h1 className="page-title">{t('onb.paceTitle')}</h1>
            <p className="muted">
              {goal === 'muscle' ? t('onb.paceMuscle') : t('onb.paceDeficit')}
            </p>
            <PacePicker choices={choices} value={pace} onChange={setChosenPace} targetKg={draft.targetWeightKg} />
            {pace === undefined && (
              <p className="note">
                {t('onb.paceNone')}
              </p>
            )}
          </>
        )}

        {name === 'summary' && answers && suggestion && targetTexts && (
          <>
            <h1 className="page-title">{t('onb.summaryTitle')}</h1>
            <section className="card surface">
              <div className="field-grid">
                {(
                  [
                    ['kcal', 'field.kcal'],
                    ['protein', 'field.protein'],
                    ['carbs', 'field.carbs'],
                    ['fat', 'field.fat'],
                  ] as const
                ).map(([key, labelKey]) => (
                  <label className="field" key={key}>
                    <span>{t(labelKey)}</span>
                    <input
                      className="input number"
                      inputMode="decimal"
                      value={targetTexts[key]}
                      onChange={(e) => setTargetTexts({ ...targetTexts, [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <p className="muted">{t('onb.tapNumber')}</p>

              {reachDate && (
                <p className="estimate">
                  {t('onb.estimate', { target: fmt(answers.targetWeightKg ?? 0), date: formatDate(reachDate) })}
                </p>
              )}
              {suggestion.note && <p className="note">{suggestion.note}</p>}
              {answers.targetWeightKg !== undefined &&
                answers.targetWeightKg < answers.weightKg &&
                isUnderweight(answers.targetWeightKg, answers.heightCm) && (
                  <p className="note">
                    {t('onb.underweight', { target: fmt(answers.targetWeightKg) })}
                  </p>
                )}

              <p className="note">{suggestion.explanation}</p>
              <p className="muted">{t('disclaimer')}</p>
            </section>
          </>
        )}

        <div className="onboarding-bottom">
          {name === 'summary' ? (
            <>
              <Button variant="primary" block disabled={!typedTargets()} onClick={() => finish(typedTargets())}>
                {t('onb.saveTargets')}
              </Button>
              {hasTargets && (
                <Button variant="soft" block onClick={() => finish(null)}>
                  {t('onb.keepTargets')}
                </Button>
              )}
            </>
          ) : (
            <Button variant="primary" block disabled={!canContinue} onClick={next}>
              {t('common.continue')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

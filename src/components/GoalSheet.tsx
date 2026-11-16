import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { goalDate, longRoadNote, paceFor, suggestTargets, targetWeightProblem, weeksToTarget } from '../calculator'
import { getTargets, saveProfile, saveTargets } from '../db'
import type { Profile } from '../types'
import { formatDate, parseNumber, todayKey } from '../utils'
import Button from './Button'
import PacePicker from './PacePicker'
import Sheet from './Sheet'

interface Props {
  profile: Profile
  // true = the app opened this by itself, to ask for details that are still missing
  asking?: boolean
  onClose: () => void
}

// A short sheet for just the target weight and the pace, without redoing the whole onboarding.
export default function GoalSheet({ profile, asking = false, onClose }: Props) {
  const { goal } = profile
  const [targetText, setTargetText] = useState(profile.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '')
  const [chosenPace, setChosenPace] = useState(profile.pace)
  const currentTargets = useLiveQuery(getTargets)

  const target = parseNumber(targetText)
  const problem = target !== null ? targetWeightProblem(goal, profile.weightKg, target) : null
  // Recomposition may have no target; the other goals need a valid one.
  const targetOk = goal === 'recomp' && targetText.trim() === '' ? true : target !== null && problem === null
  const pace = paceFor(goal, chosenPace)

  // The profile as it will be saved.
  const sameJourney = profile.targetWeightKg === (target ?? undefined)
  const updated: Profile = {
    ...profile,
    targetWeightKg: target ?? undefined,
    pace: pace > 0 ? pace : undefined,
    // A new target starts a new journey: progress is measured from today's weight.
    startWeightKg: sameJourney ? (profile.startWeightKg ?? profile.weightKg) : profile.weightKg,
    startDate: sameJourney ? (profile.startDate ?? todayKey()) : todayKey(),
  }
  const suggestion = suggestTargets(updated)
  const reachDate = targetOk ? goalDate(updated, new Date()) : null
  const weeksAway = targetOk && target !== null ? weeksToTarget(profile.weightKg, target, suggestion.weeklyChange) : null

  async function save(useNewTargets: boolean) {
    if (!targetOk) return
    if (useNewTargets) await saveTargets(suggestion.targets)
    await saveProfile(updated)
    onClose()
  }

  return (
    <Sheet title="Your target weight" onClose={onClose}>
      <div className="stack">
        <p className="muted">
          {asking && 'One thing was missing from your profile. '}
          You weigh {profile.weightKg} kg now.
          {goal === 'recomp' && ' A target is optional for body recomposition.'}
        </p>

        <label className="field">
          <span>Target weight (kg)</span>
          <input
            className="input number"
            inputMode="decimal"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            placeholder="kg"
          />
        </label>
        {problem && <p className="note">{problem}</p>}

        {(goal === 'lose' || goal === 'muscle') && targetOk && target !== null && (
          <div>
            <div className="label">Pace</div>
            <PacePicker
              goal={goal}
              value={pace}
              onChange={setChosenPace}
              currentKg={profile.weightKg}
              targetKg={target}
              // The whole profile is known here, so the dates can take the safety floor into account.
              weeklyChangeFor={(option) => suggestTargets({ ...updated, pace: option }).weeklyChange}
            />
          </div>
        )}

        {targetOk && (
          <>
            <p className="estimate">
              {suggestion.targets.kcal} kcal per day
              {currentTargets && currentTargets.kcal !== suggestion.targets.kcal && ` (now ${Math.round(currentTargets.kcal)})`}
              {reachDate && ` · ${target} kg around ${formatDate(reachDate)}`}
            </p>
            {suggestion.note && <p className="note">{suggestion.note}</p>}
            {longRoadNote(weeksAway) && <p className="note">{longRoadNote(weeksAway)}</p>}
          </>
        )}
      </div>

      <div className="sheet-actions">
        <Button variant="primary" block disabled={!targetOk} onClick={() => save(true)}>
          Save and use these targets
        </Button>
        <Button block disabled={!targetOk} onClick={() => save(false)}>
          Save, keep my current targets
        </Button>
        {asking && (
          <Button variant="danger" block onClick={onClose}>
            Not now
          </Button>
        )}
      </div>
    </Sheet>
  )
}

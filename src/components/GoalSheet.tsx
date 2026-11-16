import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  bestPace,
  goalDate,
  longRoadNote,
  paceChoices,
  paceFor,
  recompTip,
  suggestTargets,
  targetWeightProblem,
  weeksToTarget,
} from '../calculator'
import { getTargets, saveProfile, saveTargets } from '../db'
import type { Profile } from '../types'
import { fmt, formatDate, parseNumber, todayKey } from '../utils'
import Button from './Button'
import PacePicker from './PacePicker'
import Sheet from './Sheet'
import { t, num } from '../i18n'

interface Props {
  profile: Profile
  // true = the app opened this by itself, to ask for details that are still missing
  asking?: boolean
  onClose: () => void
}

// Target weight and pace on one sheet, without redoing the whole onboarding.
// Saving updates the daily targets and the estimated date straight away.
export default function GoalSheet({ profile, asking = false, onClose }: Props) {
  const { goal } = profile
  const [targetText, setTargetText] = useState(profile.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '')
  const [chosenPace, setChosenPace] = useState(profile.pace)
  const currentTargets = useLiveQuery(getTargets)

  const target = parseNumber(targetText)
  const problem = target !== null ? targetWeightProblem(goal, profile.weightKg, target) : null
  // Recomposition may have no target; the other goals need a valid one.
  const targetOk = goal === 'recomp' && targetText.trim() === '' ? true : target !== null && problem === null

  // Compare the paces for this person and target.
  const draft: Profile = { ...profile, targetWeightKg: target ?? undefined }
  const choices = paceChoices(draft, new Date())
  const pace = bestPace(choices, chosenPace)

  // The profile as it will be saved.
  const sameJourney = profile.targetWeightKg === draft.targetWeightKg
  const updated: Profile = {
    ...draft,
    pace: pace ?? paceFor(goal),
    // A new target starts a new journey: progress is measured from today's weight.
    startWeightKg: sameJourney ? (profile.startWeightKg ?? profile.weightKg) : profile.weightKg,
    startDate: sameJourney ? (profile.startDate ?? todayKey()) : todayKey(),
  }
  const suggestion = suggestTargets(updated)
  const reachDate = targetOk ? goalDate(updated, new Date()) : null
  const weeksAway = targetOk && target !== null ? weeksToTarget(profile.weightKg, target, suggestion.weeklyChange) : null

  async function save() {
    if (!targetOk) return
    await saveTargets(suggestion.targets)
    await saveProfile(updated)
    onClose()
  }

  return (
    <Sheet title={t('goal.sheetTitle')} onClose={onClose}>
      <div className="stack">
        <p className="muted">
          {asking && t('goal.missing')}
          {t('onb.youWeigh', { kg: fmt(profile.weightKg) })}
          {goal === 'recomp' && t('goal.recompOptional')}
        </p>

        <label className="field">
          <span>{t('goal.targetLabel')}</span>
          <input
            className="input number"
            inputMode="decimal"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            placeholder="kg"
          />
        </label>
        {problem && <p className="note">{problem}</p>}
        {goal === 'recomp' && recompTip(profile.weightKg, target ?? undefined) && (
          <p className="note">{recompTip(profile.weightKg, target ?? undefined)}</p>
        )}

        {targetOk && (
          <>
            <div>
              <div className="label">{t('profile.pace')}</div>
              <PacePicker choices={choices} value={pace} onChange={setChosenPace} targetKg={draft.targetWeightKg} />
            </div>

            <p className="estimate">
              {t('goal.dailyTarget', { kcal: num(suggestion.targets.kcal) })}
              {currentTargets && currentTargets.kcal !== suggestion.targets.kcal && t('goal.now', { kcal: num(currentTargets.kcal) })}
              {reachDate && target !== null && t('goal.around', { target: fmt(target), date: formatDate(reachDate) })}
            </p>
            {suggestion.note && <p className="note">{suggestion.note}</p>}
            {longRoadNote(weeksAway) && <p className="note">{longRoadNote(weeksAway)}</p>}
          </>
        )}
      </div>

      <div className="sheet-actions">
        <Button variant="primary" block disabled={!targetOk} onClick={save}>
          {t('goal.save')}
        </Button>
        {asking && (
          <Button block onClick={onClose}>
            {t('common.notNow')}
          </Button>
        )}
      </div>
    </Sheet>
  )
}

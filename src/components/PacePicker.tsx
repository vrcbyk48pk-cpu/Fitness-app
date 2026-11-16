import type { PaceChoice } from '../calculator'
import { formatDate } from '../utils'
import Choices from './Choices'
import { t, num } from '../i18n'

interface Props {
  choices: PaceChoice[] // from paceChoices() in calculator.ts
  value: number | undefined
  onChange: (pace: number) => void
  targetKg?: number
}

// The pace options side by side: each shows its daily calories and the estimated date.
// Options that would go below the BMR are shown greyed out, with the reason.
// Used by the onboarding, the "one thing is missing" prompt, and Settings.
export default function PacePicker({ choices, value, onChange, targetKg }: Props) {
  const options = choices.map((choice) => ({
    value: choice.value,
    label: choice.label,
    tag: choice.recommended ? t('pace.recommended') : undefined,
    description: choice.available
      ? t('pace.line', { pace: num(choice.value, 2), kcal: num(choice.kcal) })
      : t('pace.lineShort', { pace: num(choice.value, 2) }),
    detail: choice.available
      ? choice.date && targetKg !== undefined
        ? t('pace.reach', { target: num(targetKg, 1), date: formatDate(choice.date) })
        : undefined
      : choice.reason,
    disabled: !choice.available,
  }))
  return <Choices options={options} value={value} onChange={onChange} />
}

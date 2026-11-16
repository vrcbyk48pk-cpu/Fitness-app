import type { PaceChoice } from '../calculator'
import { formatDate } from '../utils'
import Choices from './Choices'

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
    tag: choice.recommended ? 'Recommended' : undefined,
    description: choice.available
      ? `${choice.value} kg per week · ${choice.kcal} kcal per day`
      : `${choice.value} kg per week`,
    detail: choice.available
      ? choice.date && targetKg !== undefined
        ? `Reach ${targetKg} kg around ${formatDate(choice.date)}`
        : undefined
      : choice.reason,
    disabled: !choice.available,
  }))
  return <Choices options={options} value={value} onChange={onChange} />
}

import { dailyKcalForPace, estimateDate, PACE_OPTIONS } from '../calculator'
import { formatDate } from '../utils'
import Choices from './Choices'

interface Props {
  goal: 'lose' | 'muscle'
  value: number
  onChange: (pace: number) => void
  currentKg: number
  targetKg: number
  // The weekly change a pace really gives, when it is known that the safety floor limits it.
  // Without it, the pace itself is used.
  weeklyChangeFor?: (pace: number) => number
}

// The pace options for a goal. Each shows its daily deficit or surplus and the estimated date.
export default function PacePicker({ goal, value, onChange, currentKg, targetKg, weeklyChangeFor }: Props) {
  const losing = goal === 'lose'
  const options = PACE_OPTIONS[goal].map((option) => {
    const weeklyChange = weeklyChangeFor ? weeklyChangeFor(option.value) : losing ? -option.value : option.value
    const date = estimateDate(currentKg, targetKg, weeklyChange, new Date())
    return {
      value: option.value,
      label: option.label,
      tag: option.recommended ? 'Recommended' : undefined,
      description: `${option.value} kg per week · about ${dailyKcalForPace(option.value)} kcal ${losing ? 'less' : 'more'} per day`,
      detail: date ? `Reach ${targetKg} kg around ${formatDate(date)}` : undefined,
    }
  })
  return <Choices options={options} value={value} onChange={onChange} />
}

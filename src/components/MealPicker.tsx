import type { Meal } from '../types'
import { mealLabel, MEALS } from '../utils'
import Segmented from './Segmented'

interface Props {
  meal: Meal
  setMeal: (meal: Meal) => void
  inset?: boolean
}

// Choose Breakfast, Lunch, Dinner or Snacks.
export default function MealPicker({ meal, setMeal, inset }: Props) {
  const options = MEALS.map((m) => ({ value: m, label: mealLabel(m) }))
  return <Segmented options={options} value={meal} onChange={setMeal} inset={inset} />
}

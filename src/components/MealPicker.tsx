import type { Meal } from '../types'
import { MEAL_LABELS, MEALS } from '../utils'
import Segmented from './Segmented'

interface Props {
  meal: Meal
  setMeal: (meal: Meal) => void
  inset?: boolean
}

const OPTIONS = MEALS.map((meal) => ({ value: meal, label: MEAL_LABELS[meal] }))

// Choose Breakfast, Lunch, Dinner or Snacks.
export default function MealPicker({ meal, setMeal, inset }: Props) {
  return <Segmented options={OPTIONS} value={meal} onChange={setMeal} inset={inset} />
}

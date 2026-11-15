import type { Meal } from '../types'
import { MEAL_LABELS, MEALS } from '../utils'

interface Props {
  meal: Meal
  setMeal: (meal: Meal) => void
}

// Four pill buttons to choose Breakfast, Lunch, Dinner or Snacks.
export default function MealPicker({ meal, setMeal }: Props) {
  return (
    <div className="chips">
      {MEALS.map((m) => (
        <button key={m} type="button" className={m === meal ? 'chip active' : 'chip'} onClick={() => setMeal(m)}>
          {MEAL_LABELS[m]}
        </button>
      ))}
    </div>
  )
}

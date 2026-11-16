import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addEntry, db, logAgain } from '../db'
import type { Entry, Meal, Product } from '../types'
import { fmt, formatDay, MEAL_LABELS, shiftDay, todayKey } from '../utils'
import Button from './Button'
import MealPicker from './MealPicker'
import ProductPicker from './ProductPicker'
import ProductSheet from './ProductSheet'
import { SavedMealList } from './SavedMeals'

interface Props {
  date: string
  meal: Meal
  setMeal: (meal: Meal) => void
  // Called after food was logged. goToToday = switch back to the Today tab.
  onLogged: (message: string, goToToday: boolean) => void
}

export default function AddScreen({ date, meal, setMeal, onLogged }: Props) {
  const [product, setProduct] = useState<Product | null>(null) // shown in the product sheet
  const dayBefore = shiftDay(date, -1)

  // One-tap re-log: same amount as last time, straight into the selected meal.
  async function quickAdd(p: Product) {
    await addEntry(p, p.lastGrams, date, meal)
    onLogged(`Added ${p.name} · ${fmt(p.lastGrams)} g`, false)
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Add food</h1>
          {date !== todayKey() && <p className="muted">Logging to {formatDay(date)}</p>}
        </div>
      </header>

      <MealPicker meal={meal} setMeal={setMeal} />

      <ProductPicker
        onPick={setProduct}
        onQuickAdd={quickAdd}
        extraLists={[
          {
            value: 'meals',
            label: 'Meals',
            content: <SavedMealList date={date} meal={meal} onLogged={(message) => onLogged(message, false)} />,
          },
          {
            value: 'yesterday',
            // Relative to the day being logged to.
            label: date === todayKey() ? 'Yesterday' : formatDay(dayBefore),
            content: <DayBeforeList from={dayBefore} to={date} meal={meal} onLogged={(message) => onLogged(message, false)} />,
          },
        ]}
      />

      {product && (
        <ProductSheet
          product={product}
          date={date}
          meal={meal}
          onClose={() => setProduct(null)}
          onAdded={(message) => {
            setProduct(null)
            onLogged(message, true)
          }}
        />
      )}
    </>
  )
}

interface DayBeforeProps {
  from: string // the day to list
  to: string // the day to log to
  meal: Meal
  onLogged: (message: string) => void
}

// Everything eaten the day before, each with a one-tap "log again" button.
function DayBeforeList({ from, to, meal, onLogged }: DayBeforeProps) {
  const entries = useLiveQuery(() => db.entries.where('date').equals(from).toArray(), [from]) ?? []

  async function again(entry: Entry) {
    await logAgain(entry, to, meal)
    onLogged(`Added ${entry.name} to ${MEAL_LABELS[meal].toLowerCase()}`)
  }

  return (
    <>
      {entries.length === 0 && <p className="empty">Nothing was logged on {formatDay(from).toLowerCase()}.</p>}
      {entries.map((entry) => (
        <div className="row glass" key={entry.id}>
          <div className="row-main">
            <div className="row-title">{entry.name}</div>
            <div className="muted">
              {MEAL_LABELS[entry.meal]} · {fmt(entry.grams)} g · {Math.round(entry.kcal)} kcal
            </div>
          </div>
          <Button variant="primary" size="small" layout="round" icon="plus" onClick={() => again(entry)} aria-label={`Log ${entry.name} again`} />
        </div>
      ))}
    </>
  )
}

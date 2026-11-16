import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addEntry, db, logAgain } from '../db'
import type { Entry, Meal, Product } from '../types'
import { fmt, formatDay, mealLabel, shiftDay, todayKey } from '../utils'
import Button from './Button'
import MealPicker from './MealPicker'
import ProductPicker from './ProductPicker'
import ProductSheet from './ProductSheet'
import { SavedMealList } from './SavedMeals'
import { t, num } from '../i18n'

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
    onLogged(t('add.added', { name: p.name, grams: fmt(p.lastGrams) }), false)
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{t('add.title')}</h1>
          {date !== todayKey() && <p className="muted">{t('add.loggingTo', { day: formatDay(date).toLowerCase() })}</p>}
        </div>
      </header>

      <MealPicker meal={meal} setMeal={setMeal} />

      <ProductPicker
        onPick={setProduct}
        onQuickAdd={quickAdd}
        extraLists={[
          {
            value: 'meals',
            label: t('add.meals'),
            content: <SavedMealList date={date} meal={meal} onLogged={(message) => onLogged(message, false)} />,
          },
          {
            value: 'yesterday',
            // The day before the one being logged to: "Yesterday", or its date.
            label: formatDay(dayBefore),
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
    onLogged(t('saved.addedTo', { name: entry.name, meal: mealLabel(meal).toLowerCase() }))
  }

  return (
    <>
      {entries.length === 0 && <p className="empty">{t('add.nothingOn', { day: formatDay(from).toLowerCase() })}</p>}
      {entries.map((entry) => (
        <div className="row surface" key={entry.id}>
          <div className="row-main">
            <div className="row-title">{entry.name}</div>
            <div className="muted">
              {mealLabel(entry.meal)} · {fmt(entry.grams)} g · {num(entry.kcal)} kcal
            </div>
          </div>
          <Button variant="primary" size="small" layout="round" icon="plus" onClick={() => again(entry)} aria-label={t('add.logAgain', { name: entry.name })} />
        </div>
      ))}
    </>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { copyMealFromDayBefore, db, DEFAULT_TARGETS, entriesForMeal, getTargets } from '../db'
import type { Entry, Meal } from '../types'
import { fmt, formatDay, MEAL_LABELS, MEALS, shiftDay, sumMacros, todayKey } from '../utils'
import CalorieRing from './CalorieRing'
import EntrySheet from './EntrySheet'
import MacroBar from './MacroBar'
import { SaveMealSheet } from './SavedMeals'

interface Props {
  date: string
  setDate: (date: string) => void
  onAddTo: (meal: Meal) => void // open the Add tab with this meal selected
  onToast: (message: string) => void
}

export default function TodayScreen({ date, setDate, onAddTo, onToast }: Props) {
  // useLiveQuery re-runs automatically whenever the data in the database changes.
  const entries = useLiveQuery(() => db.entries.where('date').equals(date).toArray(), [date]) ?? []
  const targets = useLiveQuery(getTargets) ?? DEFAULT_TARGETS
  const [editing, setEditing] = useState<Entry | null>(null)
  const [savingMeal, setSavingMeal] = useState<Meal | null>(null)

  const total = sumMacros(entries)
  const isToday = date === todayKey()
  const entriesOf = (meal: Meal) => entries.filter((e) => e.meal === meal)

  return (
    <>
      <header className="day-nav">
        <button className="icon-button glass" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <button className="day-title" onClick={() => setDate(todayKey())}>
          {formatDay(date)}
        </button>
        <button
          className="icon-button glass"
          onClick={() => setDate(shiftDay(date, 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          ›
        </button>
      </header>

      <section className="card glass">
        <CalorieRing eaten={total.kcal} target={targets.kcal} />
        <MacroBar label="Protein" eaten={total.protein} target={targets.protein} color="var(--protein)" />
        <MacroBar label="Carbs" eaten={total.carbs} target={targets.carbs} color="var(--carbs)" />
        <MacroBar label="Fat" eaten={total.fat} target={targets.fat} color="var(--fat)" />
      </section>

      {MEALS.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          date={date}
          entries={entriesOf(meal)}
          onAdd={() => onAddTo(meal)}
          onEdit={setEditing}
          onSave={() => setSavingMeal(meal)}
          onToast={onToast}
        />
      ))}

      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}

      {savingMeal && (
        <SaveMealSheet
          entries={entriesOf(savingMeal)}
          defaultName={`My usual ${MEAL_LABELS[savingMeal].toLowerCase()}`}
          onClose={() => setSavingMeal(null)}
          onSaved={(message) => {
            setSavingMeal(null)
            onToast(message)
          }}
        />
      )}
    </>
  )
}

interface SectionProps {
  meal: Meal
  date: string
  entries: Entry[]
  onAdd: () => void
  onEdit: (entry: Entry) => void
  onSave: () => void
  onToast: (message: string) => void
}

// One meal: a header with the subtotal, then its entries.
function MealSection({ meal, date, entries, onAdd, onEdit, onSave, onToast }: SectionProps) {
  const label = MEAL_LABELS[meal]
  // How many foods this meal had the day before (to offer "Copy yesterday's ...").
  const dayBeforeCount =
    useLiveQuery(() => entriesForMeal(shiftDay(date, -1), meal).then((list) => list.length), [date, meal]) ?? 0

  async function copy() {
    const count = await copyMealFromDayBefore(date, meal)
    onToast(`Copied ${count} ${count === 1 ? 'food' : 'foods'} to ${label.toLowerCase()}`)
  }

  return (
    <section className="meal">
      <div className="meal-head">
        <h3 className="meal-title">{label}</h3>
        <span className="muted meal-total">{Math.round(sumMacros(entries).kcal)} kcal</span>
        {entries.length > 0 && (
          <button className="pill-button" onClick={onSave}>
            Save
          </button>
        )}
        <button className="icon-button small-add" onClick={onAdd} aria-label={`Add to ${label}`}>
          +
        </button>
      </div>

      {entries.length === 0 && dayBeforeCount > 0 && (
        <button className="pill-button copy-button" onClick={copy}>
          Copy {date === todayKey() ? 'yesterday’s' : 'previous day’s'} {label.toLowerCase()}
        </button>
      )}

      {entries.map((entry) => (
        <button className="entry glass" key={entry.id} onClick={() => onEdit(entry)}>
          <div className="entry-main">
            <div className="entry-name">{entry.name}</div>
            <div className="muted">{fmt(entry.grams)} g</div>
          </div>
          <div className="entry-kcal">
            {Math.round(entry.kcal)} <span className="muted">kcal</span>
          </div>
        </button>
      ))}
    </section>
  )
}

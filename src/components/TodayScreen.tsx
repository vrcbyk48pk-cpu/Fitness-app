import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { copyMealFromDayBefore, db, DEFAULT_TARGETS, entriesForMeal, getTargets } from '../db'
import type { Entry, Meal } from '../types'
import { fmt, formatDay, MEAL_LABELS, MEALS, shiftDay, sumExtra, sumMacros, todayKey } from '../utils'
import BackupBanner from './BackupBanner'
import Button from './Button'
import CalorieRing from './CalorieRing'
import DayDetails from './DayDetails'
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
  const [showDetails, setShowDetails] = useState(false)

  const total = sumMacros(entries)
  // Fibre is not known for every food: count what is known, and say how many are missing.
  const fibre = sumExtra(entries, 'fibre')
  const isToday = date === todayKey()
  const entriesOf = (meal: Meal) => entries.filter((e) => e.meal === meal)

  return (
    <>
      <header className="page-head">
        {/* Tapping the title jumps back to today. */}
        <button className="page-title" onClick={() => setDate(todayKey())}>
          {formatDay(date)}
        </button>
        <div className="head-actions">
          <Button variant="glass" layout="round" icon="back" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day" />
          <Button
            variant="glass"
            layout="round"
            icon="forward"
            onClick={() => setDate(shiftDay(date, 1))}
            disabled={isToday}
            aria-label="Next day"
          />
        </div>
      </header>

      <BackupBanner />

      <section className="card glass">
        <CalorieRing eaten={total.kcal} target={targets.kcal} />
        <MacroBar label="Protein" eaten={total.protein} target={targets.protein} color="var(--protein)" />
        <MacroBar label="Carbs" eaten={total.carbs} target={targets.carbs} color="var(--carbs)" />
        <MacroBar label="Fat" eaten={total.fat} target={targets.fat} color="var(--fat)" />
        <MacroBar
          label="Fibre"
          eaten={fibre.total}
          target={targets.fibre}
          color="var(--fibre)"
          note={fibre.unknown > 0 ? `Not known for ${fibre.unknown} of ${entries.length} foods` : undefined}
        />
        <Button block size="small" icon="info" onClick={() => setShowDetails(true)}>
          Day details
        </Button>
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

      {showDetails && <DayDetails entries={entries} targets={targets} onClose={() => setShowDetails(false)} />}

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
        <h2 className="meal-title">{label}</h2>
        <span className="muted meal-total">{Math.round(sumMacros(entries).kcal)} kcal</span>
        {entries.length > 0 && (
          <Button variant="glass" size="small" icon="bookmark" onClick={onSave}>
            Save
          </Button>
        )}
        <Button variant="primary" size="small" layout="round" icon="plus" onClick={onAdd} aria-label={`Add to ${label}`} />
      </div>

      {entries.length === 0 && dayBeforeCount > 0 && (
        <Button variant="glass" size="small" icon="copy" className="meal-copy" onClick={copy}>
          Copy {date === todayKey() ? 'yesterday’s' : 'previous day’s'} {label.toLowerCase()}
        </Button>
      )}

      {entries.map((entry) => (
        <button className="row glass" key={entry.id} onClick={() => onEdit(entry)}>
          <div className="row-main">
            <div className="row-title">{entry.name}</div>
            <div className="muted">
              {entry.portions !== undefined && `${fmt(entry.portions)} ${entry.portions === 1 ? 'portion' : 'portions'} · `}
              {fmt(entry.grams)} g
            </div>
          </div>
          <div className="row-value">
            {Math.round(entry.kcal)} <span className="muted">kcal</span>
          </div>
        </button>
      ))}
    </section>
  )
}

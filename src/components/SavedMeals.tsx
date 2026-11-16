import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteSavedMeal, logSavedMeal, saveMeal } from '../db'
import type { Entry, Meal, SavedMeal } from '../types'
import { fmt, MEAL_LABELS, sumMacros } from '../utils'
import Button from './Button'
import Sheet from './Sheet'

// ---------- The list of saved meals on the Add screen ----------

interface ListProps {
  date: string
  meal: Meal // the meal the foods are logged to
  onLogged: (message: string) => void
}

export function SavedMealList({ date, meal, onLogged }: ListProps) {
  const savedMeals = useLiveQuery(() => db.savedMeals.toArray()) ?? []
  const [open, setOpen] = useState<SavedMeal | null>(null) // shown in the detail sheet

  async function log(saved: SavedMeal) {
    await logSavedMeal(saved, date, meal)
    onLogged(`Added ${saved.name} to ${MEAL_LABELS[meal].toLowerCase()}`)
  }

  return (
    <>
      {savedMeals.length === 0 && (
        <p className="empty">No saved meals yet. On the Today screen, tap “Save” next to a meal to keep it here.</p>
      )}
      {savedMeals.map((saved) => (
        <div className="row glass" key={saved.id}>
          <button className="row-main" onClick={() => setOpen(saved)}>
            <div className="row-title">{saved.name}</div>
            <div className="muted">
              {saved.items.length} {saved.items.length === 1 ? 'food' : 'foods'} ·{' '}
              {Math.round(sumMacros(saved.items).kcal)} kcal
            </div>
          </button>
          <Button variant="primary" size="small" layout="round" icon="plus" onClick={() => log(saved)} aria-label={`Add ${saved.name}`} />
        </div>
      ))}

      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)}>
          {open.items.map((item, i) => (
            <div className="row plain" key={i}>
              <div className="row-main">
                <div className="row-title">{item.name}</div>
                <div className="muted">{fmt(item.grams)} g</div>
              </div>
              <div className="row-value">
                {Math.round(item.kcal)} <span className="muted">kcal</span>
              </div>
            </div>
          ))}
          <div className="sheet-actions">
            <Button
              variant="primary"
              block
              onClick={() => {
                log(open)
                setOpen(null)
              }}
            >
              Add to {MEAL_LABELS[meal].toLowerCase()}
            </Button>
            <Button
              variant="danger"
              block
              onClick={() => {
                deleteSavedMeal(open.id!)
                setOpen(null)
              }}
            >
              Delete saved meal
            </Button>
          </div>
        </Sheet>
      )}
    </>
  )
}

// ---------- The "save this meal" sheet on the Today screen ----------

interface SaveProps {
  entries: Entry[] // the foods to save
  defaultName: string
  onClose: () => void
  onSaved: (message: string) => void
}

export function SaveMealSheet({ entries, defaultName, onClose, onSaved }: SaveProps) {
  const [name, setName] = useState(defaultName)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await saveMeal(name.trim(), entries)
    onSaved(`Saved “${name.trim()}”`)
  }

  return (
    <Sheet title="Save as meal" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <p className="muted">
          {entries.length} {entries.length === 1 ? 'food' : 'foods'} · {Math.round(sumMacros(entries).kcal)} kcal. You can
          log it again in one tap from Add → Meals.
        </p>
        <Button variant="primary" block type="submit" disabled={!name.trim()}>
          Save meal
        </Button>
      </form>
    </Sheet>
  )
}

import { useState } from 'react'
import { deleteEntry, updateEntry } from '../db'
import type { Entry } from '../types'
import { fmt, parseNumber } from '../utils'
import MealPicker from './MealPicker'
import Sheet from './Sheet'

interface Props {
  entry: Entry
  onClose: () => void
}

// Edit a logged food: change the grams or the meal, or delete it.
export default function EntrySheet({ entry, onClose }: Props) {
  const [gramsText, setGramsText] = useState(fmt(entry.grams))
  const [meal, setMeal] = useState(entry.meal)

  const grams = parseNumber(gramsText)
  const valid = grams !== null && grams > 0
  // Preview of the calories for the new amount.
  const kcal = valid ? (entry.kcal / entry.grams) * grams : 0

  async function save() {
    if (!valid) return
    await updateEntry(entry, grams, meal)
    onClose()
  }

  async function remove() {
    await deleteEntry(entry.id!)
    onClose()
  }

  return (
    <Sheet title={entry.name} onClose={onClose}>
      <div className="label">Amount</div>
      <div className="grams-row">
        <input
          className="input grams-input"
          inputMode="decimal"
          value={gramsText}
          onChange={(e) => setGramsText(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label="Grams"
        />
        <span className="muted">grams · {Math.round(kcal)} kcal</span>
      </div>

      <div className="label">Meal</div>
      <MealPicker meal={meal} setMeal={setMeal} />

      <button className="button big" onClick={save} disabled={!valid}>
        Save
      </button>
      <button className="button danger" onClick={remove}>
        Delete entry
      </button>
    </Sheet>
  )
}

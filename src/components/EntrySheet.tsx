import { useState } from 'react'
import { deleteEntry, updateEntry } from '../db'
import type { Entry } from '../types'
import { fmt, parseNumber } from '../utils'
import Button from './Button'
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
      <div className="input-row">
        <input
          className="input number amount-input"
          inputMode="decimal"
          value={gramsText}
          onChange={(e) => setGramsText(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label="Grams"
        />
        <span className="muted">grams · {Math.round(kcal)} kcal</span>
      </div>

      <div className="label">Meal</div>
      <MealPicker meal={meal} setMeal={setMeal} inset />

      <div className="sheet-actions">
        <Button variant="primary" block onClick={save} disabled={!valid}>
          Save
        </Button>
        <Button variant="danger" block onClick={remove}>
          Delete entry
        </Button>
      </div>
    </Sheet>
  )
}

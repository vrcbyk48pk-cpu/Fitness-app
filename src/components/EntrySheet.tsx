import { useState } from 'react'
import { deleteEntry, updateEntry } from '../db'
import type { Entry } from '../types'
import { parseNumber } from '../utils'
import Button from './Button'
import MealPicker from './MealPicker'
import Sheet from './Sheet'
import { t, tn, num, inputNumber } from '../i18n'

interface Props {
  entry: Entry
  onClose: () => void
}

// Edit a logged food: change the grams or the meal, or delete it.
export default function EntrySheet({ entry, onClose }: Props) {
  const [gramsText, setGramsText] = useState(inputNumber(entry.grams))
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
      <div className="label">{t('common.amount')}</div>
      <div className="input-row">
        <input
          className="input number amount-input"
          inputMode="decimal"
          value={gramsText}
          onChange={(e) => setGramsText(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label={t('common.gramsLabel')}
        />
        <span className="muted">{t('entry.gramsKcal', { kcal: num(kcal) })}</span>
      </div>
      {entry.portions !== undefined && (
        <p className="muted extras">
          {t('entry.loggedAs', { portions: tn('amount.portions', entry.portions) })}
        </p>
      )}

      <div className="label">{t('common.meal')}</div>
      <MealPicker meal={meal} setMeal={setMeal} inset />

      <div className="sheet-actions">
        <Button variant="primary" block onClick={save} disabled={!valid}>
          {t('common.save')}
        </Button>
        <Button variant="danger" block onClick={remove}>
          {t('entry.delete')}
        </Button>
      </div>
    </Sheet>
  )
}

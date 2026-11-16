import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteSavedMeal, logSavedMeal, saveMeal } from '../db'
import type { Entry, Meal, SavedMeal } from '../types'
import { totalNutrients } from '../mealPrep'
import type { Nutrients, SavedMealItem } from '../types'
import { fmt, mealLabel } from '../utils'
import Button from './Button'
import Sheet from './Sheet'
import { t, tn, num } from '../i18n'

// Combined calories, protein and fibre, e.g. "550 kcal · 40 g protein · 11.5 g fibre".
function summary(total: Nutrients): string {
  const fibre = total.fibre === undefined ? '' : t('saved.fibre', { fibre: fmt(total.fibre) })
  return t('saved.summary', { kcal: num(total.kcal), protein: fmt(total.protein) }) + fibre
}

// "1 portion · 350 g" or "100 g"
function amount(item: SavedMealItem): string {
  if (item.portions === undefined) return `${fmt(item.grams)} g`
  return `${tn('amount.portions', item.portions)} · ${fmt(item.grams)} g`
}

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
    onLogged(t('saved.addedTo', { name: saved.name, meal: mealLabel(meal).toLowerCase() }))
  }

  return (
    <>
      {savedMeals.length === 0 && (
        <p className="empty">{t('saved.empty')}</p>
      )}
      {savedMeals.map((saved) => (
        <div className="row surface" key={saved.id}>
          <button className="row-main" onClick={() => setOpen(saved)}>
            <div className="row-title">{saved.name}</div>
            <div className="muted">{summary(totalNutrients(saved.items))}</div>
          </button>
          <Button variant="primary" size="small" layout="round" icon="plus" onClick={() => log(saved)} aria-label={t('saved.add', { name: saved.name })} />
        </div>
      ))}

      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)}>
          {open.items.map((item, i) => (
            <div className="row plain" key={i}>
              <div className="row-main">
                <div className="row-title">{item.name}</div>
                <div className="muted">{amount(item)}</div>
              </div>
              <div className="row-value">
                {num(item.kcal)} <span className="muted">kcal</span>
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
              {t('today.addTo', { meal: mealLabel(meal).toLowerCase() })}
            </Button>
            <Button
              variant="danger"
              block
              onClick={() => {
                deleteSavedMeal(open.id!)
                setOpen(null)
              }}
            >
              {t('saved.delete')}
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
    onSaved(t('saved.saved', { name: name.trim() }))
  }

  return (
    <Sheet title={t('saved.saveAs')} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <label className="field">
          <span>{t('common.name')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <p className="muted">
          {tn('saved.info', entries.length, { summary: summary(totalNutrients(entries)) })}
        </p>
        <Button variant="primary" block type="submit" disabled={!name.trim()}>
          {t('saved.saveMeal')}
        </Button>
      </form>
    </Sheet>
  )
}

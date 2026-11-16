import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteMealPrep, duplicateMealPrep } from '../db'
import { per100g, perPortion, portionGrams, prepProductId } from '../mealPrep'
import type { Meal, MealPrep, Product } from '../types'
import { fmt } from '../utils'
import Button from './Button'
import ExtrasLine from './ExtrasLine'
import MacroTiles from './MacroTiles'
import MealPrepEditor from './MealPrepEditor'
import ProductSheet from './ProductSheet'
import Sheet from './Sheet'

interface Props {
  date: string // the day that logging goes to
  meal: Meal
  onLogged: (message: string) => void
}

export default function MealPrepScreen({ date, meal, onLogged }: Props) {
  // Newest first.
  const preps = (useLiveQuery(() => db.mealPreps.toArray()) ?? []).sort((a, b) => b.updatedAt - a.updatedAt)
  // "new" = making a new one; a MealPrep = editing that one.
  const [editing, setEditing] = useState<MealPrep | 'new' | null>(null)
  const [open, setOpen] = useState<MealPrep | null>(null) // shown in the detail sheet
  const [logging, setLogging] = useState<Product | null>(null) // shown in the product sheet

  if (editing) {
    return <MealPrepEditor prep={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
  }

  // Logging goes through the product that belongs to the meal prep.
  async function log(prep: MealPrep) {
    const product = await db.products.get(prepProductId(prep.id))
    setOpen(null)
    if (product) setLogging(product)
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Meal prep</h1>
        <Button variant="primary" layout="round" icon="plus" onClick={() => setEditing('new')} aria-label="New meal prep" />
      </header>

      {preps.length === 0 && (
        <section className="card glass">
          <p className="muted">
            Cook once, log all week. Add the ingredients of a dish, weigh the finished pot, and the app works out the
            nutrition per 100 g and per portion.
          </p>
          <Button variant="primary" block icon="plus" onClick={() => setEditing('new')}>
            New meal prep
          </Button>
        </section>
      )}

      {preps.map((prep) => (
        <button className="row glass" key={prep.id} onClick={() => setOpen(prep)}>
          <div className="row-main">
            <div className="row-title">{prep.name}</div>
            <div className="muted">
              {Math.round(per100g(prep).kcal)} kcal per 100 g
              {prep.portions && ` · ${fmt(prep.portions)} portions of ${fmt(portionGrams(prep)!)} g`}
            </div>
          </div>
          <div className="row-value">
            {Math.round((perPortion(prep) ?? per100g(prep)).kcal)} <span className="muted">kcal</span>
          </div>
        </button>
      ))}

      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)}>
          {open.portions && (
            <>
              <div className="label">Per portion ({fmt(portionGrams(open)!)} g)</div>
              <MacroTiles {...perPortion(open)!} />
              <ExtrasLine {...perPortion(open)!} />
            </>
          )}
          <div className="label">Per 100 g</div>
          <MacroTiles {...per100g(open)} />
          <ExtrasLine {...per100g(open)} />

          <div className="label">
            Ingredients · {fmt(open.cookedWeight)} g cooked
          </div>
          {open.ingredients.map((ingredient, i) => (
            <div className="row plain" key={i}>
              <div className="row-main">
                <div className="row-title">{ingredient.name}</div>
              </div>
              <div className="muted">{fmt(ingredient.grams)} g</div>
            </div>
          ))}

          <div className="sheet-actions">
            <Button variant="primary" block icon="plus" onClick={() => log(open)}>
              Log it
            </Button>
            <Button
              block
              icon="pencil"
              onClick={() => {
                setEditing(open)
                setOpen(null)
              }}
            >
              Edit
            </Button>
            <Button
              block
              icon="copy"
              onClick={() => {
                duplicateMealPrep(open)
                setOpen(null)
              }}
            >
              Duplicate
            </Button>
            <Button
              variant="danger"
              block
              icon="trash"
              onClick={() => {
                deleteMealPrep(open.id)
                setOpen(null)
              }}
            >
              Delete
            </Button>
          </div>
        </Sheet>
      )}

      {logging && (
        <ProductSheet
          product={logging}
          date={date}
          meal={meal}
          onClose={() => setLogging(null)}
          onAdded={(message) => {
            setLogging(null)
            onLogged(message)
          }}
        />
      )}
    </>
  )
}

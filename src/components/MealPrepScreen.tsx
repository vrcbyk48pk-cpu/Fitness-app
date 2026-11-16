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
import { t, num } from '../i18n'

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
        <h1 className="page-title">{t('prep.title')}</h1>
        <Button variant="primary" layout="round" icon="plus" onClick={() => setEditing('new')} aria-label={t('prep.new')} />
      </header>

      {preps.length === 0 && (
        <section className="card surface">
          <p className="muted">
            {t('prep.intro')}
          </p>
          <Button variant="primary" block icon="plus" onClick={() => setEditing('new')}>
            {t('prep.new')}
          </Button>
        </section>
      )}

      {preps.map((prep) => (
        <button className="row surface" key={prep.id} onClick={() => setOpen(prep)}>
          <div className="row-main">
            <div className="row-title">{prep.name}</div>
            <div className="muted">
              {t('prep.per100', { kcal: num(per100g(prep).kcal) })}
              {prep.portions && t('prep.portionsOf', { portions: fmt(prep.portions), grams: fmt(portionGrams(prep)!) })}
            </div>
          </div>
          <div className="row-value">
            {num((perPortion(prep) ?? per100g(prep)).kcal)} <span className="muted">kcal</span>
          </div>
        </button>
      ))}

      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)}>
          {open.portions && (
            <>
              <div className="label">{t('prep.perPortion', { grams: fmt(portionGrams(open)!) })}</div>
              <MacroTiles {...perPortion(open)!} />
              <ExtrasLine {...perPortion(open)!} />
            </>
          )}
          <div className="label">{t('common.per100g')}</div>
          <MacroTiles {...per100g(open)} />
          <ExtrasLine {...per100g(open)} />

          <div className="label">{t('prep.ingredientsCooked', { grams: fmt(open.cookedWeight) })}</div>
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
              {t('prep.logIt')}
            </Button>
            <Button
              block
              icon="pencil"
              onClick={() => {
                setEditing(open)
                setOpen(null)
              }}
            >
              {t('prep.editBtn')}
            </Button>
            <Button
              block
              icon="copy"
              onClick={() => {
                duplicateMealPrep(open)
                setOpen(null)
              }}
            >
              {t('prep.duplicate')}
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
              {t('prep.delete')}
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

import { useState } from 'react'
import { saveMealPrep } from '../db'
import { per100g, perPortion, portionGrams, prepProblem, rawWeight } from '../mealPrep'
import type { Ingredient, MealPrep, Nutrients } from '../types'
import { fmt, nutrientsFor, parseNumber, scaleNutrients } from '../utils'
import AmountSheet from './AmountSheet'
import Button from './Button'
import ExtrasLine from './ExtrasLine'
import MacroTiles from './MacroTiles'
import ProductPicker from './ProductPicker'
import { t, num, inputNumber } from '../i18n'

interface Props {
  prep: MealPrep | null // the meal prep to edit, or null for a new one
  onDone: () => void
}

// The amount sheet is used both for a new ingredient and to change an existing one.
interface AmountState {
  index?: number // set when changing an existing ingredient
  productId: string
  name: string
  per100g: Nutrients
  grams: number
}

// Create or edit a meal prep: name, ingredients, cooked weight and portions.
export default function MealPrepEditor({ prep, onDone }: Props) {
  const [name, setName] = useState(prep?.name ?? '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(prep?.ingredients ?? [])
  const [cookedText, setCookedText] = useState(prep ? inputNumber(prep.cookedWeight) : '')
  const [portionsText, setPortionsText] = useState(prep?.portions ? inputNumber(prep.portions) : '')
  const [picking, setPicking] = useState(false) // choosing a product to add
  const [amount, setAmount] = useState<AmountState | null>(null)

  // The meal prep as it stands now (possibly incomplete).
  const draft = {
    name,
    ingredients,
    cookedWeight: parseNumber(cookedText) ?? 0,
    // Empty = not divided into portions. Anything else must be a number above 0.
    portions: portionsText.trim() === '' ? undefined : (parseNumber(portionsText) ?? 0),
  }
  const problem = prepProblem(draft)
  const portion = portionGrams(draft)

  function saveAmount(grams: number) {
    if (!amount) return
    const ingredient: Ingredient = {
      ...nutrientsFor(amount.per100g, grams),
      productId: amount.productId,
      name: amount.name,
      grams,
    }
    setIngredients(
      amount.index === undefined
        ? [...ingredients, ingredient]
        : ingredients.map((existing, i) => (i === amount.index ? ingredient : existing)),
    )
    setAmount(null)
  }

  async function save() {
    if (problem) return
    await saveMealPrep({ ...draft, name: name.trim(), id: prep?.id ?? crypto.randomUUID(), updatedAt: Date.now() })
    onDone()
  }

  // ----- Choosing an ingredient: the same picker as on the Add screen -----
  if (picking) {
    return (
      <>
        <header className="page-head">
          <h1 className="page-title">{t('prep.addIngredient')}</h1>
          <Button variant="soft" layout="round" icon="close" onClick={() => setPicking(false)} aria-label={t('prep.backToPrep')} />
        </header>
        <ProductPicker
          onPick={(product) => {
            setPicking(false)
            setAmount({ productId: product.id, name: product.name, per100g: product, grams: 100 })
          }}
        />
      </>
    )
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">{prep ? t('prep.edit') : t('prep.new')}</h1>
        <Button variant="soft" layout="round" icon="close" onClick={onDone} aria-label={t('common.cancel')} />
      </header>

      <section className="card surface">
        <label className="field">
          <span>{t('common.name')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('prep.namePlaceholder')} />
        </label>
      </section>

      <h2 className="section-title">{t('prep.ingredients')}</h2>
      {ingredients.length === 0 && <p className="empty">{t('prep.emptyIngredients')}</p>}
      {ingredients.map((ingredient, i) => (
        <div className="row surface" key={i}>
          {/* Tap an ingredient to change its amount. */}
          <button
            className="row-main"
            onClick={() =>
              setAmount({
                index: i,
                productId: ingredient.productId,
                name: ingredient.name,
                per100g: scaleNutrients(ingredient, 100 / ingredient.grams),
                grams: ingredient.grams,
              })
            }
          >
            <div className="row-title">{ingredient.name}</div>
            <div className="muted">
              {fmt(ingredient.grams)} g · {num(ingredient.kcal)} kcal
            </div>
          </button>
          <Button
            size="small"
            layout="round"
            icon="close"
            onClick={() => setIngredients(ingredients.filter((_, index) => index !== i))}
            aria-label={t('prep.removeIngredient', { name: ingredient.name })}
          />
        </div>
      ))}
      <Button variant="soft" block icon="plus" onClick={() => setPicking(true)}>
        {t('prep.addIngredient')}
      </Button>

      <h2 className="section-title">{t('prep.afterCooking')}</h2>
      <section className="card surface">
        <div className="field-grid">
          <label className="field">
            <span>{t('prep.cookedWeight')}</span>
            <input
              className="input number"
              inputMode="decimal"
              value={cookedText}
              onChange={(e) => setCookedText(e.target.value)}
              placeholder={ingredients.length > 0 ? fmt(rawWeight(draft)) : '0'}
            />
          </label>
          <label className="field">
            <span>{t('prep.portionsOptional')}</span>
            <input
              className="input number"
              inputMode="decimal"
              value={portionsText}
              onChange={(e) => setPortionsText(e.target.value)}
              placeholder="–"
            />
          </label>
        </div>
        <p className="muted">
          {t('prep.weighHint')}
          {ingredients.length > 0 && t('prep.rawHint', { grams: fmt(rawWeight(draft)) })}
        </p>

        {problem ? (
          <p className="note">{problem}</p>
        ) : (
          <>
            <div>
              <div className="label">{t('common.per100g')}</div>
              <MacroTiles {...per100g(draft)} />
              <ExtrasLine {...per100g(draft)} />
            </div>
            {portion !== undefined && (
              <div>
                <div className="label">{t('prep.perPortion', { grams: fmt(portion) })}</div>
                <MacroTiles {...perPortion(draft)!} />
                <ExtrasLine {...perPortion(draft)!} />
              </div>
            )}
          </>
        )}
      </section>

      <div className="stack save-bar">
        <Button variant="primary" block disabled={problem !== null} onClick={save}>
          {t('prep.save')}
        </Button>
      </div>

      {amount && (
        <AmountSheet
          name={amount.name}
          per100g={amount.per100g}
          initialGrams={amount.grams}
          actionLabel={amount.index === undefined ? t('prep.addIngredient') : t('prep.saveAmount')}
          onSave={saveAmount}
          onClose={() => setAmount(null)}
        />
      )}
    </>
  )
}

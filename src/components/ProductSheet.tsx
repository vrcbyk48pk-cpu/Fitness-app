import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addEntry, db, setFavourite } from '../db'
import type { Meal, Product } from '../types'
import { fmt, formatDay, nutrientsFor, parseNumber } from '../utils'
import Button from './Button'
import ExtrasLine from './ExtrasLine'
import Icon from './Icon'
import MacroTiles from './MacroTiles'
import MealPicker from './MealPicker'
import Segmented from './Segmented'
import Sheet from './Sheet'

interface Props {
  product: Product
  date: string // the day the entry is added to
  meal: Meal // the meal that is selected when the sheet opens
  onClose: () => void
  onAdded: (message: string) => void
}

type Unit = 'portions' | 'grams'

const UNITS: { value: Unit; label: string }[] = [
  { value: 'portions', label: 'Portions' },
  { value: 'grams', label: 'Grams' },
]

const QUICK: Record<Unit, number[]> = {
  portions: [0.5, 1, 1.5, 2],
  grams: [50, 100, 150, 200],
}

// Shows a product, lets you pick the amount and the meal, and logs it.
// Meal preps that were divided into portions can be logged in portions or in grams.
export default function ProductSheet({ product, date, meal: initialMeal, onClose, onAdded }: Props) {
  const portionGrams = product.portionGrams
  const [meal, setMeal] = useState(initialMeal)
  const [unit, setUnit] = useState<Unit>(portionGrams ? 'portions' : 'grams')
  const [amountText, setAmountText] = useState(portionGrams ? '1' : fmt(product.lastGrams))
  // Read the favourite flag live from the database so the star updates when tapped.
  const favourite = useLiveQuery(() => db.products.get(product.id), [product.id])?.favourite ?? product.favourite

  const amount = parseNumber(amountText)
  const valid = amount !== null && amount > 0
  // Whatever the unit, the entry is stored in grams.
  const grams = !valid ? 0 : unit === 'portions' && portionGrams ? amount * portionGrams : amount

  function switchUnit(next: Unit) {
    setUnit(next)
    setAmountText(next === 'portions' ? '1' : fmt(portionGrams ?? product.lastGrams))
  }

  async function add() {
    if (!valid) return
    await addEntry(product, grams, date, meal, unit === 'portions' ? amount : undefined)
    onAdded(`Added ${product.name}`)
  }

  return (
    <Sheet title="Add food" onClose={onClose}>
      <div className="product-head">
        {product.imageUrl ? (
          <img className="thumb large" src={product.imageUrl} alt="" />
        ) : (
          <div className="thumb large placeholder">
            <Icon name={product.source === 'mealprep' ? 'pot' : 'food'} size={30} />
          </div>
        )}
        <div className="row-main">
          <div className="product-name">{product.name}</div>
          {product.brand && <div className="muted">{product.brand}</div>}
          {product.source === 'mealprep' && <div className="muted">Meal prep</div>}
        </div>
        <Button
          layout="round"
          icon={favourite ? 'starFilled' : 'star'}
          className={favourite ? 'is-favourite' : ''}
          onClick={() => setFavourite(product.id, !favourite)}
          aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
        />
      </div>

      <div className="label">Per 100 g</div>
      <MacroTiles {...product} />
      <ExtrasLine {...product} />

      <div className="label">Amount</div>
      {portionGrams && (
        <div className="unit-picker">
          <Segmented options={UNITS} value={unit} onChange={switchUnit} inset />
        </div>
      )}
      <div className="input-row">
        <input
          className="input number amount-input"
          inputMode="decimal"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label={unit === 'portions' ? 'Portions' : 'Grams'}
        />
        <span className="muted">
          {unit === 'portions' ? `${amount === 1 ? 'portion' : 'portions'} · ${fmt(grams)} g` : 'grams'}
        </span>
      </div>
      <div className="quick-row">
        {QUICK[unit].map((q) => (
          <Button key={q} size="small" variant={amount === q ? 'primary' : 'quiet'} onClick={() => setAmountText(String(q))}>
            {unit === 'portions' ? q : `${q} g`}
          </Button>
        ))}
      </div>

      <div className="label">Meal</div>
      <MealPicker meal={meal} setMeal={setMeal} inset />

      <div className="label">This amount</div>
      <MacroTiles {...nutrientsFor(product, grams)} />
      <ExtrasLine {...nutrientsFor(product, grams)} />

      <div className="sheet-actions">
        <Button variant="primary" block onClick={add} disabled={!valid}>
          Add to {formatDay(date).toLowerCase()}
        </Button>
      </div>
    </Sheet>
  )
}

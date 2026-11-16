import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addEntry, db, setFavourite } from '../db'
import type { Meal, Product } from '../types'
import { formatDay, macrosFor, parseNumber } from '../utils'
import Button from './Button'
import Icon from './Icon'
import MacroTiles from './MacroTiles'
import MealPicker from './MealPicker'
import Sheet from './Sheet'

interface Props {
  product: Product
  date: string // the day the entry is added to
  meal: Meal // the meal that is selected when the sheet opens
  onClose: () => void
  onAdded: (message: string) => void
}

const QUICK_GRAMS = [50, 100, 150, 200]

// Shows a product, lets you pick the grams and the meal, and logs it.
export default function ProductSheet({ product, date, meal: initialMeal, onClose, onAdded }: Props) {
  const [meal, setMeal] = useState(initialMeal)
  const [gramsText, setGramsText] = useState(String(product.lastGrams))
  // Read the favourite flag live from the database so the star updates when tapped.
  const favourite = useLiveQuery(() => db.products.get(product.id), [product.id])?.favourite ?? product.favourite

  const grams = parseNumber(gramsText)
  const valid = grams !== null && grams > 0

  async function add() {
    if (!valid) return
    await addEntry(product, grams, date, meal)
    onAdded(`Added ${product.name}`)
  }

  return (
    <Sheet title="Add food" onClose={onClose}>
      <div className="product-head">
        {product.imageUrl ? (
          <img className="thumb large" src={product.imageUrl} alt="" />
        ) : (
          <div className="thumb large placeholder">
            <Icon name="food" size={30} />
          </div>
        )}
        <div className="row-main">
          <div className="product-name">{product.name}</div>
          {product.brand && <div className="muted">{product.brand}</div>}
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
        <span className="muted">grams</span>
      </div>
      <div className="quick-row">
        {QUICK_GRAMS.map((g) => (
          <Button key={g} size="small" variant={grams === g ? 'primary' : 'quiet'} onClick={() => setGramsText(String(g))}>
            {g} g
          </Button>
        ))}
      </div>

      <div className="label">Meal</div>
      <MealPicker meal={meal} setMeal={setMeal} inset />

      <div className="label">This portion</div>
      <MacroTiles {...macrosFor(product, valid ? grams : 0)} />

      <div className="sheet-actions">
        <Button variant="primary" block onClick={add} disabled={!valid}>
          Add to {formatDay(date).toLowerCase()}
        </Button>
      </div>
    </Sheet>
  )
}

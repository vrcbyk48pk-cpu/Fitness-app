import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addEntry, db, setFavourite } from '../db'
import type { Product } from '../types'
import { fmt, formatDay, macrosFor, parseNumber } from '../utils'
import Sheet from './Sheet'

interface Props {
  product: Product
  date: string // the day the entry is added to
  onClose: () => void
  onAdded: (message: string) => void
}

const QUICK_GRAMS = [50, 100, 150, 200]

// Shows a product, lets you pick the grams, and logs it.
export default function ProductSheet({ product, date, onClose, onAdded }: Props) {
  const [gramsText, setGramsText] = useState(String(product.lastGrams))
  // Read the favourite flag live from the database so the star updates when tapped.
  const favourite = useLiveQuery(() => db.products.get(product.id), [product.id])?.favourite ?? product.favourite

  const grams = parseNumber(gramsText)
  const valid = grams !== null && grams > 0
  const eaten = macrosFor(product, valid ? grams : 0)

  async function add() {
    if (!valid) return
    await addEntry(product, grams, date)
    onAdded(`Added ${product.name}`)
  }

  return (
    <Sheet title="Add food" onClose={onClose}>
      <div className="product-head">
        {product.imageUrl ? (
          <img className="product-image" src={product.imageUrl} alt="" />
        ) : (
          <div className="product-image placeholder">🍽️</div>
        )}
        <div className="product-info">
          <div className="product-name">{product.name}</div>
          {product.brand && <div className="muted">{product.brand}</div>}
        </div>
        <button
          className={favourite ? 'icon-button star on' : 'icon-button star'}
          onClick={() => setFavourite(product.id, !favourite)}
          aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          {favourite ? '★' : '☆'}
        </button>
      </div>

      <div className="label">Per 100 g</div>
      <MacroGrid kcal={product.kcal} protein={product.protein} carbs={product.carbs} fat={product.fat} />

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
        <span className="muted">grams</span>
      </div>
      <div className="chips">
        {QUICK_GRAMS.map((g) => (
          <button
            key={g}
            className={grams === g ? 'chip active' : 'chip'}
            onClick={() => setGramsText(String(g))}
          >
            {g} g
          </button>
        ))}
      </div>

      <div className="label">This portion</div>
      <MacroGrid kcal={eaten.kcal} protein={eaten.protein} carbs={eaten.carbs} fat={eaten.fat} />

      <button className="button big" onClick={add} disabled={!valid}>
        Add to {formatDay(date).toLowerCase()}
      </button>
    </Sheet>
  )
}

// Four small coloured tiles: kcal, protein, carbs, fat.
function MacroGrid(props: { kcal: number; protein: number; carbs: number; fat: number }) {
  return (
    <div className="macro-grid">
      <div className="tile" style={{ color: 'var(--mint-text)' }}>
        <b>{Math.round(props.kcal)}</b>
        <span>kcal</span>
      </div>
      <div className="tile" style={{ color: 'var(--protein)' }}>
        <b>{fmt(props.protein)} g</b>
        <span>protein</span>
      </div>
      <div className="tile" style={{ color: 'var(--carbs-text)' }}>
        <b>{fmt(props.carbs)} g</b>
        <span>carbs</span>
      </div>
      <div className="tile" style={{ color: 'var(--fat)' }}>
        <b>{fmt(props.fat)} g</b>
        <span>fat</span>
      </div>
    </div>
  )
}

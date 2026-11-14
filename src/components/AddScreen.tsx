import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { lookupBarcode, type LookupResult } from '../api'
import { addEntry, db } from '../db'
import type { Meal, Product, ProductDraft } from '../types'
import { fmt, formatDay, macrosFor, MEAL_LABELS, todayKey } from '../utils'
import ManualForm from './ManualForm'
import MealPicker from './MealPicker'
import ProductSheet from './ProductSheet'
import { SavedMealList } from './SavedMeals'
import Scanner from './Scanner'
import SearchSheet from './SearchSheet'

interface Props {
  date: string
  meal: Meal
  setMeal: (meal: Meal) => void
  // Called after food was logged. goToToday = switch back to the Today tab.
  onLogged: (message: string, goToToday: boolean) => void
}

export default function AddScreen({ date, meal, setMeal, onLogged }: Props) {
  const [scanning, setScanning] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<Product | null>(null) // shown in the product sheet
  const [manual, setManual] = useState<{ draft: ProductDraft; note?: string } | null>(null)
  const [list, setList] = useState<'recent' | 'favourites' | 'meals'>('recent')

  // All saved products, most recently used first.
  const products = useLiveQuery(() => db.products.orderBy('lastUsed').reverse().toArray()) ?? []
  const shown = list === 'recent' ? products.slice(0, 30) : products.filter((p) => p.favourite)

  // Decides what to show after a scan or a tapped search result.
  function showResult(result: LookupResult, barcode?: string) {
    if (result.status === 'found') {
      setProduct(result.product)
    } else if (result.status === 'incomplete') {
      setManual({
        draft: result.draft,
        note: `Open Food Facts has no ${result.missing.join(', ')} for this product. Fill in the gaps from the label.`,
      })
    } else if (result.status === 'not-found') {
      setManual({
        draft: { id: barcode },
        note: `Barcode ${barcode} was not found. Enter the values from the label and it will be recognised next time.`,
      })
    } else {
      setManual({
        draft: { id: barcode },
        note: 'Could not reach Open Food Facts (are you offline?). You can enter the values from the label instead.',
      })
    }
  }

  async function handleBarcode(barcode: string) {
    setScanning(false)
    setLoading(true)
    const result = await lookupBarcode(barcode)
    setLoading(false)
    showResult(result, barcode)
  }

  // One-tap re-log: same amount as last time, straight into the selected meal.
  async function quickAdd(p: Product) {
    await addEntry(p, p.lastGrams, date, meal)
    onLogged(`Added ${p.name} · ${fmt(p.lastGrams)} g`, false)
  }

  return (
    <>
      <header className="page-head">
        <h1>Add food</h1>
        {date !== todayKey() && <p className="muted">Logging to {formatDay(date)}</p>}
      </header>

      <MealPicker meal={meal} setMeal={setMeal} />

      <button className="button scan-button" onClick={() => setScanning(true)} disabled={loading}>
        {loading ? 'Looking up…' : 'Scan'}
      </button>
      <div className="button-row">
        <button className="button secondary" onClick={() => setSearching(true)}>
          Search
        </button>
        <button className="button secondary" onClick={() => setManual({ draft: {} })}>
          Enter manually
        </button>
      </div>

      <div className="segmented glass">
        <button className={list === 'recent' ? 'active' : ''} onClick={() => setList('recent')}>
          Recent
        </button>
        <button className={list === 'favourites' ? 'active' : ''} onClick={() => setList('favourites')}>
          Favourites
        </button>
        <button className={list === 'meals' ? 'active' : ''} onClick={() => setList('meals')}>
          Meals
        </button>
      </div>

      {list === 'meals' ? (
        <SavedMealList date={date} meal={meal} onLogged={(message) => onLogged(message, false)} />
      ) : (
        <>
          {shown.length === 0 && (
            <p className="empty">
              {list === 'recent'
                ? 'Foods you scan, search or create will show up here.'
                : 'Tap the ☆ on a food to keep it here.'}
            </p>
          )}
          {shown.map((p) => (
            <div className="product-row glass" key={p.id}>
              <button className="product-row-main" onClick={() => setProduct(p)}>
                <div className="entry-name">
                  {p.favourite && <span className="row-star">★ </span>}
                  {p.name}
                </div>
                <div className="muted">
                  {fmt(p.lastGrams)} g · {Math.round(macrosFor(p, p.lastGrams).kcal)} kcal
                </div>
              </button>
              <button
                className="icon-button add-button"
                onClick={() => quickAdd(p)}
                aria-label={`Add ${p.name} to ${MEAL_LABELS[meal]}`}
              >
                +
              </button>
            </div>
          ))}
        </>
      )}

      {scanning && <Scanner onDetected={handleBarcode} onClose={() => setScanning(false)} />}

      {searching && (
        <SearchSheet
          onClose={() => setSearching(false)}
          onResult={(result) => {
            setSearching(false)
            showResult(result)
          }}
        />
      )}

      {manual && (
        <ManualForm
          draft={manual.draft}
          note={manual.note}
          onClose={() => setManual(null)}
          onSaved={(saved) => {
            setManual(null)
            setProduct(saved) // continue straight to choosing the grams
          }}
        />
      )}

      {product && (
        <ProductSheet
          product={product}
          date={date}
          meal={meal}
          onClose={() => setProduct(null)}
          onAdded={(message) => {
            setProduct(null)
            onLogged(message, true)
          }}
        />
      )}
    </>
  )
}

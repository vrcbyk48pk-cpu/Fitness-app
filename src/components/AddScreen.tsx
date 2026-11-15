import { lazy, Suspense, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { lookupBarcode, type LookupResult } from '../api'
import { addEntry, db } from '../db'
import { addsUp } from '../labelParser'
import type { Meal, Product, ProductDraft } from '../types'
import { fmt, formatDay, macrosFor, MEAL_LABELS, todayKey } from '../utils'
import ManualForm from './ManualForm'
import MealPicker from './MealPicker'
import ProductSheet from './ProductSheet'
import { SavedMealList } from './SavedMeals'
import Scanner from './Scanner'
import SearchSheet from './SearchSheet'

// The label scanner (and with it the OCR code) is only downloaded when it is first used.
const LabelScanner = lazy(() => import('./LabelScanner'))

// What the manual form needs to know when it opens.
interface ManualState {
  draft: ProductDraft
  note?: string
  photo?: string // set after a label scan
  canScanLabel?: boolean // show the "Scan label" button
}

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
  const [manual, setManual] = useState<ManualState | null>(null)
  // Label scanning: the photo that was taken, and what we already know about the product
  // (for example its barcode, when this follows a barcode that was not found).
  const [labelPhoto, setLabelPhoto] = useState<File | null>(null)
  const [labelDraft, setLabelDraft] = useState<ProductDraft>({})
  const cameraInput = useRef<HTMLInputElement>(null)
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
        note: `Open Food Facts has no ${result.missing.join(', ')} for this product. Scan the label, or fill in the gaps yourself.`,
        canScanLabel: true,
      })
    } else if (result.status === 'not-found') {
      setManual({
        draft: { id: barcode },
        note: `Barcode ${barcode} was not found. Scan the label or type the values, and it will be recognised next time.`,
        canScanLabel: true,
      })
    } else {
      setManual({
        draft: { id: barcode },
        note: 'Could not reach Open Food Facts (are you offline?). Scan the label or type the values instead.',
        canScanLabel: true,
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

  // Opens the iPhone camera to photograph a label. This must run directly inside a tap
  // handler: browsers only allow opening the camera in response to a tap.
  function scanLabel(draft: ProductDraft) {
    setLabelDraft(draft)
    cameraInput.current?.click()
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
        <button className="button secondary" onClick={() => scanLabel({})}>
          Scan label
        </button>
        <button className="button secondary" onClick={() => setManual({ draft: {} })}>
          Manual
        </button>
      </div>

      {/* Hidden: tapping "Scan label" clicks this, which opens the camera. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = '' // allows taking another photo afterwards
          if (!file) return
          setManual(null)
          setLabelPhoto(file)
        }}
      />

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

      {labelPhoto && (
        <Suspense fallback={null}>
          <LabelScanner
            photo={labelPhoto}
            onRetake={() => scanLabel(labelDraft)}
            onClose={() => setLabelPhoto(null)}
            onManual={() => {
              setLabelPhoto(null)
              setManual({ draft: labelDraft })
            }}
            onRead={(values, preview) => {
              setLabelPhoto(null)
              // Open the form with what was read. Nothing is saved until "Save" is tapped.
              setManual({
                draft: { ...labelDraft, ...values },
                photo: preview,
                note: addsUp(values)
                  ? 'Check these against the photo. Highlighted fields could not be read.'
                  : 'Check these carefully against the photo: the calories do not match the other values, so one of them was probably misread.',
              })
            }}
          />
        </Suspense>
      )}

      {manual && (
        <ManualForm
          // A new key makes React start the form fresh when its contents change.
          key={manual.photo ?? 'typed'}
          draft={manual.draft}
          note={manual.note}
          photo={manual.photo}
          onScanLabel={manual.canScanLabel ? () => scanLabel(manual.draft) : undefined}
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

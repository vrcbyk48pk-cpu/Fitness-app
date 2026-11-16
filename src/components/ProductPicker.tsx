import { lazy, Suspense, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { lookupBarcode, type LookupResult } from '../api'
import { db, removeFromRecents } from '../db'
import { t } from '../i18n'
import { addsUp } from '../labelParser'
import type { Product, ProductDraft } from '../types'
import { fmt, nutrientsFor } from '../utils'
import Button from './Button'
import Icon from './Icon'
import ManualForm from './ManualForm'
import Scanner from './Scanner'
import SearchSheet from './SearchSheet'
import Segmented from './Segmented'
import SwipeRow from './SwipeRow'

// The label scanner (and with it the OCR code) is only downloaded when it is first used.
const LabelScanner = lazy(() => import('./LabelScanner'))

// What the manual form needs to know when it opens.
interface ManualState {
  draft: ProductDraft
  note?: string
  photo?: string // set after a label scan
  canScanLabel?: boolean // show the "Scan label" button
}

// An extra list next to Recent and Favourites, e.g. saved meals.
export interface ExtraList {
  value: string
  label: string
  content: React.ReactNode
}

interface Props {
  // Called with the product that was scanned, found, created or tapped.
  onPick: (product: Product) => void
  // When given, every row gets a "+" button that calls this (one-tap logging).
  onQuickAdd?: (product: Product) => void
  extraLists?: ExtraList[]
}

// Everything needed to choose a food: scan a barcode, search by name, type it in,
// or pick from recent and favourite foods. Used on the Add screen and in the meal prep editor.
export default function ProductPicker({ onPick, onQuickAdd, extraLists = [] }: Props) {
  const [scanning, setScanning] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [manual, setManual] = useState<ManualState | null>(null)
  // Label scanning: the photo that was taken, and what we already know about the product
  // (its barcode, and any values Open Food Facts did have).
  const [labelPhoto, setLabelPhoto] = useState<File | null>(null)
  const [labelDraft, setLabelDraft] = useState<ProductDraft>({})
  const cameraInput = useRef<HTMLInputElement>(null)
  const [list, setList] = useState('recent')

  // All saved products, most recently used first.
  const products = useLiveQuery(() => db.products.orderBy('lastUsed').reverse().toArray()) ?? []
  // A product with lastUsed 0 was removed from Recents (it still exists, e.g. as a favourite).
  const shown = list === 'recent' ? products.filter((p) => p.lastUsed > 0).slice(0, 30) : products.filter((p) => p.favourite)
  const extra = extraLists.find((l) => l.value === list)

  // Decides what to do after a scan or a tapped search result.
  function showResult(result: LookupResult, barcode?: string) {
    if (result.status === 'found') {
      onPick(result.product)
    } else if (result.status === 'incomplete') {
      setManual({
        draft: result.draft,
        note: t('picker.incomplete', { missing: result.missing.map((id) => t(`missing.${id}`)).join(', ') }),
        canScanLabel: true,
      })
    } else if (result.status === 'not-found') {
      setManual({
        draft: { id: barcode },
        note: t('picker.notFound', { barcode: barcode ?? '' }),
        canScanLabel: true,
      })
    } else {
      setManual({
        draft: { id: barcode },
        note: t('picker.offline'),
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

  return (
    <>
      {/* The three ways to find a food, as equal buttons. */}
      <div className="actions">
        <Button variant="soft" layout="stacked" icon="barcode" onClick={() => setScanning(true)} disabled={loading}>
          {loading ? t('picker.lookingUp') : t('picker.scan')}
        </Button>
        <Button variant="soft" layout="stacked" icon="search" onClick={() => setSearching(true)}>
          {t('picker.search')}
        </Button>
        <Button variant="soft" layout="stacked" icon="pencil" onClick={() => setManual({ draft: {} })}>
          {t('picker.manual')}
        </Button>
      </div>

      {/* Hidden: "Scan label" (in the form for a barcode that was not found) clicks this to open the camera. */}
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

      <div className="list-picker">
        <Segmented
          options={[
            { value: 'recent', label: t('picker.recent') },
            { value: 'favourites', label: t('picker.favourites') },
            ...extraLists.map(({ value, label }) => ({ value, label })),
          ]}
          value={list}
          onChange={setList}
        />
      </div>

      {extra ? (
        extra.content
      ) : (
        <>
          {shown.length === 0 && (
            <p className="empty">
              {list === 'recent'
                ? t('picker.emptyRecent')
                : t('picker.emptyFavourites')}
            </p>
          )}
          {shown.map((p) => {
            const row = (
              <div className="row surface">
                <button className="row-main" onClick={() => onPick(p)}>
                  <div className="row-title">
                    {p.favourite && (
                      <span className="row-star">
                        <Icon name="starFilled" size={16} />
                      </span>
                    )}
                    {p.name}
                  </div>
                  <div className="muted">
                    {p.source === 'mealprep' && `${t('picker.mealPrep')} · `}
                    {fmt(p.lastGrams)} g · {Math.round(nutrientsFor(p, p.lastGrams).kcal)} kcal
                  </div>
                </button>
                {onQuickAdd && (
                  <Button variant="primary" size="small" layout="round" icon="plus" onClick={() => onQuickAdd(p)} aria-label={t('picker.add', { name: p.name })} />
                )}
              </div>
            )
            // In Recent, swiping a row left reveals "Remove". It only takes the food off this list.
            return list === 'recent' ? (
              <SwipeRow key={p.id} actionLabel={t('common.remove')} actionIcon="trash" onAction={() => removeFromRecents(p.id)}>
                {row}
              </SwipeRow>
            ) : (
              <div key={p.id}>{row}</div>
            )
          })}
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
                  ? t('picker.checkPhoto')
                  : t('picker.checkCarefully'),
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
            onPick(saved)
          }}
        />
      )}
    </>
  )
}

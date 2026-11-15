import { useState } from 'react'
import { saveProduct } from '../db'
import type { Product, ProductDraft } from '../types'
import { parseNumber } from '../utils'
import Sheet from './Sheet'

interface Props {
  draft: ProductDraft // values we already know (may be empty)
  note?: string // why the form is shown, e.g. "Barcode not found"
  photo?: string // a scanned label to show above the fields, so the values can be checked
  onScanLabel?: () => void // when given, a "Scan label" button is shown
  onClose: () => void
  onSaved: (product: Product) => void
}

// Turns an optional number into the text shown in an input.
const text = (value?: number) => (value === undefined ? '' : String(value))

// Form to create a custom product (all values per 100 g).
export default function ManualForm({ draft, note, photo, onScanLabel, onClose, onSaved }: Props) {
  const [name, setName] = useState(draft.name ?? '')
  const [kcal, setKcal] = useState(text(draft.kcal))
  const [protein, setProtein] = useState(text(draft.protein))
  const [carbs, setCarbs] = useState(text(draft.carbs))
  const [fat, setFat] = useState(text(draft.fat))

  const values = {
    kcal: parseNumber(kcal),
    protein: parseNumber(protein),
    carbs: parseNumber(carbs),
    fat: parseNumber(fat),
  }
  const valid =
    name.trim() !== '' &&
    values.kcal !== null &&
    values.protein !== null &&
    values.carbs !== null &&
    values.fat !== null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const product: Product = {
      // Keep the barcode as the id if we have one, so scanning it next time finds this product.
      id: draft.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      brand: draft.brand,
      imageUrl: draft.imageUrl,
      kcal: values.kcal!,
      protein: values.protein!,
      carbs: values.carbs!,
      fat: values.fat!,
      source: 'custom',
      favourite: false,
      lastUsed: Date.now(),
      lastGrams: 100,
    }
    await saveProduct(product)
    onSaved(product)
  }

  return (
    <Sheet title={photo ? 'Check the values' : 'Custom food'} onClose={onClose}>
      {note && <p className="note">{note}</p>}
      {onScanLabel && (
        <button className="button scan-label-button" type="button" onClick={onScanLabel}>
          Scan label
        </button>
      )}
      {photo && <img className="label-photo" src={photo} alt="The label that was read" />}
      <form onSubmit={save}>
        <label className="field">
          <span>Name</span>
          <input className={photo && !name.trim() ? 'input missing' : 'input'} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mum's lasagne" />
        </label>
        <div className="label">Per 100 g</div>
        <div className="field-grid">
          {/* After a label scan, fields that could not be read are highlighted. */}
          <NumberField label="Calories (kcal)" value={kcal} onChange={setKcal} highlight={!!photo && values.kcal === null} />
          <NumberField label="Protein (g)" value={protein} onChange={setProtein} highlight={!!photo && values.protein === null} />
          <NumberField label="Carbs (g)" value={carbs} onChange={setCarbs} highlight={!!photo && values.carbs === null} />
          <NumberField label="Fat (g)" value={fat} onChange={setFat} highlight={!!photo && values.fat === null} />
        </div>
        <button className="button big" type="submit" disabled={!valid}>
          Save and continue
        </button>
      </form>
    </Sheet>
  )
}

function NumberField(props: { label: string; value: string; onChange: (value: string) => void; highlight?: boolean }) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        className={props.highlight ? 'input missing' : 'input'}
        inputMode="decimal"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.highlight ? 'fill in' : '0'}
      />
    </label>
  )
}

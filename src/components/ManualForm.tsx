import { useState } from 'react'
import { saveProduct } from '../db'
import type { Product, ProductDraft } from '../types'
import { parseNumber } from '../utils'
import Button from './Button'
import Sheet from './Sheet'
import { t, inputNumber } from '../i18n'

interface Props {
  draft: ProductDraft // values we already know (may be empty)
  note?: string // why the form is shown, e.g. "Barcode not found"
  photo?: string // a scanned label to show above the fields, so the values can be checked
  onScanLabel?: () => void // when given, a "Scan label" button is shown
  onClose: () => void
  onSaved: (product: Product) => void
}

// Turns an optional number into the text shown in an input.
const text = (value?: number) => (value === undefined ? '' : inputNumber(value))

// An optional field: empty means "unknown" (undefined); otherwise it must be a number (null = invalid).
function optional(value: string): number | undefined | null {
  return value.trim() === '' ? undefined : parseNumber(value)
}

// Form to create a custom product (all values per 100 g).
// It is also the review screen after a label scan.
export default function ManualForm({ draft, note, photo, onScanLabel, onClose, onSaved }: Props) {
  const [name, setName] = useState(draft.name ?? '')
  const [kcal, setKcal] = useState(text(draft.kcal))
  const [protein, setProtein] = useState(text(draft.protein))
  const [carbs, setCarbs] = useState(text(draft.carbs))
  const [fat, setFat] = useState(text(draft.fat))
  const [fibre, setFibre] = useState(text(draft.fibre))
  const [sugar, setSugar] = useState(text(draft.sugar))
  const [salt, setSalt] = useState(text(draft.salt))

  const values = {
    kcal: parseNumber(kcal),
    protein: parseNumber(protein),
    carbs: parseNumber(carbs),
    fat: parseNumber(fat),
  }
  const extras = { fibre: optional(fibre), sugar: optional(sugar), salt: optional(salt) }
  const valid =
    name.trim() !== '' &&
    values.kcal !== null &&
    values.protein !== null &&
    values.carbs !== null &&
    values.fat !== null &&
    extras.fibre !== null &&
    extras.sugar !== null &&
    extras.salt !== null

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
      fibre: extras.fibre ?? undefined,
      sugar: extras.sugar ?? undefined,
      salt: extras.salt ?? undefined,
      source: 'custom',
      favourite: false,
      lastUsed: Date.now(),
      lastGrams: 100,
    }
    await saveProduct(product)
    onSaved(product)
  }

  // After a label scan, fields that could not be read are highlighted.
  const highlight = (missing: boolean) => !!photo && missing

  return (
    <Sheet title={photo ? t('manual.checkValues') : t('manual.custom')} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        {note && <p className="note">{note}</p>}
        {onScanLabel && (
          <Button variant="primary" block icon="camera" onClick={onScanLabel}>
            {t('manual.scanLabel')}
          </Button>
        )}
        {photo && <img className="label-photo" src={photo} alt={t('manual.photoAlt')} />}

        <label className="field">
          <span>{t('common.name')}</span>
          <input
            className={highlight(!name.trim()) ? 'input missing' : 'input'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('manual.namePlaceholder')}
          />
        </label>

        <div>
          <div className="label">{t('common.per100g')}</div>
          <div className="field-grid">
            <NumberField label={t('field.kcal')} value={kcal} onChange={setKcal} highlight={highlight(values.kcal === null)} />
            <NumberField label={t('field.protein')} value={protein} onChange={setProtein} highlight={highlight(values.protein === null)} />
            <NumberField label={t('field.carbs')} value={carbs} onChange={setCarbs} highlight={highlight(values.carbs === null)} />
            <NumberField label={t('field.fat')} value={fat} onChange={setFat} highlight={highlight(values.fat === null)} />
          </div>
        </div>

        <div>
          <div className="label">{t('manual.optional')}</div>
          <div className="field-grid three">
            <NumberField label={t('field.fibre')} value={fibre} onChange={setFibre} placeholder="–" />
            <NumberField label={t('field.sugar')} value={sugar} onChange={setSugar} placeholder="–" />
            <NumberField label={t('field.salt')} value={salt} onChange={setSalt} placeholder="–" />
          </div>
        </div>

        <Button variant={onScanLabel ? 'quiet' : 'primary'} block type="submit" disabled={!valid}>
          {t('manual.save')}
        </Button>
      </form>
    </Sheet>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  highlight?: boolean
  placeholder?: string
}

function NumberField({ label, value, onChange, highlight, placeholder = '0' }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className={highlight ? 'input missing' : 'input'}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={highlight ? t('manual.fillIn') : placeholder}
      />
    </label>
  )
}

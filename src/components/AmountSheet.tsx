import { useState } from 'react'
import type { Nutrients } from '../types'
import { fmt, nutrientsFor, parseNumber } from '../utils'
import Button from './Button'
import MacroTiles from './MacroTiles'
import Sheet from './Sheet'

interface Props {
  name: string
  per100g: Nutrients
  initialGrams: number
  actionLabel: string // the text on the button, e.g. "Add ingredient"
  onSave: (grams: number) => void
  onClose: () => void
}

const QUICK_GRAMS = [50, 100, 250, 500]

// Asks how many grams of something to use (an ingredient of a meal prep).
export default function AmountSheet({ name, per100g, initialGrams, actionLabel, onSave, onClose }: Props) {
  const [text, setText] = useState(fmt(initialGrams))
  const grams = parseNumber(text)
  const valid = grams !== null && grams > 0

  return (
    <Sheet title={name} onClose={onClose}>
      <div className="label">Amount</div>
      <div className="input-row">
        <input
          className="input number amount-input"
          inputMode="decimal"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label="Grams"
        />
        <span className="muted">grams</span>
      </div>
      <div className="quick-row">
        {QUICK_GRAMS.map((g) => (
          <Button key={g} size="small" variant={grams === g ? 'primary' : 'quiet'} onClick={() => setText(String(g))}>
            {g} g
          </Button>
        ))}
      </div>

      <div className="label">This amount</div>
      <MacroTiles {...nutrientsFor(per100g, valid ? grams : 0)} />

      <div className="sheet-actions">
        <Button variant="primary" block disabled={!valid} onClick={() => valid && onSave(grams)}>
          {actionLabel}
        </Button>
      </div>
    </Sheet>
  )
}

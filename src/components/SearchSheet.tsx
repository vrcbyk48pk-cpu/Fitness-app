import { useState } from 'react'
import { type LookupResult, saveDraft, searchProducts, searchSaved } from '../api'
import type { Product, ProductDraft } from '../types'
import Button from './Button'
import Icon from './Icon'
import Sheet from './Sheet'

interface Props {
  onClose: () => void
  onResult: (result: LookupResult) => void // called when a search result is tapped
}

// Search by product name: first your own saved products, then Open Food Facts.
export default function SearchSheet({ onClose, onResult }: Props) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [saved, setSaved] = useState<Product[]>([])
  const [online, setOnline] = useState<ProductDraft[]>([])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setStatus('loading')
    // Saved products are found instantly, also without internet.
    const savedResults = await searchSaved(q)
    setSaved(savedResults)
    try {
      const results = await searchProducts(q)
      // Don't show a product twice if it is already in the saved list.
      const savedIds = new Set(savedResults.map((p) => p.id))
      setOnline(results.filter((r) => !savedIds.has(r.id!)))
      setStatus('done')
    } catch {
      setOnline([])
      setStatus('error')
    }
  }

  return (
    <Sheet title="Search" onClose={onClose}>
      <form className="input-row" onSubmit={search}>
        <input
          className="input"
          type="search"
          enterKeyHint="search"
          autoFocus
          placeholder="e.g. pindakaas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="primary" layout="round" icon="search" type="submit" disabled={status === 'loading'} aria-label="Search" />
      </form>

      <div className="search-results">
        {status === 'loading' && <p className="empty">Searching…</p>}

        {saved.length > 0 && <div className="label">Your foods</div>}
        {saved.map((p) => (
          <ResultRow key={p.id} item={p} onClick={() => onResult({ status: 'found', product: p })} />
        ))}

        {online.length > 0 && <div className="label">Open Food Facts</div>}
        {online.map((draft) => (
          <ResultRow key={draft.id} item={draft} onClick={async () => onResult(await saveDraft(draft))} />
        ))}

        {status === 'error' && (
          <p className="note">Could not reach Open Food Facts. Check your connection and try again.</p>
        )}
        {status === 'done' && saved.length + online.length === 0 && (
          <p className="empty">Nothing found. Try another word, or enter the food manually.</p>
        )}
      </div>
    </Sheet>
  )
}

function ResultRow({ item, onClick }: { item: ProductDraft; onClick: () => void }) {
  return (
    <button className="row plain" onClick={onClick}>
      {item.imageUrl ? (
        <img className="thumb" src={item.imageUrl} alt="" loading="lazy" />
      ) : (
        <div className="thumb placeholder">
          <Icon name="food" />
        </div>
      )}
      <div className="row-main">
        <div className="row-title">{item.name}</div>
        <div className="muted">{item.brand ?? 'No brand'}</div>
      </div>
      <div className="result-kcal">
        {item.kcal === undefined ? (
          <span className="muted">no kcal</span>
        ) : (
          <>
            <b>{Math.round(item.kcal)}</b>
            <span className="muted">kcal/100g</span>
          </>
        )}
      </div>
    </button>
  )
}

import { useEffect, useRef, useState } from 'react'
import { exportBackup, importBackup } from '../backup'
import { getTargets, saveTargets } from '../db'
import type { Targets } from '../types'
import { parseNumber } from '../utils'

// The four target fields, in display order.
const FIELDS: { key: keyof Targets; label: string; unit: string; color: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', color: 'var(--mint)' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'var(--protein)' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: 'var(--carbs)' },
  { key: 'fat', label: 'Fat', unit: 'g', color: 'var(--fat)' },
]

export default function SettingsScreen() {
  // Kept as text while typing; saved to the database whenever all four are valid numbers.
  const [texts, setTexts] = useState<Record<keyof Targets, string> | null>(null)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function loadTargets() {
    const t = await getTargets()
    setTexts({ kcal: String(t.kcal), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat) })
  }

  useEffect(() => {
    loadTargets()
  }, [])

  function change(key: keyof Targets, value: string) {
    if (!texts) return
    const next = { ...texts, [key]: value }
    setTexts(next)
    const kcal = parseNumber(next.kcal)
    const protein = parseNumber(next.protein)
    const carbs = parseNumber(next.carbs)
    const fat = parseNumber(next.fat)
    if (kcal !== null && protein !== null && carbs !== null && fat !== null) {
      saveTargets({ kcal, protein, carbs, fat })
    }
  }

  async function handleExport() {
    try {
      await exportBackup()
    } catch {
      setMessage('Export failed.')
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    if (!confirm('Importing replaces ALL data in the app with the backup. Continue?')) return
    try {
      const count = await importBackup(file)
      await loadTargets()
      setMessage(`Backup restored: ${count} entries.`)
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <h3 className="section-title">Daily targets</h3>
      <section className="card glass">
        {texts &&
          FIELDS.map((f) => (
            <label className="setting-row" key={f.key}>
              <span className="macro-label">
                <span className="dot" style={{ background: f.color }} />
                {f.label}
              </span>
              <span className="setting-input">
                <input
                  className="input"
                  inputMode="decimal"
                  value={texts[f.key]}
                  onChange={(e) => change(f.key, e.target.value)}
                />
                <span className="muted">{f.unit}</span>
              </span>
            </label>
          ))}
      </section>

      <h3 className="section-title">Backup</h3>
      <section className="card glass">
        <p className="muted">
          Your data lives only on this phone. Export a backup now and then, and keep the file somewhere safe
          (for example in iCloud Drive).
        </p>
        <button className="button" onClick={handleExport}>
          Export backup
        </button>
        <button className="button secondary" onClick={() => fileInput.current?.click()}>
          Import backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            handleImport(e.target.files?.[0])
            e.target.value = '' // allows picking the same file again
          }}
        />
        {message && <p className="note">{message}</p>}
      </section>
    </>
  )
}

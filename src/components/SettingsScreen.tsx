import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { exportBackup, importBackup } from '../backup'
import { ACTIVITY_OPTIONS, DISCLAIMER, GOAL_OPTIONS } from '../calculator'
import { getProfile, getTargets, saveTargets } from '../db'
import type { Targets } from '../types'
import { parseNumber } from '../utils'
import Button from './Button'
import GoalSheet from './GoalSheet'

// The four target fields, in display order.
const FIELDS: { key: keyof Targets; label: string; unit: string; color: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', color: 'var(--accent)' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'var(--protein)' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: 'var(--carbs)' },
  { key: 'fat', label: 'Fat', unit: 'g', color: 'var(--fat)' },
]

interface Props {
  onEditProfile: () => void // opens the onboarding questions again
}

export default function SettingsScreen({ onEditProfile }: Props) {
  const profile = useLiveQuery(getProfile)
  // Kept as text while typing; saved to the database whenever all four are valid numbers.
  const [texts, setTexts] = useState<Record<keyof Targets, string> | null>(null)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const [editingGoal, setEditingGoal] = useState(false) // the target weight sheet

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
        <h1 className="page-title">Settings</h1>
      </header>

      <h2 className="section-title">My profile</h2>
      <section className="card glass">
        {profile ? (
          <div className="profile-list">
            <span className="muted">Goal</span>
            <b>{GOAL_OPTIONS.find((o) => o.value === profile.goal)?.label}</b>
            <span className="muted">Sex</span>
            <b>{profile.sex === 'male' ? 'Male' : 'Female'}</b>
            <span className="muted">Age</span>
            <b>{profile.age}</b>
            <span className="muted">Height</span>
            <b>{profile.heightCm} cm</b>
            <span className="muted">Weight</span>
            <b>{profile.weightKg} kg</b>
            {profile.goal !== 'maintain' && (
              <>
                <span className="muted">Target weight</span>
                <b>{profile.targetWeightKg !== undefined ? `${profile.targetWeightKg} kg` : 'Not set'}</b>
              </>
            )}
            {profile.pace !== undefined && (
              <>
                <span className="muted">Pace</span>
                <b>{profile.pace} kg per week</b>
              </>
            )}
            <span className="muted">Activity</span>
            <b>{ACTIVITY_OPTIONS.find((o) => o.value === profile.activity)?.label}</b>
          </div>
        ) : (
          <p className="muted">Answer six short questions and get a suggested calorie and macro goal.</p>
        )}
        <Button variant="primary" block icon="user" onClick={onEditProfile}>
          {profile ? 'Edit profile' : 'Set up my profile'}
        </Button>
        {profile && profile.goal !== 'maintain' && (
          <Button block onClick={() => setEditingGoal(true)}>
            Change target weight
          </Button>
        )}
      </section>

      <h2 className="section-title">Daily targets</h2>
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
        <p className="muted">{DISCLAIMER}</p>
      </section>

      <h2 className="section-title">Backup</h2>
      <section className="card glass">
        <p className="muted">
          Your data lives only on this phone. Export a backup now and then, and keep the file somewhere safe (for
          example in iCloud Drive).
        </p>
        <Button variant="primary" block onClick={handleExport}>
          Export backup
        </Button>
        <Button block onClick={() => fileInput.current?.click()}>
          Import backup
        </Button>
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

      {editingGoal && profile && <GoalSheet profile={profile} onClose={() => setEditingGoal(false)} />}
    </>
  )
}

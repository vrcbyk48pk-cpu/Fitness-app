import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { backUpNow, mergeBackup, replaceWithBackup } from '../backup'
import { type BackupData, lastBackupText, readBackup } from '../backupData'
import { ACTIVITY_OPTIONS, DISCLAIMER, GOAL_OPTIONS } from '../calculator'
import { getLastBackup, getProfile, getTargets, saveTargets } from '../db'
import type { Targets } from '../types'
import { parseNumber } from '../utils'
import Button from './Button'
import GoalSheet from './GoalSheet'
import Sheet from './Sheet'

// The four target fields, in display order.
const FIELDS: { key: keyof Targets; label: string; unit: string; color: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', color: 'var(--accent)' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'var(--protein)' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: 'var(--carbs)' },
  { key: 'fat', label: 'Fat', unit: 'g', color: 'var(--fat)' },
  { key: 'fibre', label: 'Fibre', unit: 'g', color: 'var(--fibre)' },
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

  // Backups
  const lastBackup = useLiveQuery(async () => ({ at: await getLastBackup() }))
  const [pending, setPending] = useState<BackupData | null>(null) // a backup file that was read, waiting for a choice
  const [storageProtected, setStorageProtected] = useState<boolean | null>(null)

  async function loadTargets() {
    const t = await getTargets()
    setTexts({ kcal: String(t.kcal), protein: String(t.protein), carbs: String(t.carbs), fat: String(t.fat), fibre: String(t.fibre) })
  }

  useEffect(() => {
    loadTargets()
    // Ask the browser to keep our data even when the phone runs low on space,
    // and remember the answer to show it below.
    navigator.storage?.persist?.().then(setStorageProtected, () => setStorageProtected(false))
  }, [])

  function change(key: keyof Targets, value: string) {
    if (!texts) return
    const next = { ...texts, [key]: value }
    setTexts(next)
    const numbers = FIELDS.map((f) => parseNumber(next[f.key]))
    if (numbers.every((n) => n !== null)) {
      saveTargets(Object.fromEntries(FIELDS.map((f, i) => [f.key, numbers[i]])))
    }
  }

  async function handleBackup() {
    try {
      if (await backUpNow()) setMessage('Backup saved.')
    } catch {
      setMessage('The backup could not be saved.')
    }
  }

  // Step 1 of importing: read and check the file. The choice between merge and replace comes next.
  async function handleFile(file: File | undefined) {
    if (!file) return
    try {
      setPending(readBackup(await file.text()))
      setMessage('')
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  // Step 2: do what was chosen.
  async function finishImport(mode: 'merge' | 'replace') {
    if (!pending) return
    try {
      if (mode === 'merge') {
        const { added, skipped } = await mergeBackup(pending)
        setMessage(`Merged: ${added} added, ${skipped} already here.`)
      } else {
        await replaceWithBackup(pending)
        setMessage(`Backup restored: ${pending.entries.length} entries.`)
      }
      await loadTargets()
    } catch {
      setMessage('The import failed. Nothing was changed.')
    }
    setPending(null)
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
            Change target and pace
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
        <div className="profile-list">
          <span className="muted">Last backup</span>
          <b>{lastBackup ? lastBackupText(lastBackup.at, Date.now()) : ''}</b>
          <span className="muted">Storage</span>
          <b>{storageProtected === null ? 'checking…' : storageProtected ? 'Protected' : 'Not protected'}</b>
        </div>
        <p className="muted">
          {storageProtected === false
            ? 'Your data lives only on this phone, and iOS may clear it if the app is not used for a long time. Back up regularly, and keep the file in iCloud Drive.'
            : 'Your data lives only on this phone. Back up now and then, and keep the file in iCloud Drive.'}
        </p>
        <Button variant="primary" block icon="share" onClick={handleBackup}>
          Back up now
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
            handleFile(e.target.files?.[0])
            e.target.value = '' // allows picking the same file again
          }}
        />
        {message && <p className="note">{message}</p>}
      </section>

      {pending && (
        <Sheet title="Import backup" onClose={() => setPending(null)}>
          <p className="muted">
            This backup
            {pending.exportedAt && ` from ${new Date(pending.exportedAt).toLocaleDateString()}`} holds {pending.entries.length}{' '}
            entries, {pending.products.length} foods, {pending.mealPreps.length} meal preps, {pending.savedMeals.length} saved
            meals and {pending.weights.length} weigh-ins.
          </p>
          <div className="sheet-actions">
            <Button variant="primary" block onClick={() => finishImport('merge')}>
              Merge with what is here
            </Button>
            <p className="muted">Adds what is missing and skips duplicates. Nothing on this phone is changed.</p>
            <Button variant="danger" block onClick={() => finishImport('replace')}>
              Replace everything
            </Button>
            <p className="muted">Deletes all data on this phone and puts the backup in its place.</p>
            <Button block onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}

      {editingGoal && profile && (
        <GoalSheet
          profile={profile}
          onClose={() => {
            setEditingGoal(false)
            loadTargets() // saving the sheet changes the targets shown above
          }}
        />
      )}
    </>
  )
}

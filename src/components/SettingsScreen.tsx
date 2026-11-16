import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { type Appearance, chooseAppearance } from '../appearance'
import { backUpNow, mergeBackup, replaceWithBackup } from '../backup'
import { type BackupData, lastBackupText, readBackup } from '../backupData'
import { activityOptions, goalOptions } from '../calculator'
import { clearRecents, getLastBackup, getProfile, getTargets, saveTargets } from '../db'
import { LANGUAGES, locale, num, t } from '../i18n'
import { THEME_IDS, themeVariables } from '../themes'
import type { Targets } from '../types'
import { fmt, parseNumber } from '../utils'
import Button from './Button'
import Choices from './Choices'
import GoalSheet from './GoalSheet'
import Segmented from './Segmented'
import Sheet from './Sheet'

// The five target fields, in display order.
const FIELDS: { key: keyof Targets; labelKey: string; unit: string; color: string }[] = [
  { key: 'kcal', labelKey: 'nutrient.calories', unit: 'kcal', color: 'var(--accent)' },
  { key: 'protein', labelKey: 'nutrient.protein', unit: 'g', color: 'var(--protein)' },
  { key: 'carbs', labelKey: 'nutrient.carbs', unit: 'g', color: 'var(--carbs)' },
  { key: 'fat', labelKey: 'nutrient.fat', unit: 'g', color: 'var(--fat)' },
  { key: 'fibre', labelKey: 'nutrient.fibre', unit: 'g', color: 'var(--fibre)' },
]

interface Props {
  appearance: Appearance
  onAppearance: (appearance: Appearance) => void // language or theme was changed
  onEditProfile: () => void // opens the onboarding questions again
}

export default function SettingsScreen({ appearance, onAppearance, onEditProfile }: Props) {
  const profile = useLiveQuery(getProfile)
  // Kept as text while typing; saved to the database whenever all are valid numbers.
  const [texts, setTexts] = useState<Record<keyof Targets, string> | null>(null)
  const [message, setMessage] = useState('')
  const [recentsMessage, setRecentsMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const [editingGoal, setEditingGoal] = useState(false) // the target and pace sheet

  // Backups
  const lastBackup = useLiveQuery(async () => ({ at: await getLastBackup() }))
  const [pending, setPending] = useState<BackupData | null>(null) // a backup file that was read, waiting for a choice
  const [storageProtected, setStorageProtected] = useState<boolean | null>(null)

  async function loadTargets() {
    const targets = await getTargets()
    setTexts({
      kcal: String(targets.kcal),
      protein: String(targets.protein),
      carbs: String(targets.carbs),
      fat: String(targets.fat),
      fibre: String(targets.fibre),
    })
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

  // Applies and saves a new language or theme, and lets the app redraw.
  async function setAppearance(next: Appearance) {
    await chooseAppearance(next)
    onAppearance(next)
  }

  async function handleBackup() {
    try {
      if (await backUpNow()) setMessage(t('settings.backupSaved'))
    } catch {
      setMessage(t('settings.backupFailed'))
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
        setMessage(t('settings.merged', { added: num(added), skipped: num(skipped) }))
      } else {
        await replaceWithBackup(pending)
        setMessage(t('settings.restored', { count: num(pending.entries.length) }))
      }
      await loadTargets()
    } catch {
      setMessage(t('settings.importFailed'))
    }
    setPending(null)
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">{t('settings.title')}</h1>
      </header>

      <h2 className="section-title">{t('settings.appearance')}</h2>
      <section className="card surface">
        <div>
          <div className="label">{t('settings.language')}</div>
          <Segmented
            options={LANGUAGES}
            value={appearance.language}
            onChange={(language) => setAppearance({ ...appearance, language })}
            inset
          />
        </div>
      </section>
      <div className="label">{t('settings.theme')}</div>
      <Choices
        // Each theme's swatch is drawn in that theme's own colours.
        options={THEME_IDS.map((id) => ({
          value: id,
          label: t(`theme.${id}`),
          lead: <span className="swatch" style={themeVariables(id) as React.CSSProperties} />,
        }))}
        value={appearance.theme}
        onChange={(theme) => setAppearance({ ...appearance, theme })}
      />

      <h2 className="section-title">{t('settings.profile')}</h2>
      <section className="card surface">
        {profile ? (
          <div className="profile-list">
            <span className="muted">{t('profile.goal')}</span>
            <b>{goalOptions().find((o) => o.value === profile.goal)?.label}</b>
            <span className="muted">{t('profile.sex')}</span>
            <b>{t(`sex.${profile.sex}`)}</b>
            <span className="muted">{t('profile.age')}</span>
            <b>{profile.age}</b>
            <span className="muted">{t('profile.height')}</span>
            <b>{profile.heightCm} cm</b>
            <span className="muted">{t('profile.weight')}</span>
            <b>{fmt(profile.weightKg)} kg</b>
            {profile.goal !== 'maintain' && (
              <>
                <span className="muted">{t('profile.target')}</span>
                <b>{profile.targetWeightKg !== undefined ? `${fmt(profile.targetWeightKg)} kg` : t('profile.notSet')}</b>
              </>
            )}
            {profile.pace !== undefined && (
              <>
                <span className="muted">{t('profile.pace')}</span>
                <b>{t('profile.paceValue', { pace: num(profile.pace, 2) })}</b>
              </>
            )}
            <span className="muted">{t('profile.activity')}</span>
            <b>{activityOptions().find((o) => o.value === profile.activity)?.label}</b>
          </div>
        ) : (
          <p className="muted">{t('settings.profileIntro')}</p>
        )}
        <Button variant="primary" block icon="user" onClick={onEditProfile}>
          {profile ? t('settings.editProfile') : t('settings.setupProfile')}
        </Button>
        {profile && profile.goal !== 'maintain' && (
          <Button block onClick={() => setEditingGoal(true)}>
            {t('settings.changeGoal')}
          </Button>
        )}
      </section>

      <h2 className="section-title">{t('settings.targets')}</h2>
      <section className="card surface">
        {texts &&
          FIELDS.map((f) => (
            <label className="setting-row" key={f.key}>
              <span className="macro-label">
                <span className="dot" style={{ background: f.color }} />
                {t(f.labelKey)}
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
        <p className="muted">{t('disclaimer')}</p>
      </section>

      <h2 className="section-title">{t('settings.recents')}</h2>
      <section className="card surface">
        <p className="muted">{t('settings.recentsHint')}</p>
        <Button
          block
          icon="trash"
          onClick={async () => {
            await clearRecents()
            setRecentsMessage(t('settings.recentsCleared'))
          }}
        >
          {t('settings.clearRecents')}
        </Button>
        {recentsMessage && <p className="note">{recentsMessage}</p>}
      </section>

      <h2 className="section-title">{t('settings.backup')}</h2>
      <section className="card surface">
        <div className="profile-list">
          <span className="muted">{t('settings.lastBackup')}</span>
          <b>{lastBackup ? lastBackupText(lastBackup.at, Date.now()) : ''}</b>
          <span className="muted">{t('settings.storage')}</span>
          <b>
            {storageProtected === null
              ? t('settings.checking')
              : storageProtected
                ? t('settings.protected')
                : t('settings.notProtected')}
          </b>
        </div>
        <p className="muted">{storageProtected === false ? t('settings.backupTextUnprotected') : t('settings.backupText')}</p>
        <Button variant="primary" block icon="share" onClick={handleBackup}>
          {t('settings.backUpNow')}
        </Button>
        <Button block onClick={() => fileInput.current?.click()}>
          {t('settings.import')}
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
        <Sheet title={t('settings.import')} onClose={() => setPending(null)}>
          <p className="muted">
            {t('import.summary', {
              from: pending.exportedAt
                ? t('import.from', { date: new Date(pending.exportedAt).toLocaleDateString(locale()) })
                : '',
              entries: num(pending.entries.length),
              foods: num(pending.products.length),
              preps: num(pending.mealPreps.length),
              meals: num(pending.savedMeals.length),
              weights: num(pending.weights.length),
            })}
          </p>
          <div className="sheet-actions">
            <Button variant="primary" block onClick={() => finishImport('merge')}>
              {t('import.merge')}
            </Button>
            <p className="muted">{t('import.mergeHint')}</p>
            <Button variant="danger" block onClick={() => finishImport('replace')}>
              {t('import.replace')}
            </Button>
            <p className="muted">{t('import.replaceHint')}</p>
            <Button block onClick={() => setPending(null)}>
              {t('common.cancel')}
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

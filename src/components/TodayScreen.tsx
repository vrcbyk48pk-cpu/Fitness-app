import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { copyMealFromDayBefore, db, DEFAULT_TARGETS, entriesForMeal, getTargets } from '../db'
import type { Entry, Meal } from '../types'
import { fmt, formatDay, mealLabel, MEALS, shiftDay, sumExtra, sumMacros, todayKey } from '../utils'
import BackupBanner from './BackupBanner'
import Button from './Button'
import CalorieRing from './CalorieRing'
import DayDetails from './DayDetails'
import EnergyBar from './EnergyBar'
import EntrySheet from './EntrySheet'
import MacroBar from './MacroBar'
import { SaveMealSheet } from './SavedMeals'
import { t, tn, num } from '../i18n'

interface Props {
  date: string
  setDate: (date: string) => void
  onAddTo: (meal: Meal) => void // open the Add tab with this meal selected
  onToast: (message: string) => void
}

export default function TodayScreen({ date, setDate, onAddTo, onToast }: Props) {
  // useLiveQuery re-runs automatically whenever the data in the database changes.
  const entries = useLiveQuery(() => db.entries.where('date').equals(date).toArray(), [date]) ?? []
  const targets = useLiveQuery(getTargets) ?? DEFAULT_TARGETS
  const [editing, setEditing] = useState<Entry | null>(null)
  const [savingMeal, setSavingMeal] = useState<Meal | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const total = sumMacros(entries)
  // Fibre is not known for every food: count what is known, and say how many are missing.
  const fibre = sumExtra(entries, 'fibre')
  const isToday = date === todayKey()
  // "Today" and "Yesterday" are short; a written-out date gets a smaller title.
  const isRecent = isToday || date === shiftDay(todayKey(), -1)
  const left = Math.round(targets.kcal - total.kcal)
  const entriesOf = (meal: Meal) => entries.filter((e) => e.meal === meal)

  return (
    <>
      <header className="page-head">
        {/* Tapping the title jumps back to today. */}
        <button className={isRecent ? 'page-title' : 'page-title long'} onClick={() => setDate(todayKey())}>
          {formatDay(date)}
        </button>
        <div className="head-actions">
          <Button variant="soft" layout="round" icon="back" onClick={() => setDate(shiftDay(date, -1))} aria-label={t('today.previousDay')} />
          <Button
            variant="soft"
            layout="round"
            icon="forward"
            onClick={() => setDate(shiftDay(date, 1))}
            disabled={isToday}
            aria-label={t('today.nextDay')}
          />
        </div>
      </header>

      <BackupBanner />

      {/* A sentence about the day. Only some themes show it. */}
      <p className="headline">
        {left > 0
          ? t('today.headline.left', { count: num(left) })
          : left < 0
            ? t('today.headline.over', { count: num(-left) })
            : t('today.headline.done')}
      </p>

      <section className="card surface">
        {/* Themes choose between the ring and the energy bar; both show the same numbers. */}
        <CalorieRing eaten={total.kcal} target={targets.kcal} />
        <EnergyBar eaten={total.kcal} target={targets.kcal} />
        <MacroBar label={t('nutrient.protein')} eaten={total.protein} target={targets.protein} color="var(--protein)" />
        <MacroBar label={t('nutrient.carbs')} eaten={total.carbs} target={targets.carbs} color="var(--carbs)" />
        <MacroBar label={t('nutrient.fat')} eaten={total.fat} target={targets.fat} color="var(--fat)" />
        <MacroBar
          label={t('nutrient.fibre')}
          eaten={fibre.total}
          target={targets.fibre}
          color="var(--fibre)"
          note={fibre.unknown > 0 ? t('today.unknownFor', { unknown: fibre.unknown, total: entries.length }) : undefined}
        />
        <Button block size="small" icon="info" onClick={() => setShowDetails(true)}>
          {t('today.dayDetails')}
        </Button>
      </section>

      {MEALS.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          date={date}
          entries={entriesOf(meal)}
          onAdd={() => onAddTo(meal)}
          onEdit={setEditing}
          onSave={() => setSavingMeal(meal)}
          onToast={onToast}
        />
      ))}

      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}

      {showDetails && <DayDetails entries={entries} targets={targets} onClose={() => setShowDetails(false)} />}

      {savingMeal && (
        <SaveMealSheet
          entries={entriesOf(savingMeal)}
          defaultName={t('today.myUsual', { meal: mealLabel(savingMeal).toLowerCase() })}
          onClose={() => setSavingMeal(null)}
          onSaved={(message) => {
            setSavingMeal(null)
            onToast(message)
          }}
        />
      )}
    </>
  )
}

interface SectionProps {
  meal: Meal
  date: string
  entries: Entry[]
  onAdd: () => void
  onEdit: (entry: Entry) => void
  onSave: () => void
  onToast: (message: string) => void
}

// One meal: a header with the subtotal, then its entries.
function MealSection({ meal, date, entries, onAdd, onEdit, onSave, onToast }: SectionProps) {
  const label = mealLabel(meal)
  // How many foods this meal had the day before (to offer "Copy yesterday's ...").
  const dayBeforeCount =
    useLiveQuery(() => entriesForMeal(shiftDay(date, -1), meal).then((list) => list.length), [date, meal]) ?? 0

  async function copy() {
    const count = await copyMealFromDayBefore(date, meal)
    onToast(tn('today.copied', count, { meal: label.toLowerCase() }))
  }

  return (
    <section className="meal">
      <div className="meal-head">
        <h2 className="meal-title">{label}</h2>
        <span className="muted meal-total">{num(sumMacros(entries).kcal)} kcal</span>
        {entries.length > 0 && (
          <Button variant="soft" size="small" icon="bookmark" onClick={onSave}>
            {t('today.saveMeal')}
          </Button>
        )}
        <Button variant="primary" size="small" layout="round" icon="plus" onClick={onAdd} aria-label={t('today.addTo', { meal: label })} />
      </div>

      {entries.length === 0 && dayBeforeCount > 0 && (
        <Button variant="soft" size="small" icon="copy" className="meal-copy" onClick={copy}>
          {t(date === todayKey() ? 'today.copyYesterday' : 'today.copyPrevious', { meal: label.toLowerCase() })}
        </Button>
      )}

      {entries.map((entry) => (
        <button className="row surface" key={entry.id} onClick={() => onEdit(entry)}>
          <div className="row-main">
            <div className="row-title">{entry.name}</div>
            <div className="muted">
              {entry.portions !== undefined && `${tn('amount.portions', entry.portions)} · `}
              {fmt(entry.grams)} g
            </div>
          </div>
          <div className="row-value">
            {num(entry.kcal)} <span className="muted">kcal</span>
          </div>
        </button>
      ))}
    </section>
  )
}

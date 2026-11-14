import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_TARGETS, deleteEntry, getTargets } from '../db'
import type { Entry } from '../types'
import { fmt, formatDay, shiftDay, sumMacros, todayKey } from '../utils'
import CalorieRing from './CalorieRing'
import MacroBar from './MacroBar'

interface Props {
  date: string
  setDate: (date: string) => void
}

export default function TodayScreen({ date, setDate }: Props) {
  // useLiveQuery re-runs automatically whenever the data in the database changes.
  const entries = useLiveQuery(() => db.entries.where('date').equals(date).toArray(), [date]) ?? []
  const targets = useLiveQuery(getTargets) ?? DEFAULT_TARGETS
  const total = sumMacros(entries)
  const isToday = date === todayKey()

  return (
    <>
      <header className="day-nav">
        <button className="icon-button glass" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <button className="day-title" onClick={() => setDate(todayKey())}>
          {formatDay(date)}
        </button>
        <button
          className="icon-button glass"
          onClick={() => setDate(shiftDay(date, 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          ›
        </button>
      </header>

      <section className="card glass">
        <CalorieRing eaten={total.kcal} target={targets.kcal} />
        <MacroBar label="Protein" eaten={total.protein} target={targets.protein} color="var(--protein)" />
        <MacroBar label="Carbs" eaten={total.carbs} target={targets.carbs} color="var(--carbs)" />
        <MacroBar label="Fat" eaten={total.fat} target={targets.fat} color="var(--fat)" />
      </section>

      <h3 className="section-title">Eaten</h3>
      {entries.length === 0 && (
        <p className="empty">Nothing logged {isToday ? 'yet' : 'on this day'}. Use the Add tab to log food.</p>
      )}
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </>
  )
}

// One logged food. Swipe left (or tap) to reveal the Delete button.
function EntryRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)

  return (
    <div className="entry-wrap">
      <button
        className={open ? 'entry-delete visible' : 'entry-delete'}
        onClick={() => deleteEntry(entry.id!)}
        tabIndex={open ? 0 : -1}
      >
        Delete
      </button>
      <div
        className={open ? 'entry glass open' : 'entry glass'}
        onClick={() => setOpen(!open)}
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const moved = e.changedTouches[0].clientX - touchStartX
          if (moved < -40) setOpen(true)
          if (moved > 40) setOpen(false)
        }}
      >
        <div className="entry-main">
          <div className="entry-name">{entry.name}</div>
          <div className="muted">{fmt(entry.grams)} g</div>
        </div>
        <div className="entry-kcal">
          {Math.round(entry.kcal)} <span className="muted">kcal</span>
        </div>
      </div>
    </div>
  )
}

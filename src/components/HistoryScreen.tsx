import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_TARGETS, getTargets, proteinStreak } from '../db'
import type { Macros } from '../types'
import { dayList, daysInMonth, fmt, keyToDate, shiftDay, startOfMonth, startOfWeek, sumMacros, todayKey } from '../utils'
import BarChart from './BarChart'
import Button from './Button'
import GoalProgress from './GoalProgress'
import MacroTiles from './MacroTiles'
import Segmented from './Segmented'
import WeightCard from './WeightCard'
import { t, tn, num, locale } from '../i18n'

type Mode = 'week' | 'month'

// A function, so the labels are in the language that is active when the screen is drawn.
const modes = (): { value: Mode; label: string }[] => [
  { value: 'week', label: t('history.week') },
  { value: 'month', label: t('history.month') },
]

interface Props {
  onOpenDay: (day: string) => void
}

export default function HistoryScreen({ onOpenDay }: Props) {
  const [mode, setMode] = useState<Mode>('week')
  // Any day inside the period that is shown. Starts at the current week/month.
  const [anchor, setAnchor] = useState(todayKey())

  // The days of the selected week (Monday to Sunday) or month.
  const from = mode === 'week' ? startOfWeek(anchor) : startOfMonth(anchor)
  const days = dayList(from, mode === 'week' ? 7 : daysInMonth(from))
  const to = days[days.length - 1]

  const targets = useLiveQuery(getTargets) ?? DEFAULT_TARGETS
  const entries = useLiveQuery(() => db.entries.where('date').between(from, to, true, true).toArray(), [from, to]) ?? []
  const streak = useLiveQuery(() => proteinStreak(targets.protein), [targets.protein]) ?? 0

  // Add up the entries per day.
  const totals = new Map<string, Macros>()
  for (const day of days) {
    const ofDay = entries.filter((e) => e.date === day)
    if (ofDay.length > 0) totals.set(day, sumMacros(ofDay))
  }
  const kcalByDay = new Map([...totals].map(([day, total]) => [day, total.kcal]))

  // Averages only count days on which something was logged.
  const logged = totals.size
  const sum = sumMacros([...totals.values()])
  const average = (value: number) => (logged > 0 ? value / logged : 0)

  const title =
    mode === 'week'
      ? `${shortDate(from)} – ${shortDate(to)}`
      : keyToDate(from).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">{t('history.title')}</h1>
      </header>

      <Segmented options={modes()} value={mode} onChange={setMode} />

      <section className="card surface" style={{ marginTop: 'var(--space-3)' }}>
        <div className="period-nav">
          <Button layout="round" size="small" icon="back" onClick={() => setAnchor(shiftDay(from, -1))} aria-label={t('history.prev')} />
          <button className="period-title" onClick={() => setAnchor(todayKey())}>
            {title}
          </button>
          <Button
            layout="round"
            size="small"
            icon="forward"
            onClick={() => setAnchor(shiftDay(to, 1))}
            disabled={to >= todayKey()}
            aria-label={t('history.next')}
          />
        </div>

        {/* key = restart the grow animation when the period changes */}
        <BarChart key={from + mode} days={days} kcalByDay={kcalByDay} target={targets.kcal} onSelect={onOpenDay} />

        <div>
          <div className="label">{t('history.dailyAverage')}</div>
          <MacroTiles
            kcal={average(sum.kcal)}
            protein={average(sum.protein)}
            carbs={average(sum.carbs)}
            fat={average(sum.fat)}
          />
          <p className="muted chart-note">
            {logged === 0
              ? t('history.nothing')
              : tn('history.over', logged)}
          </p>
        </div>
      </section>

      <section className="card surface streak">
        <div className="streak-number">{num(streak)}</div>
        <div>
          <div className="streak-title">{t('history.streak')}</div>
          <div className="muted">
            {tn('history.streakText', streak, { target: fmt(targets.protein) })}
          </div>
        </div>
      </section>

      <GoalProgress />
      <WeightCard />
    </>
  )
}

// e.g. "9 Nov"
function shortDate(key: string): string {
  return keyToDate(key).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
}

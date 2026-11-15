import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteWeight, saveWeight } from '../db'
import type { WeightEntry } from '../types'
import { formatDay, keyToDate, parseNumber, shiftDay, todayKey } from '../utils'

const DAYS_SHOWN = 90

// Size of the drawing, in SVG units. The SVG scales to the width of the card.
const W = 320
const H = 150
const PAD = { top: 12, right: 8, bottom: 12, left: 34 }

interface Point {
  x: number
  y: number
}

// The average of all weigh-ins in the 7 days ending on "date".
function sevenDayAverage(weights: WeightEntry[], date: string): number {
  const start = shiftDay(date, -6)
  const window = weights.filter((w) => w.date >= start && w.date <= date)
  return window.reduce((sum, w) => sum + w.kg, 0) / window.length
}

// Draws a smooth curve through the points (a Catmull-Rom spline written as SVG bezier curves).
// For each segment, the control points lean in the direction of the neighbouring points.
function smoothPath(points: Point[]): string {
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const before = points[i - 1] ?? points[i]
    const start = points[i]
    const end = points[i + 1]
    const after = points[i + 2] ?? end
    const c1 = { x: start.x + (end.x - before.x) / 6, y: start.y + (end.y - before.y) / 6 }
    const c2 = { x: end.x - (after.x - start.x) / 6, y: end.y - (after.y - start.y) / 6 }
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`
  }
  return d
}

// Whole days between two day keys.
function daysBetween(a: string, b: string): number {
  return Math.round((keyToDate(b).getTime() - keyToDate(a).getTime()) / 86_400_000)
}

export default function WeightCard() {
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray()) ?? []
  const [text, setText] = useState('')

  const today = todayKey()
  const latest = weights[weights.length - 1]
  const kg = parseNumber(text)
  const valid = kg !== null && kg > 0

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    await saveWeight(today, kg)
    setText('')
  }

  // ----- Chart data: the last 90 days -----
  const shown = weights.filter((w) => w.date >= shiftDay(today, -DAYS_SHOWN))
  const averages = shown.map((w) => sevenDayAverage(weights, w.date))
  const all = [...shown.map((w) => w.kg), ...averages]
  const min = Math.min(...all) - 0.5
  const max = Math.max(...all) + 0.5
  const span = shown.length > 1 ? Math.max(daysBetween(shown[0].date, shown[shown.length - 1].date), 1) : 1

  // Converts a (date, kg) pair to a position in the drawing.
  const toPoint = (date: string, value: number): Point => ({
    x: PAD.left + (daysBetween(shown[0].date, date) / span) * (W - PAD.left - PAD.right),
    y: PAD.top + (1 - (value - min) / (max - min)) * (H - PAD.top - PAD.bottom),
  })
  const dayPoints = shown.map((w) => toPoint(w.date, w.kg))
  const averagePoints = shown.map((w, i) => toPoint(w.date, averages[i]))

  return (
    <>
      <h3 className="section-title">Weight</h3>
      <section className="card glass">
        <form className="weight-form" onSubmit={save}>
          <input
            className="input"
            inputMode="decimal"
            placeholder={latest ? `${latest.kg} kg` : 'Weight in kg'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Weight in kg"
          />
          <button className="button small" type="submit" disabled={!valid}>
            Log today
          </button>
        </form>

        {latest && (
          <div className="weight-stats">
            <div>
              <b>{latest.kg.toFixed(1)} kg</b>
              <span className="muted">latest · {formatDay(latest.date)}</span>
            </div>
            <div>
              <b style={{ color: 'var(--protein)' }}>{sevenDayAverage(weights, latest.date).toFixed(1)} kg</b>
              <span className="muted">7-day average</span>
            </div>
          </div>
        )}

        {shown.length >= 2 ? (
          <>
            {/* key = redraw the line animation when a weigh-in is added */}
            <svg className="weight-chart" viewBox={`0 0 ${W} ${H}`} key={weights.length}>
              <text x="0" y={PAD.top + 4}>{max.toFixed(1)}</text>
              <text x="0" y={H - PAD.bottom}>{min.toFixed(1)}</text>
              <path className="weight-day-line" d={smoothPath(dayPoints)} />
              {dayPoints.map((p, i) => (
                <circle key={i} className="weight-dot" cx={p.x} cy={p.y} r="3" />
              ))}
              {/* pathLength=1 lets the CSS animation "draw" the line from left to right */}
              <path className="weight-average-line" d={smoothPath(averagePoints)} pathLength={1} />
            </svg>
            <div className="weight-legend muted">
              <span>
                <i style={{ background: 'var(--mint)' }} /> Daily
              </span>
              <span>
                <i style={{ background: 'var(--protein)' }} /> 7-day average
              </span>
              <span>Last {DAYS_SHOWN} days</span>
            </div>
          </>
        ) : (
          <p className="muted">Log your weight on two or more days to see the chart.</p>
        )}

        {/* The latest weigh-ins, newest first, each with a remove button. */}
        {weights
          .slice(-5)
          .reverse()
          .map((w) => (
            <div className="plain-row" key={w.date}>
              <span className="entry-main">{formatDay(w.date)}</span>
              <b>{w.kg.toFixed(1)} kg</b>
              <button className="icon-button remove" onClick={() => deleteWeight(w.date)} aria-label={`Remove ${w.date}`}>
                ✕
              </button>
            </div>
          ))}
      </section>
    </>
  )
}

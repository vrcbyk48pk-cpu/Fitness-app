import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { suggestTargets } from '../calculator'
import { db, deleteWeight, getProfile, getTargets, saveProfile, saveTargets, saveWeight } from '../db'
import type { Targets, WeightEntry } from '../types'
import { formatDay, keyToDate, parseNumber, shiftDay, todayKey } from '../utils'
import Button from './Button'
import Sheet from './Sheet'

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
  // Set when a new weight leads to different suggested targets: we ask before changing them.
  const [offer, setOffer] = useState<{ kg: number; current: Targets; suggested: Targets } | null>(null)

  const today = todayKey()
  const latest = weights[weights.length - 1]
  const kg = parseNumber(text)
  const valid = kg !== null && kg > 0

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    await saveWeight(today, kg)
    setText('')

    // If there is a profile, the calorie suggestion depends on the weight.
    const profile = await getProfile()
    if (!profile || profile.weightKg === kg) return
    const updated = { ...profile, weightKg: kg }
    await saveProfile(updated)
    const current = await getTargets()
    const suggested = suggestTargets(updated).targets
    const changed = (Object.keys(suggested) as (keyof Targets)[]).some((key) => suggested[key] !== current[key])
    if (changed) setOffer({ kg, current, suggested })
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
      <h2 className="section-title">Weight</h2>
      <section className="card glass">
        <form className="input-row" onSubmit={save}>
          <input
            className="input"
            inputMode="decimal"
            placeholder={latest ? `${latest.kg} kg` : 'Weight in kg'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Weight in kg"
          />
          <Button variant="primary" type="submit" disabled={!valid}>
            Log today
          </Button>
        </form>

        {latest && (
          <div className="stat-row">
            <div className="tile">
              <b>{latest.kg.toFixed(1)} kg</b>
              <span>latest · {formatDay(latest.date)}</span>
            </div>
            <div className="tile">
              <b style={{ color: 'var(--protein-text)' }}>{sevenDayAverage(weights, latest.date).toFixed(1)} kg</b>
              <span>7-day average</span>
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
            <div className="legend">
              <span>
                <i className="dot" style={{ background: 'var(--accent)' }} />
                Daily
              </span>
              <span>
                <i className="dot" style={{ background: 'var(--protein)' }} />
                7-day average
              </span>
              <span>Last {DAYS_SHOWN} days</span>
            </div>
          </>
        ) : (
          <p className="muted">Log your weight on two or more days to see the chart.</p>
        )}

        {/* The latest weigh-ins, newest first, each with a remove button. */}
        <div>
          {weights
            .slice(-5)
            .reverse()
            .map((w) => (
              <div className="row plain" key={w.date}>
                <span className="row-main">{formatDay(w.date)}</span>
                <b>{w.kg.toFixed(1)} kg</b>
                <Button layout="round" size="small" icon="close" onClick={() => deleteWeight(w.date)} aria-label={`Remove ${w.date}`} />
              </div>
            ))}
        </div>
      </section>

      {offer && (
        <Sheet title="Update your targets?" onClose={() => setOffer(null)}>
          <p className="muted">
            Your weight is now {offer.kg} kg, so the suggested targets changed. Your current targets stay as they are
            unless you update them.
          </p>
          <div className="label">Current → suggested</div>
          <div className="compare">
            <Comparison label="Calories" unit="kcal" from={offer.current.kcal} to={offer.suggested.kcal} />
            <Comparison label="Protein" unit="g" from={offer.current.protein} to={offer.suggested.protein} />
            <Comparison label="Carbs" unit="g" from={offer.current.carbs} to={offer.suggested.carbs} />
            <Comparison label="Fat" unit="g" from={offer.current.fat} to={offer.suggested.fat} />
          </div>
          <div className="sheet-actions">
            <Button
              variant="primary"
              block
              onClick={async () => {
                await saveTargets(offer.suggested)
                setOffer(null)
              }}
            >
              Update targets
            </Button>
            <Button block onClick={() => setOffer(null)}>
              Keep current targets
            </Button>
          </div>
        </Sheet>
      )}
    </>
  )
}

// One line of the "current -> suggested" table.
function Comparison(props: { label: string; unit: string; from: number; to: number }) {
  return (
    <>
      <span>{props.label}</span>
      <span className="muted">
        {Math.round(props.from)} {props.unit}
      </span>
      <b>
        {Math.round(props.to)} {props.unit}
      </b>
    </>
  )
}

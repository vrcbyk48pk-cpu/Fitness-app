import { useLiveQuery } from 'dexie-react-hooks'
import { goalDate } from '../calculator'
import { db, getProfile } from '../db'
import { fmt, formatDate } from '../utils'

// Progress towards the target weight: start -> now -> target.
// Shows nothing when there is no profile or no target weight.
export default function GoalProgress() {
  const profile = useLiveQuery(getProfile)
  const latest = useLiveQuery(() => db.weights.orderBy('date').last())
  if (!profile || profile.targetWeightKg === undefined) return null

  const target = profile.targetWeightKg
  const start = profile.startWeightKg ?? profile.weightKg
  // "Now" is the latest weigh-in; before the first weigh-in it is the weight from the profile.
  const now = latest?.kg ?? profile.weightKg

  // How far along, from 0 (at the start) to 1 (at the target). Works for losing and gaining.
  const total = target - start
  const progress = total === 0 ? 1 : Math.max(0, Math.min(1, (now - start) / total))
  const reached = total <= 0 ? now <= target : now >= target
  const toGo = Math.abs(target - now)

  // The date is recalculated from the current weight, so it moves as you log.
  const date = goalDate({ ...profile, weightKg: now }, new Date())

  return (
    <>
      <h2 className="section-title">Goal progress</h2>
      <section className="card glass">
        <div className="stat-row">
          <div className="tile">
            <b>{fmt(start)} kg</b>
            <span>start</span>
          </div>
          <div className="tile">
            <b style={{ color: 'var(--accent-text)' }}>{fmt(now)} kg</b>
            <span>now</span>
          </div>
          <div className="tile">
            <b>{fmt(target)} kg</b>
            <span>target</span>
          </div>
        </div>

        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>

        {reached ? (
          <p className="estimate">You reached your target weight.</p>
        ) : (
          <div>
            <p className="estimate">
              {fmt(Math.abs(now - start))} kg {total <= 0 ? 'lost' : 'gained'} · {fmt(toGo)} kg to go
            </p>
            {date && <p className="muted">Estimated to reach {fmt(target)} kg around {formatDate(date)}</p>}
          </div>
        )}
      </section>
    </>
  )
}

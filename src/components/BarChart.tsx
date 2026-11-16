import { keyToDate, todayKey } from '../utils'
import { num, locale } from '../i18n'

interface Props {
  days: string[] // the day keys to show, in order
  kcalByDay: Map<string, number>
  target: number
  onSelect: (day: string) => void
}

// Daily calories as rounded bars, with a dashed line at the target.
// Built from plain HTML elements: each bar is a div whose height is a percentage.
export default function BarChart({ days, kcalByDay, target, onSelect }: Props) {
  const today = todayKey()
  const highest = Math.max(...days.map((d) => kcalByDay.get(d) ?? 0))
  // The top of the chart: a bit above the target or the highest bar, whichever is larger.
  const top = Math.max(target, highest, 1) * 1.15
  const isWeek = days.length <= 7

  function label(day: string): string {
    const date = keyToDate(day)
    if (isWeek) return date.toLocaleDateString(locale(), { weekday: 'narrow' })
    // In a month, only label every 7th day so the numbers don't touch.
    return (date.getDate() - 1) % 7 === 0 ? String(date.getDate()) : ''
  }

  return (
    <div className={isWeek ? 'chart week' : 'chart month'}>
      <div className="chart-area">
        {target > 0 && (
          <div className="chart-target" style={{ bottom: `${(target / top) * 100}%` }}>
            <span>{num(target)}</span>
          </div>
        )}
        {days.map((day) => {
          const kcal = kcalByDay.get(day) ?? 0
          return (
            <button
              key={day}
              className="chart-col"
              disabled={day > today} // future days can't be opened
              onClick={() => onSelect(day)}
              aria-label={`${day}: ${num(kcal)} kcal`}
            >
              <div
                className={kcal > target && target > 0 ? 'chart-bar over' : 'chart-bar'}
                style={{ height: `${(kcal / top) * 100}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="chart-labels">
        {days.map((day) => (
          <span key={day} className={day === today ? 'today' : ''}>
            {label(day)}
          </span>
        ))}
      </div>
    </div>
  )
}

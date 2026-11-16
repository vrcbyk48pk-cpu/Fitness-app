import type { Entry, Extra, Targets } from '../types'
import { fmt, sumExtra, sumMacros } from '../utils'
import Sheet from './Sheet'

interface Props {
  entries: Entry[]
  targets: Targets
  onClose: () => void
}

// All totals of the day, including sugar and salt.
export default function DayDetails({ entries, targets, onClose }: Props) {
  const total = sumMacros(entries)

  // An extra value with a remark about foods that have no data for it.
  function extra(key: Extra, decimals = 1): { value: string; note?: string } {
    const { total: sum, unknown } = sumExtra(entries, key)
    if (entries.length > 0 && unknown === entries.length) return { value: 'unknown' }
    const rounded = Math.round(sum * 10 ** decimals) / 10 ** decimals
    return {
      value: `${rounded} g`,
      note: unknown > 0 ? `not known for ${unknown} of ${entries.length} foods` : undefined,
    }
  }

  const rows: { label: string; value: string; note?: string }[] = [
    { label: 'Calories', value: `${Math.round(total.kcal)} / ${Math.round(targets.kcal)} kcal` },
    { label: 'Protein', value: `${fmt(total.protein)} / ${fmt(targets.protein)} g` },
    { label: 'Carbs', value: `${fmt(total.carbs)} / ${fmt(targets.carbs)} g` },
    { label: 'of which sugar', ...extra('sugar') },
    { label: 'Fat', value: `${fmt(total.fat)} / ${fmt(targets.fat)} g` },
    { label: 'Fibre', ...extra('fibre'), value: `${extra('fibre').value.replace(' g', '')} / ${fmt(targets.fibre)} g` },
    { label: 'Salt', ...extra('salt', 2) },
  ]

  return (
    <Sheet title="Day details" onClose={onClose}>
      {rows.map((row) => (
        <div className="row plain" key={row.label}>
          <div className="row-main">
            <div className="row-title">{row.label}</div>
            {row.note && <div className="muted">{row.note}</div>}
          </div>
          <div className="row-value">{row.value}</div>
        </div>
      ))}
      <p className="muted extras">
        Foods logged before fibre, sugar and salt were tracked, or without that information, count as unknown rather
        than zero.
      </p>
    </Sheet>
  )
}

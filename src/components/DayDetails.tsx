import type { Entry, Extra, Targets } from '../types'
import { fmt, sumExtra, sumMacros } from '../utils'
import Sheet from './Sheet'
import { t, num } from '../i18n'

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
    if (entries.length > 0 && unknown === entries.length) return { value: t('details.unknown') }
    return {
      value: `${num(sum, decimals)} g`,
      note: unknown > 0 ? t('details.notKnown', { unknown, total: entries.length }) : undefined,
    }
  }

  const rows: { label: string; value: string; note?: string }[] = [
    { label: t('nutrient.calories'), value: `${num(total.kcal)} / ${num(targets.kcal)} kcal` },
    { label: t('nutrient.protein'), value: `${fmt(total.protein)} / ${fmt(targets.protein)} g` },
    { label: t('nutrient.carbs'), value: `${fmt(total.carbs)} / ${fmt(targets.carbs)} g` },
    { label: t('nutrient.ofWhichSugar'), ...extra('sugar') },
    { label: t('nutrient.fat'), value: `${fmt(total.fat)} / ${fmt(targets.fat)} g` },
    { label: t('nutrient.fibre'), ...extra('fibre'), value: `${extra('fibre').value.replace(' g', '')} / ${fmt(targets.fibre)} g` },
    { label: t('nutrient.salt'), ...extra('salt', 2) },
  ]

  return (
    <Sheet title={t('today.dayDetails')} onClose={onClose}>
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
        {t('details.note')}
      </p>
    </Sheet>
  )
}

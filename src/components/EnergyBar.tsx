import { num, t } from '../i18n'
import { leftText } from './CalorieRing'

interface Props {
  eaten: number
  target: number
}

// The calories as one long bar: the same information as the ring, in another shape.
// Themes decide which of the two is shown (see ringDisplay and energyDisplay in themes.ts).
export default function EnergyBar({ eaten, target }: Props) {
  const percent = target > 0 ? Math.min((eaten / target) * 100, 100) : 0
  const over = eaten > target

  return (
    <div className="energy">
      <div className="energy-value">{num(eaten)}</div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${percent}%`, background: over ? 'var(--over)' : undefined }} />
      </div>
      <div className="energy-foot">
        <span className="muted">{t('ring.of', { target: num(target) })}</span>
        <span className="ring-left">{leftText(eaten, target)}</span>
      </div>
    </div>
  )
}

import { num, t } from '../i18n'

interface Props {
  eaten: number
  target: number
}

const SIZE = 220
const STROKE = 18
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// "1,050 left" or "120 over"
export function leftText(eaten: number, target: number): string {
  const left = Math.round(target - eaten)
  return left < 0 ? t('ring.over', { count: num(-left) }) : t('ring.left', { count: num(left) })
}

// A ring that fills up as you eat. It is an SVG circle whose outline is one
// long dash; we hide part of the dash to show progress.
export default function CalorieRing({ eaten, target }: Props) {
  const progress = target > 0 ? Math.min(eaten / target, 1) : 0
  const over = eaten > target

  return (
    <div className="ring">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle className="ring-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeWidth={STROKE} />
        <circle
          className={over ? 'ring-fill over' : 'ring-fill'}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <div className="ring-text">
        <div className="ring-number">{num(eaten)}</div>
        <div className="muted">{t('ring.of', { target: num(target) })}</div>
        <div className="ring-left">{leftText(eaten, target)}</div>
      </div>
    </div>
  )
}

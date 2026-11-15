interface Props {
  eaten: number
  target: number
}

const SIZE = 220
const STROKE = 18
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// A ring that fills up as you eat. It is an SVG circle whose outline is one
// long dash; we hide part of the dash to show progress.
export default function CalorieRing({ eaten, target }: Props) {
  const progress = target > 0 ? Math.min(eaten / target, 1) : 0
  const left = Math.round(target - eaten)
  const over = left < 0

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
        <div className="ring-number">{Math.round(eaten)}</div>
        <div className="ring-sub">of {Math.round(target)} kcal</div>
        <div className={over ? 'ring-left over' : 'ring-left'}>
          {over ? `${-left} over` : `${left} left`}
        </div>
      </div>
    </div>
  )
}

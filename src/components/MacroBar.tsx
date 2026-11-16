import { fmt } from '../utils'

interface Props {
  label: string
  eaten: number
  target: number
  color: string // a CSS colour, e.g. "var(--protein)"
  note?: string // a remark shown under the bar
}

export default function MacroBar({ label, eaten, target, color, note }: Props) {
  const percent = target > 0 ? Math.min((eaten / target) * 100, 100) : 0
  return (
    <div className="macro">
      <div className="macro-head">
        <span className="macro-label">
          <span className="dot" style={{ background: color }} />
          {label}
        </span>
        <span className="muted">
          {fmt(eaten)} / {fmt(target)} g
        </span>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      {note && <div className="muted bar-note">{note}</div>}
    </div>
  )
}

import type { Macros } from '../types'
import { fmt } from '../utils'

// Four small tiles: kcal, protein, carbs, fat.
export default function MacroTiles({ kcal, protein, carbs, fat }: Macros) {
  return (
    <div className="tiles">
      <div className="tile" style={{ color: 'var(--accent-text)' }}>
        <b>{Math.round(kcal)}</b>
        <span>kcal</span>
      </div>
      <div className="tile" style={{ color: 'var(--protein-text)' }}>
        <b>{fmt(protein)} g</b>
        <span>protein</span>
      </div>
      <div className="tile" style={{ color: 'var(--carbs-text)' }}>
        <b>{fmt(carbs)} g</b>
        <span>carbs</span>
      </div>
      <div className="tile" style={{ color: 'var(--fat-text)' }}>
        <b>{fmt(fat)} g</b>
        <span>fat</span>
      </div>
    </div>
  )
}

import { num, t } from '../i18n'
import type { Macros } from '../types'
import { fmt } from '../utils'

// Four small tiles: kcal, protein, carbs, fat. Their colours come from the theme
// (the "kcal", "protein", "carbs" and "fat" classes in styles.css).
export default function MacroTiles({ kcal, protein, carbs, fat }: Macros) {
  return (
    <div className="tiles">
      <div className="tile kcal">
        <b>{num(kcal)}</b>
        <span>kcal</span>
      </div>
      <div className="tile protein">
        <b>{fmt(protein)} g</b>
        <span>{t('tile.protein')}</span>
      </div>
      <div className="tile carbs">
        <b>{fmt(carbs)} g</b>
        <span>{t('tile.carbs')}</span>
      </div>
      <div className="tile fat">
        <b>{fmt(fat)} g</b>
        <span>{t('tile.fat')}</span>
      </div>
    </div>
  )
}

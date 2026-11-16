import { num, t } from '../i18n'
import Button from './Button'
import CalorieRing from './CalorieRing'
import EnergyBar from './EnergyBar'
import MacroBar from './MacroBar'
import MacroTiles from './MacroTiles'

// A small Today screen with sample data, built from the real components.
// The theme gallery shows one of these per theme, so each preview is the real thing.
export default function TodayPreview() {
  const eaten = 1150
  const target = 2200
  return (
    <div>
      <div className="stripes" />
      <div className="page-head">
        <div className="page-title">{t('day.today')}</div>
      </div>
      <p className="headline">{t('today.headline.left', { count: num(target - eaten) })}</p>
      <section className="card surface">
        <CalorieRing eaten={eaten} target={target} />
        <EnergyBar eaten={eaten} target={target} />
        <MacroBar label={t('nutrient.protein')} eaten={82} target={130} color="var(--protein)" />
        <MacroBar label={t('nutrient.carbs')} eaten={120} target={250} color="var(--carbs)" />
        <MacroBar label={t('nutrient.fat')} eaten={38} target={70} color="var(--fat)" />
        <MacroTiles kcal={420} protein={18} carbs={62} fat={9} />
      </section>
      <div className="meal">
        <div className="meal-head">
          <div className="meal-title">{t('meal.breakfast')}</div>
          <span className="muted meal-total">420 kcal</span>
          <Button variant="primary" size="small" layout="round" icon="plus" tabIndex={-1} aria-hidden="true" />
        </div>
        <div className="row surface">
          <div className="row-main">
            <div className="row-title">{t('sample.oats')}</div>
            <div className="muted">250 g</div>
          </div>
          <div className="row-value">
            420 <span className="muted">kcal</span>
          </div>
        </div>
      </div>
    </div>
  )
}

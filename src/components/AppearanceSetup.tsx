import { useState } from 'react'
import { type Appearance, applyAppearance, chooseAppearance } from '../appearance'
import { LANGUAGES, t } from '../i18n'
import Button from './Button'
import ThemeGallery from './ThemeGallery'

interface Props {
  appearance: Appearance
  // Called for every change, so the whole app (and this screen) redraws in the new look.
  onChange: (appearance: Appearance) => void
}

// The first two screens of the app: choose a language, then choose a theme.
// People who already used the app see these once after updating.
export default function AppearanceSetup({ appearance, onChange }: Props) {
  const [step, setStep] = useState<'language' | 'theme'>('language')

  // Shows a choice straight away, without storing it yet.
  function preview(next: Appearance) {
    applyAppearance(next)
    onChange(next)
  }

  return (
    <div className="onboarding">
      <div className="onboarding-top">
        {step === 'theme' ? (
          <Button variant="soft" layout="round" icon="back" onClick={() => setStep('language')} aria-label={t('common.back')} />
        ) : (
          <span />
        )}
      </div>

      {step === 'language' && (
        <div className="onboarding-step" key="language">
          <h1 className="page-title">{t('lang.title')}</h1>
          <div className="stack language-buttons">
            {LANGUAGES.map((language) => (
              <Button
                key={language.value}
                variant={language.value === appearance.language ? 'primary' : 'soft'}
                block
                onClick={() => {
                  preview({ ...appearance, language: language.value })
                  setStep('theme')
                }}
              >
                {language.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {step === 'theme' && (
        <div className="onboarding-step" key="theme">
          <h1 className="page-title">{t('theme.title')}</h1>
          <p className="muted">{t('theme.swipe')}</p>
          <ThemeGallery value={appearance.theme} onChange={(theme) => preview({ ...appearance, theme })} />
          <div className="onboarding-bottom">
            <Button variant="primary" block onClick={() => chooseAppearance(appearance)}>
              {t('theme.use')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

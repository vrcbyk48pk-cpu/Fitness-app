import Button from './Button'
import { t } from '../i18n'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

// A panel that slides up from the bottom. Tap outside it to close.
export default function Sheet({ title, onClose, children }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet surface" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <Button layout="round" size="small" icon="close" onClick={onClose} aria-label={t('common.close')} />
        </div>
        {children}
      </div>
    </div>
  )
}

import Button from './Button'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

// A glass panel that slides up from the bottom. Tap outside it to close.
export default function Sheet({ title, onClose, children }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet glass" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <Button layout="round" size="small" icon="close" onClick={onClose} aria-label="Close" />
        </div>
        {children}
      </div>
    </div>
  )
}

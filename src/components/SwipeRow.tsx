import { useRef, useState } from 'react'
import Button from './Button'
import type { IconName } from './Icon'

interface Props {
  actionLabel: string
  actionIcon: IconName
  onAction: () => void
  children: React.ReactNode // the row itself
}

// Wraps a row so it can be swiped left to reveal a button behind it. Swipe right to hide it again.
export default function SwipeRow({ actionLabel, actionIcon, onAction, children }: Props) {
  const [open, setOpen] = useState(false)
  const startX = useRef(0)

  return (
    <div
      className={open ? 'swipe open' : 'swipe'}
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const moved = e.changedTouches[0].clientX - startX.current
        if (moved < -40) setOpen(true)
        if (moved > 40) setOpen(false)
      }}
    >
      <div className="swipe-action">
        <Button variant="primary" size="small" icon={actionIcon} onClick={onAction} tabIndex={open ? 0 : -1}>
          {actionLabel}
        </Button>
      </div>
      {children}
    </div>
  )
}

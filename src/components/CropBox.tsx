import { useRef } from 'react'
import type { Crop } from '../image'

interface Props {
  photoUrl: string
  crop: Crop
  setCrop: (crop: Crop) => void
}

// Which part of the box is being dragged: a corner, or the whole box.
type Handle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'move'

const MIN_SIZE = 0.15 // the box can't get smaller than 15% of the photo

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

// The photo with a crop rectangle on top. Drag a corner to resize, drag the middle to move.
// All positions are fractions of the photo (0 to 1), so they don't depend on the screen size.
export default function CropBox({ photoUrl, crop, setCrop }: Props) {
  const frame = useRef<HTMLDivElement>(null)
  // What we need to remember during a drag.
  const drag = useRef<{ handle: Handle; startX: number; startY: number; startCrop: Crop } | null>(null)

  function onPointerDown(handle: Handle, e: React.PointerEvent) {
    e.stopPropagation()
    // "Capture" keeps sending us the pointer moves even when the finger leaves the element.
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { handle, startX: e.clientX, startY: e.clientY, startCrop: crop }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !frame.current) return
    const { handle, startX, startY, startCrop: c } = drag.current
    const size = frame.current.getBoundingClientRect()
    // How far the finger moved, as a fraction of the photo.
    const dx = (e.clientX - startX) / size.width
    const dy = (e.clientY - startY) / size.height

    if (handle === 'move') {
      setCrop({ ...c, x: clamp(c.x + dx, 0, 1 - c.width), y: clamp(c.y + dy, 0, 1 - c.height) })
      return
    }

    // Work with the four edges, move the two that belong to this corner, then convert back.
    let left = c.x
    let top = c.y
    let right = c.x + c.width
    let bottom = c.y + c.height
    if (handle.includes('left')) left = clamp(left + dx, 0, right - MIN_SIZE)
    if (handle.includes('right')) right = clamp(right + dx, left + MIN_SIZE, 1)
    if (handle.startsWith('top')) top = clamp(top + dy, 0, bottom - MIN_SIZE)
    if (handle.startsWith('bottom')) bottom = clamp(bottom + dy, top + MIN_SIZE, 1)
    setCrop({ x: left, y: top, width: right - left, height: bottom - top })
  }

  const corners: Handle[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

  return (
    <div className="crop-frame" ref={frame}>
      <img src={photoUrl} alt="Your photo of the label" draggable={false} />
      <div
        className="crop-box"
        style={{
          left: `${crop.x * 100}%`,
          top: `${crop.y * 100}%`,
          width: `${crop.width * 100}%`,
          height: `${crop.height * 100}%`,
        }}
        onPointerDown={(e) => onPointerDown('move', e)}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {corners.map((corner) => (
          <div
            key={corner}
            className={`crop-handle ${corner}`}
            onPointerDown={(e) => onPointerDown(corner, e)}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          />
        ))}
      </div>
    </div>
  )
}

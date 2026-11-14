import { useEffect, useRef, useState } from 'react'
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'

interface Props {
  onDetected: (barcode: string) => void
  onClose: () => void
}

// Only look for the barcode types used on food packaging. This makes scanning faster.
const hints = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
])

// Full-screen camera view. Calls onDetected once with the first barcode it sees.
export default function Scanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState('')

  useEffect(() => {
    let stopped = false
    let stopCamera = () => {}

    const reader = new BrowserMultiFormatReader(hints)
    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } }, // the back camera
        videoRef.current!,
        (result) => {
          // This runs for every camera frame; "result" is only set when a barcode was read.
          if (result && !stopped) {
            stopped = true
            stopCamera()
            onDetected(result.getText())
          }
        },
      )
      .then((controls) => {
        stopCamera = () => controls.stop()
        // If the scanner was closed while the camera was still starting, stop it now.
        if (stopped) stopCamera()
      })
      .catch(() => {
        setError('Could not open the camera. Allow camera access in Safari, or type the barcode below.')
      })

    // Clean-up: runs when the scanner closes.
    return () => {
      stopped = true
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted />
      {!error && <div className="scanner-frame" />}
      {error && <p className="scanner-error">{error}</p>}

      <button className="icon-button glass scanner-close" onClick={onClose} aria-label="Close scanner">
        ✕
      </button>

      <form
        className="scanner-manual glass"
        onSubmit={(e) => {
          e.preventDefault()
          const digits = typed.replace(/\D/g, '')
          if (digits) onDetected(digits)
        }}
      >
        <input
          inputMode="numeric"
          placeholder="Or type the barcode"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <button className="button small" type="submit">
          Go
        </button>
      </form>
    </div>
  )
}

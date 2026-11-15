import { useEffect, useRef, useState } from 'react'
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'
import Button from './Button'

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

// "torch" and "focusMode" are real camera options, but TypeScript's built-in
// types don't know them yet. This adds them.
type CameraOptions = MediaTrackConstraintSet & { torch?: boolean; focusMode?: string }
type CameraAbilities = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] }

// What we ask the camera for. Everything is "ideal" (a wish, not a demand):
// Safari refuses to start the camera when an exact value can't be met.
const CAMERA: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' }, // the back camera
    width: { ideal: 1920 }, // a sharp picture makes thin barcode lines readable
    height: { ideal: 1080 },
    // Keep refocusing as the phone moves. Cameras that can't do this skip it.
    advanced: [{ focusMode: 'continuous' } as CameraOptions],
  },
}

// Full-screen camera view. Calls onDetected once with the first barcode it sees.
export default function Scanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // The camera's video track: needed to switch the torch.
  const track = useRef<MediaStreamTrack | null>(null)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState('')
  const [hasTorch, setHasTorch] = useState(false)
  // We remember ourselves whether the torch is on. Asking the camera
  // (track.getSettings()) gives wrong answers on iOS 18 and later.
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    let stopped = false
    let stopCamera = () => {}

    const reader = new BrowserMultiFormatReader(hints)
    reader
      .decodeFromConstraints(CAMERA, videoRef.current!, (result) => {
        // This runs for every camera frame; "result" is only set when a barcode was read.
        if (result && !stopped) {
          stopped = true
          stopCamera()
          onDetected(result.getText())
        }
      })
      .then((controls) => {
        const stream = videoRef.current?.srcObject as MediaStream | null
        const videoTrack = stream?.getVideoTracks()[0] ?? null
        track.current = videoTrack

        stopCamera = () => {
          // Switch the torch off before letting go of the camera.
          videoTrack?.applyConstraints({ advanced: [{ torch: false } as CameraOptions] }).catch(() => {})
          controls.stop()
        }
        // If the scanner was closed while the camera was still starting, stop it now.
        if (stopped) return stopCamera()

        // Ask what this camera can do. Older browsers don't have getCapabilities.
        const abilities: CameraAbilities = videoTrack?.getCapabilities?.() ?? {}
        setHasTorch(abilities.torch === true)
        if (abilities.focusMode?.includes('continuous')) {
          videoTrack?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as CameraOptions] }).catch(() => {})
        }
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

  async function toggleTorch() {
    const next = !torchOn
    try {
      await track.current?.applyConstraints({ advanced: [{ torch: next } as CameraOptions] })
      setTorchOn(next)
    } catch {
      // The camera refused: it has no usable torch after all.
      setHasTorch(false)
    }
  }

  return (
    <div className="scanner on-camera">
      <video ref={videoRef} playsInline muted />
      {!error && (
        <>
          <div className="scanner-frame" />
          <p className="scanner-hint">Hold the barcode inside the frame</p>
        </>
      )}
      {error && <p className="scanner-hint">{error}</p>}

      <div className="scanner-top">
        {/* An empty box keeps the close button on the right when there is no torch. */}
        {hasTorch ? (
          <Button
            variant="glass"
            layout="round"
            icon={torchOn ? 'torchOn' : 'torch'}
            className={torchOn ? 'torch-on' : ''}
            onClick={toggleTorch}
            aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
            aria-pressed={torchOn}
          />
        ) : (
          <span />
        )}
        <Button variant="glass" layout="round" icon="close" onClick={onClose} aria-label="Close scanner" />
      </div>

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
        <Button variant="primary" size="small" type="submit">
          Go
        </Button>
      </form>
    </div>
  )
}

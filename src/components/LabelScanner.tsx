import { useEffect, useState } from 'react'
import { type Crop, loadImage, prepareForOcr } from '../image'
import { type LabelValues, parseLabel } from '../labelParser'
import { readText } from '../ocr'
import CropBox from './CropBox'

interface Props {
  photo: File // the picture that was just taken
  onRetake: () => void // open the camera again
  onManual: () => void // give up on scanning and type the values
  onClose: () => void
  // Called when at least one value was read. "preview" is the picture the OCR looked at.
  onRead: (values: LabelValues, preview: string) => void
}

type Stage =
  | { name: 'crop' }
  | { name: 'reading'; loading: boolean; progress: number }
  | { name: 'failed'; message: string }

// Full-screen flow after a label photo was taken: crop it, read it, report the result.
export default function LabelScanner({ photo, onRetake, onManual, onClose, onRead }: Props) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [crop, setCrop] = useState<Crop>({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 })
  const [stage, setStage] = useState<Stage>({ name: 'crop' })

  // A new photo arrived (also after "Try again"): show it and start over at the crop step.
  useEffect(() => {
    const url = URL.createObjectURL(photo)
    setPhotoUrl(url)
    setCrop({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 })
    setStage({ name: 'crop' })
    return () => URL.revokeObjectURL(url) // free the memory when the photo is replaced
  }, [photo])

  async function read() {
    setStage({ name: 'reading', loading: true, progress: 0 })

    let text: string
    let preview: string
    try {
      const prepared = prepareForOcr(await loadImage(photoUrl), crop)
      preview = prepared.toDataURL('image/jpeg', 0.8)
      text = await readText(prepared, (state) => setStage({ name: 'reading', ...state }))
    } catch {
      setStage({
        name: 'failed',
        message:
          'The text reader could not start. The very first label scan needs an internet connection to download it; after that it works offline.',
      })
      return
    }

    const values = parseLabel(text)
    if (Object.keys(values).length === 0) {
      setStage({
        name: 'failed',
        message:
          'I could not find any nutrition values in that photo. Try again with the table filling the frame, in good light, and held flat.',
      })
      return
    }
    onRead(values, preview)
  }

  return (
    <div className="label-screen">
      <header className="sheet-head">
        <h2>Scan label</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      {stage.name === 'crop' && photoUrl && (
        <>
          <p className="muted">Drag the corners so the box holds only the nutrition table.</p>
          <CropBox photoUrl={photoUrl} crop={crop} setCrop={setCrop} />
          <div className="label-actions">
            <button className="button big" onClick={read}>
              Read label
            </button>
            <button className="button secondary" onClick={onRetake}>
              Retake photo
            </button>
          </div>
        </>
      )}

      {stage.name === 'reading' && (
        <div className="label-status glass" role="status">
          <div className="spinner" />
          <h3>{stage.loading ? 'Getting the text reader ready…' : 'Reading the label…'}</h3>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${stage.progress * 100}%`, background: 'var(--mint)' }} />
          </div>
          <p className="muted">
            {stage.loading
              ? 'The first time, this downloads about 10 MB. After that it is instant and works offline.'
              : 'This takes a few seconds. Everything happens on your phone.'}
          </p>
        </div>
      )}

      {stage.name === 'failed' && (
        <div className="label-status glass">
          <h3>Nothing readable</h3>
          <p className="muted">{stage.message}</p>
          <button className="button" onClick={onRetake}>
            Try again
          </button>
          <button className="button secondary" onClick={onManual}>
            Enter manually
          </button>
        </div>
      )}
    </div>
  )
}

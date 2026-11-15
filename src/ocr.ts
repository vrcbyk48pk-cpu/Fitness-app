// Reads text from an image, on the phone itself, with Tesseract.js.
// Nothing here is loaded until the first label scan.
import type { Worker } from 'tesseract.js'

// Where the app serves the Tesseract files from (see scripts/copy-tesseract.mjs).
const TESSERACT_URL = new URL('tesseract/', document.baseURI).href

// Reports what is happening: first getting ready (loading === true), then reading (0 to 1).
export type OcrProgress = (state: { loading: boolean; progress: number }) => void

let onProgress: OcrProgress = () => {}

// The worker is created once and reused for later scans in the same session.
let workerPromise: Promise<Worker> | null = null

async function getWorker(): Promise<Worker> {
  // This import() is what keeps Tesseract out of the app's startup bundle.
  const { createWorker, PSM } = await import('tesseract.js')

  // 'nld' + 'eng': Dutch and English. The 1 selects Tesseract's modern (LSTM) engine.
  const worker = await createWorker(['nld', 'eng'], 1, {
    workerPath: TESSERACT_URL + 'worker.min.js',
    corePath: TESSERACT_URL,
    langPath: TESSERACT_URL + 'lang',
    // Tesseract saves the language data in IndexedDB after the first download ("write" is its
    // default cache mode, spelled out here because offline use depends on it).
    cacheMethod: 'write',
    logger: (message) => {
      const reading = message.status === 'recognizing text'
      onProgress({ loading: !reading, progress: reading ? message.progress : 0 })
    },
  })
  // Treat the picture as one block of text and read it row by row. Without this,
  // Tesseract may read a table column by column, separating names from their values.
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
  return worker
}

export async function readText(image: HTMLCanvasElement, progress: OcrProgress): Promise<string> {
  onProgress = progress
  progress({ loading: true, progress: 0 })
  if (!workerPromise) {
    workerPromise = getWorker()
    // If loading failed (for example: offline on first use), allow a fresh attempt next time.
    workerPromise.catch(() => (workerPromise = null))
  }
  const worker = await workerPromise
  const result = await worker.recognize(image)
  return result.data.text
}

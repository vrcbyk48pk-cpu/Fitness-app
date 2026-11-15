// Copies the OCR engine (Tesseract) and its Dutch + English language data from
// node_modules into public/tesseract, so the app serves them itself instead of
// depending on an outside CDN. Runs automatically before "npm run dev" and "npm run build".
import { copyFileSync, mkdirSync } from 'node:fs'

const files = [
  // The web worker that runs the OCR off the main thread.
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // The engine itself. The browser picks the fastest variant it supports.
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  // Language data.
  ['@tesseract.js-data/nld/4.0.0_best_int/nld.traineddata.gz', 'lang/nld.traineddata.gz'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
]

mkdirSync('public/tesseract/lang', { recursive: true })
for (const [from, to] of files) {
  copyFileSync(`node_modules/${from}`, `public/tesseract/${to}`)
}
console.log(`Copied ${files.length} Tesseract files to public/tesseract`)

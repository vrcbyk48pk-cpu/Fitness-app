// Photo helpers for label scanning: load, crop, and clean up an image for OCR.

// The part of the photo to read, as fractions of its width and height (0 to 1).
export interface Crop {
  x: number
  y: number
  width: number
  height: number
}

// Turns a photo file into an image element. Drawing an <img> respects the
// rotation stored in iPhone photos, so the picture is never sideways.
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not open that photo.'))
    image.src = url
  })
}

// OCR works best when the picture is neither tiny nor huge.
const TARGET_SIZE = 1600 // longest side, in pixels
const MAX_ENLARGE = 2 // never blow a small crop up more than 2x

// Cuts the crop out of the photo and prepares it for OCR:
// resize, turn it grayscale, and stretch the contrast.
export function prepareForOcr(image: HTMLImageElement, crop: Crop): HTMLCanvasElement {
  const sourceX = crop.x * image.naturalWidth
  const sourceY = crop.y * image.naturalHeight
  const sourceWidth = crop.width * image.naturalWidth
  const sourceHeight = crop.height * image.naturalHeight

  // 1. Resize so the longest side is about TARGET_SIZE.
  const scale = Math.min(TARGET_SIZE / Math.max(sourceWidth, sourceHeight), MAX_ENLARGE)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sourceWidth * scale)
  canvas.height = Math.round(sourceHeight * scale)
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)

  // 2. Grayscale. "pixels" holds 4 numbers per pixel: red, green, blue, alpha.
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  const histogram = new Array<number>(256).fill(0) // how many pixels have each brightness
  for (let i = 0; i < pixels.length; i += 4) {
    // Our eyes are most sensitive to green and least to blue, hence these weights.
    const gray = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
    pixels[i] = pixels[i + 1] = pixels[i + 2] = gray
    histogram[gray]++
  }

  // 3. Contrast. Find the brightness below which the darkest 2% of pixels fall, and the
  //    one above which the brightest 2% fall. Then stretch that range to full black..white.
  //    A dull photo (gray text on off-white) becomes crisp dark-on-light.
  const pixelCount = pixels.length / 4
  let dark = 0
  for (let seen = 0; dark < 255; dark++) {
    seen += histogram[dark]
    if (seen > pixelCount * 0.02) break
  }
  let light = 255
  for (let seen = 0; light > 0; light--) {
    seen += histogram[light]
    if (seen > pixelCount * 0.02) break
  }
  const range = Math.max(light - dark, 1)
  for (let i = 0; i < pixels.length; i += 4) {
    const stretched = ((pixels[i] - dark) / range) * 255
    pixels[i] = pixels[i + 1] = pixels[i + 2] = Math.max(0, Math.min(255, stretched))
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

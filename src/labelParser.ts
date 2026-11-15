// Turns the text that OCR read from a nutrition label into per-100g values.
// This file has no browser code, so it can be unit-tested (see labelParser.test.ts).

export interface LabelValues {
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
}

type Nutrient = 'energy' | 'protein' | 'carbs' | 'fat'

// The words that start a row we care about, in Dutch and English.
const KEYWORDS: Record<Nutrient, string[]> = {
  energy: ['energie', 'energy', 'energiewaarde'],
  protein: ['eiwit', 'eiwitten', 'protein', 'proteins', 'proteine'],
  carbs: ['koolhydraten', 'koolhydraat', 'hydraten', 'carbohydrate', 'carbohydrates', 'carbs'],
  fat: ['vet', 'vetten', 'fat', 'fats'],
}

// Words that mark a sub-row ("waarvan suikers", "of which saturates", "saturated fat").
// Everything from such a word onwards is ignored.
const SUB_ROW_WORDS = [
  'waarvan', 'which', 'verzadigd', 'verzadigde', 'onverzadigd', 'onverzadigde', 'enkelvoudig',
  'meervoudig', 'saturates', 'saturated', 'unsaturated', 'trans', 'suikers', 'sugars',
]

// OCR often confuses characters that look alike (i/l/1/|, o/0, s/5).
// Mapping each group to one character makes "Eiw1tten" and "Eiwitten" identical.
function canonical(word: string): string {
  return word
    .toLowerCase()
    .replace(/ï/g, 'i')
    .replace(/[il1|!]/g, 'l')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
}

// Levenshtein distance: how many single-character edits turn a into b.
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const substitute = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      current[j] = Math.min(substitute, previous[j] + 1, current[j - 1] + 1)
    }
    previous = current
  }
  return previous[b.length]
}

// Does an OCR word match one of the keywords? Longer keywords may contain typos:
// up to 4 letters must match exactly, 5-7 letters allow 1 typo, 8+ letters allow 2.
function matches(word: string, keywords: string[]): boolean {
  const w = canonical(word)
  return keywords.some((keyword) => {
    const k = canonical(keyword)
    const allowed = k.length <= 4 ? 0 : k.length <= 7 ? 1 : 2
    return editDistance(w, k) <= allowed
  })
}

// Finds the nutrient a line is about, and returns the text after its keyword
// (cut off where a sub-row word starts). Returns null for lines we don't care about.
function readRow(line: string): { nutrient: Nutrient; rest: string } | null {
  let nutrient: Nutrient | null = null
  let restStart = 0

  for (const match of line.matchAll(/[\p{L}\d|!]+/gu)) {
    const word = match[0]
    if (!/\p{L}/u.test(word)) continue // a plain number, not a word

    if (matches(word, SUB_ROW_WORDS)) {
      // A sub-row word before any keyword: the whole line is a sub-row.
      if (!nutrient) return null
      return { nutrient, rest: line.slice(restStart, match.index) }
    }
    if (!nutrient) {
      for (const candidate of Object.keys(KEYWORDS) as Nutrient[]) {
        if (matches(word, KEYWORDS[candidate])) {
          nutrient = candidate
          restStart = match.index + word.length
          break
        }
      }
    }
  }
  return nutrient ? { nutrient, rest: line.slice(restStart) } : null
}

// Repairs numbers: "O,5" -> "0.5", "l2,5" -> "12.5", "12 ,5" -> "12.5".
function cleanNumbers(text: string): string {
  return text
    .replace(/(?<=\d)[oO]+|[oO]+(?=[.,]?\d)/g, (run) => '0'.repeat(run.length))
    .replace(/(?<=\d)[lI|]|[lI|](?=[.,]?\d)/g, '1')
    .replace(/(\d)\s?[.,]\s?(\d)/g, '$1.$2')
}

// A number that has no unit after it (no g, mg, ml, kJ, kcal or %).
const UNITLESS_NUMBER = /(?<![\p{L}\d.])(\d+(?:\.\d+)?)(?!\.?\d)(?!\s*(?:g\b|gr|mg|ml|k|%))/gu

// Tesseract very often reads the "g" after a number as a "9": "24 g" becomes "249" and
// "6,5 g" becomes "6,59". We can detect this: on a normal label every value is followed
// by a unit, so numbers WITHOUT a unit that end in 9 are suspicious. If there are several
// of them and they clearly outnumber the other unit-less numbers, turn that 9 back into "g".
function fixGramsReadAsNine(lines: string[]): string[] {
  // "100 9g": the g was read twice, once as 9.
  lines = lines.map((line) => line.replace(/(\d)\s+9\s?g\b/g, '$1 g'))

  let endingInNine = 0
  let others = 0
  for (const line of lines) {
    for (const match of line.matchAll(UNITLESS_NUMBER)) {
      const number = match[1]
      if (number === '100' || number === '9') continue // the "per 100" header; a lone 9 says nothing
      if (number.length >= 2 && number.endsWith('9')) endingInNine++
      else others++
    }
  }
  if (endingInNine < 2 || endingInNine <= 2 * others) return lines

  return lines.map((line) =>
    line
      // "249" -> "24 g", "6.59" -> "6.5 g", "3.9" -> "3 g"
      .replace(UNITLESS_NUMBER, (number) =>
        number.length >= 2 && number.endsWith('9') ? number.slice(0, -1).replace(/\.$/, '') + ' g' : number,
      )
      // "24 9" -> "24 g"
      .replace(/(\d)\s+9(?![\d.])/g, '$1 g'),
  )
}

// Calories can be calculated from the macros: protein and carbs have 4 kcal per gram,
// fat has 9. Returns false when all four values are known but don't fit together,
// which means at least one of them was misread. "tolerance" 0.25 = may be 25% off.
export function addsUp(values: LabelValues, tolerance = 0.25): boolean {
  const { kcal, protein, carbs, fat } = values
  if (kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) return true
  const calculated = 4 * protein + 4 * carbs + 9 * fat
  return Math.abs(calculated - kcal) <= Math.max(kcal * tolerance, 15)
}

// One number read from a protein/carbs/fat row.
interface Reading {
  value: number
  hasUnit: boolean // was it followed by "g"?
}

type Macro = 'protein' | 'carbs' | 'fat'
const MACROS: Macro[] = ['protein', 'carbs', 'fat']

// The numbers in a protein/carbs/fat row. Labels print these with at most one decimal,
// so extra decimals are dropped: they are usually a misread "g" ("6,5 g" -> "6,509").
function readingsIn(text: string): Reading[] {
  const withoutPercentages = text.replace(/\d+(\.\d+)?\s*%/g, ' ')
  return [...withoutPercentages.matchAll(/(\d+)(?:\.(\d)\d*)?(\s*(?:g|gr|gram)\b)?/g)].map((m) => ({
    value: Number(m[2] ? `${m[1]}.${m[2]}` : m[1]),
    hasUnit: m[3] !== undefined,
  }))
}

// A last safety net, using the calories. When the values don't add up, a whole number
// of 10 or more may be a misread:
//   - with a unit, "125 g" has probably lost its comma: 12.5
//   - without a unit, "249" probably has the "g" glued on as a digit: 24
// Try every combination of such fixes. Only when exactly one combination makes the
// calories fit do we trust it; otherwise the values stay as they were read.
function repairWithCalories(values: LabelValues, readings: Partial<Record<Macro, Reading>>): LabelValues {
  if (addsUp(values, 0.2)) return values

  const fixes: Partial<Record<Macro, number>> = {}
  for (const macro of MACROS) {
    const reading = readings[macro]
    if (reading && reading.value >= 10 && Number.isInteger(reading.value)) {
      fixes[macro] = reading.hasUnit ? reading.value / 10 : Math.floor(reading.value / 10)
    }
  }
  const fixable = Object.keys(fixes) as Macro[]

  // Count from 1 to 2^n - 1: each bit of "combination" says whether to apply one fix.
  const fitting: LabelValues[] = []
  for (let combination = 1; combination < 2 ** fixable.length; combination++) {
    const candidate = { ...values }
    fixable.forEach((macro, bit) => {
      if (combination & (1 << bit)) candidate[macro] = fixes[macro]
    })
    if (addsUp(candidate, 0.1)) fitting.push(candidate)
  }
  return fitting.length === 1 ? fitting[0] : values
}

// All numbers in a piece of text, ignoring percentages (the "% RI" column).
function numbersIn(text: string): number[] {
  const withoutPercentages = text.replace(/\d+(\.\d+)?\s*%/g, ' ')
  return [...withoutPercentages.matchAll(/\d+(\.\d+)?/g)].map((m) => Number(m[0]))
}

// Labels often have two columns: "per 100 g" and "per portie". This looks at the header
// line and returns the position (0 = first) of the per-100 column.
function perHundredColumn(lines: string[]): number {
  for (const line of lines) {
    const amounts = [...line.matchAll(/(\d+)\s?(g|gr|gram|ml)\b/g)]
    const hundred = amounts.findIndex((m) => m[1] === '100')
    if (hundred === -1) continue
    // "per portie (30 g) | per 100 g": a portion word in front of the "100 g".
    const before = line.slice(0, amounts[hundred].index)
    if (hundred === 0 && /porti|serving|stuk|plak|glas/.test(before)) return 1
    return hundred
  }
  return 0
}

const KCAL = /(\d+(?:\.\d+)?)\s*k\s?ca[l1i|]/g
const KJ = /(\d+(?:\.\d+)?)\s*k\s?[jli1|\]](?![a-z])/g

// Reads the energy in kcal from a piece of text. kcal wins; kJ is converted.
function readEnergy(text: string, column: number): number | undefined {
  const kcals = [...text.matchAll(KCAL)].map((m) => Number(m[1]))
  if (kcals.length > 0) return kcals[column] ?? kcals[0]

  const kjs = [...text.matchAll(KJ)].map((m) => Number(m[1]))
  if (kjs.length > 0) return Math.round((kjs[column] ?? kjs[0]) / 4.184)

  // No readable units, e.g. "Energie (kJ/kcal) 1046/250". The kJ number is always
  // about 4.2 times the kcal number, so a pair with that ratio gives us the kcal.
  const numbers = numbersIn(text)
  for (let i = 0; i + 1 < numbers.length; i++) {
    const ratio = numbers[i] / numbers[i + 1]
    if (ratio > 3.9 && ratio < 4.5) return numbers[i + 1]
  }
  return undefined
}

export function parseLabel(text: string): LabelValues {
  const lines = fixGramsReadAsNine(
    text
      .split('\n')
      .map((line) => cleanNumbers(line.trim().toLowerCase()))
      .filter((line) => line !== ''),
  )
  const column = perHundredColumn(lines)
  let values: LabelValues = {}
  const readings: Partial<Record<Macro, Reading>> = {}

  lines.forEach((line, i) => {
    const row = readRow(line)
    if (!row) return

    if (row.nutrient === 'energy') {
      if (values.kcal !== undefined) return
      // The kcal value is often on the line below "Energie ... kJ".
      const next = lines[i + 1]
      const nextBelongs = next !== undefined && readRow(next) === null && !/waarvan|which/.test(next)
      const kcal = readEnergy(row.rest + (nextBelongs ? ' ' + next : ''), column)
      // Nothing edible has more than 900 kcal per 100 g (that is pure fat).
      if (kcal !== undefined && kcal <= 900) values.kcal = kcal
    } else if (values[row.nutrient] === undefined) {
      const found = readingsIn(row.rest)
      const reading = found[column] ?? found[0]
      if (reading) {
        readings[row.nutrient] = reading
        values[row.nutrient] = reading.value
      }
    }
  })

  // No "Energie" line was recognised: take the first "... kcal" anywhere in the text.
  if (values.kcal === undefined) {
    const kcal = readEnergy(lines.join(' '), 0)
    if (kcal !== undefined && kcal <= 900) values.kcal = kcal
  }

  values = repairWithCalories(values, readings)

  // More than 100 g per 100 g is impossible. Leave such a value empty,
  // so the review screen asks the user to fill it in.
  for (const macro of MACROS) {
    if (values[macro] !== undefined && values[macro] > 100) delete values[macro]
  }
  return values
}

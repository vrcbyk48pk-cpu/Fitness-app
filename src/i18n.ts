// Translations and number formatting for the two languages of the app.
// All text lives in locales/en.json and locales/nl.json; code only uses keys.
import en from './locales/en.json'
import nl from './locales/nl.json'

export type Language = 'en' | 'nl'

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
]

const MESSAGES: Record<Language, Record<string, string>> = { en, nl }

// The locale decides how numbers and dates look: 1,050 and "16 November" or 1.050 and "16 november".
const LOCALES: Record<Language, string> = { en: 'en-GB', nl: 'nl-NL' }

let language: Language = 'en'

export function setLanguage(next: Language): void {
  language = next
  // Tells the browser (and screen readers) which language the page is in.
  if (typeof document !== 'undefined') document.documentElement.lang = next
}

export const getLanguage = () => language
export const locale = () => LOCALES[language]

// Looks up a text by its key and fills in the {placeholders}.
//   t('add.loggingTo', { day: 'Monday' })  ->  "Logging to Monday"
export function t(key: string, vars: Record<string, string | number> = {}): string {
  // Fall back to English, and then to the key itself, so a missing text is visible but harmless.
  const template = MESSAGES[language][key] ?? MESSAGES.en[key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

// Like t(), for texts that differ between one and several: uses "<key>.one" or "<key>.other".
// {count} is filled in automatically.
export function tn(key: string, count: number, vars: Record<string, string | number> = {}): string {
  return t(`${key}.${count === 1 ? 'one' : 'other'}`, { count: num(count, 1), ...vars })
}

// A number the way the language writes it, rounded to at most "decimals" decimals.
//   num(1050) -> "1,050" (English) or "1.050" (Dutch);  num(12.5, 1) -> "12.5" or "12,5"
export function num(value: number, decimals = 0): string {
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: decimals }).format(value)
}

// A number with exactly this many decimals: fixed(78, 1) -> "78.0" or "78,0"
export function fixed(value: number, decimals: number): string {
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}

// A number as it should appear inside an input field: the language's decimal mark,
// but no thousands separators (those would be read back as decimals).
export function inputNumber(value: number): string {
  const text = String(Math.round(value * 10) / 10)
  return language === 'nl' ? text.replace('.', ',') : text
}

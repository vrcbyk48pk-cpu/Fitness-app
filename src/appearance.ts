// Language and theme together: reading the saved choice, applying it, and saving a new one.
import { saveAppearance } from './db'
import { type Language, setLanguage } from './i18n'
import { applyTheme, isThemeId, type ThemeId } from './themes'

export interface Appearance {
  language: Language
  theme: ThemeId
}

// The choice is kept in two places. The database is the real record (it is part of backups).
// localStorage is a copy that can be read instantly at startup, before the database is open,
// so the app never flashes in the wrong theme or language.
const STORAGE_KEY = 'appearance'

export function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if ((saved.language === 'en' || saved.language === 'nl') && isThemeId(saved.theme)) return saved
  } catch {
    // Nothing saved yet (or it is unreadable): fall through to the defaults.
  }
  // First visit: follow the phone's language.
  return { language: navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en', theme: 'glass' }
}

// Makes the app look and read this way, right now.
export function applyAppearance(appearance: Appearance): void {
  setLanguage(appearance.language)
  applyTheme(appearance.theme)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
}

// Applies a choice and stores it for good.
export async function chooseAppearance(appearance: Appearance): Promise<void> {
  applyAppearance(appearance)
  await saveAppearance(appearance.language, appearance.theme)
}

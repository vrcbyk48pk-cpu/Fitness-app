import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fixed, inputNumber, num, setLanguage, t, tn } from './i18n'
import en from './locales/en.json'
import nl from './locales/nl.json'

afterEach(() => setLanguage('en'))

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

// Every .ts and .tsx file in src (not the tests), as text.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [readFileSync(path, 'utf8')] : []
  })
}

describe('translation files', () => {
  it('have exactly the same keys in English and Dutch', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort())
  })

  it('have no empty texts', () => {
    for (const [key, text] of [...Object.entries(en), ...Object.entries(nl)]) {
      expect(text, key).not.toBe('')
    }
  })

  it('use the same placeholders in both languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(nl[key]), key).toEqual(placeholders(en[key]))
    }
  })

  it('have both forms for every text that depends on a count', () => {
    for (const key of Object.keys(en)) {
      if (key.endsWith('.one')) expect(en).toHaveProperty([key.replace(/\.one$/, '.other')])
      if (key.endsWith('.other')) expect(en).toHaveProperty([key.replace(/\.other$/, '.one')])
    }
  })

  it('contain every key the code asks for', () => {
    const code = sourceFiles(__dirname).join('\n')
    // t('some.key') and tn('some.key', ...)
    for (const match of code.matchAll(/\bt\('([\w.]+)'/g)) expect(en, match[1]).toHaveProperty([match[1]])
    for (const match of code.matchAll(/\btn\('([\w.]+)'/g)) expect(en, match[1]).toHaveProperty([`${match[1]}.one`])
  })

  it('have no text that the code never uses', () => {
    const code = sourceFiles(__dirname).join('\n')
    for (const key of Object.keys(en)) {
      // Keys built at run time, like t(`meal.${meal}`), are checked by their prefix.
      const base = key.replace(/\.(one|other|desc)$/, '')
      const prefix = base.slice(0, base.lastIndexOf('.') + 1)
      const used = code.includes(`'${key}'`) || code.includes(`'${base}'`) || (prefix !== '' && code.includes('`' + prefix + '${'))
      expect(used, key).toBe(true)
    }
  })
})

describe('t and tn', () => {
  it('fills in placeholders', () => {
    expect(t('add.loggingTo', { day: 'Monday' })).toBe('Logging to Monday')
    setLanguage('nl')
    expect(t('add.loggingTo', { day: 'maandag' })).toBe('Je logt voor maandag')
  })

  it('returns the key when a text does not exist', () => {
    expect(t('does.not.exist')).toBe('does.not.exist')
  })

  it('chooses between one and several', () => {
    expect(tn('amount.portions', 1)).toBe('1 portion')
    expect(tn('amount.portions', 2)).toBe('2 portions')
    expect(tn('amount.portions', 1.5)).toBe('1.5 portions')
    setLanguage('nl')
    expect(tn('amount.portions', 1)).toBe('1 portie')
    expect(tn('amount.portions', 1.5)).toBe('1,5 porties')
  })

  it('uses the Dutch words from food labels', () => {
    setLanguage('nl')
    expect(t('nutrient.protein')).toBe('Eiwitten')
    expect(t('nutrient.carbs')).toBe('Koolhydraten')
    expect(t('nutrient.fat')).toBe('Vetten')
    expect(t('nutrient.fibre')).toBe('Vezels')
  })
})

describe('numbers', () => {
  it('formats per language', () => {
    expect(num(1050)).toBe('1,050')
    expect(num(12.54, 1)).toBe('12.5')
    expect(fixed(78, 1)).toBe('78.0')
    setLanguage('nl')
    expect(num(1050)).toBe('1.050')
    expect(num(12.54, 1)).toBe('12,5')
    expect(fixed(78, 1)).toBe('78,0')
  })

  it('writes numbers for input fields without thousands separators', () => {
    expect(inputNumber(1250)).toBe('1250')
    expect(inputNumber(12.5)).toBe('12.5')
    setLanguage('nl')
    expect(inputNumber(1250)).toBe('1250')
    expect(inputNumber(12.5)).toBe('12,5')
  })
})

import { describe, expect, it } from 'vitest'
import { cssVariable, GLASS_DARK, THEME_IDS, THEMES, themeVariables, tokensFor, type ThemeTokens } from './themes'

// ---------- Colour maths for the contrast checks ----------

type Rgba = [number, number, number, number]

// Reads "#RRGGBB" or "rgba(r, g, b, a)".
function parse(colour: string): Rgba {
  if (colour === 'transparent') return [0, 0, 0, 0]
  if (colour.startsWith('#')) {
    const n = parseInt(colour.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const parts = colour.match(/[\d.]+/g)!.map(Number)
  return [parts[0], parts[1], parts[2], parts[3] ?? 1]
}

// Puts a (possibly see-through) colour on top of an opaque one.
function over(top: string, base: string): string {
  const [r, g, b, a] = parse(top)
  const [br, bg, bb] = parse(base)
  const mix = (x: number, y: number) => Math.round(x * a + y * (1 - a))
  return '#' + [mix(r, br), mix(g, bg), mix(b, bb)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function luminance(colour: string): number {
  const [r, g, b] = parse(colour).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// The WCAG contrast ratio between two opaque colours: 1 (none) to 21 (black on white).
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

// Every place where text sits on a background: [what, text colour, background colour].
function textPairs(t: ThemeTokens): [string, string, string][] {
  const card = t.surfaceSolid
  const sheet = over(t.surfaceStrong, card)
  const tab = over(t.tabbarBg, t.bg)
  return [
    ['text on the page', t.text, t.bg],
    ['text on a card', t.text, card],
    ['text on a sheet', t.text, sheet],
    ['secondary text on the page', t.text2, t.bg],
    ['secondary text on a card', t.text2, card],
    ['secondary text on a sheet', t.text2, sheet],
    ['accent text on the page', t.accentText, t.bg],
    ['accent text on a card', t.accentText, card],
    ['button text', t.onPrimary, t.primary],
    ['protein text on a card', t.proteinText, card],
    ['carbs text on a card', t.carbsText, card],
    ['fat text on a card', t.fatText, card],
    ['fibre text on a card', t.fibreText, card],
    ['kcal tile', t.tileKcalText, over(t.tileKcalBg, card)],
    ['protein tile', t.tileProteinText, over(t.tileProteinBg, card)],
    ['carbs tile', t.tileCarbsText, over(t.tileCarbsBg, card)],
    ['fat tile', t.tileFatText, over(t.tileFatBg, card)],
    ['tile label', t.tileLabel, over(t.tileCarbsBg, card)],
    ['text in an input', t.text, over(t.inputBg, card)],
    ['text on a quiet button', t.text, over(t.fill, card)],
    ['tab label', t.tabbarText, tab],
    ['active tab label', t.tabbarActiveText, over(t.tabbarActiveBg, tab)],
  ]
}

const VARIANTS: [string, ThemeTokens][] = [
  ...THEME_IDS.map((id): [string, ThemeTokens] => [id, THEMES[id]]),
  ['glass (dark mode)', tokensFor('glass', true)],
]

describe('theme tokens', () => {
  const tokenNames = Object.keys(THEMES.glass).sort()

  it('has six themes', () => {
    expect(THEME_IDS).toEqual(['glass', 'clay', 'journal', 'gym', 'diner', 'pixel'])
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort())
  })

  it.each(THEME_IDS)('%s defines every token, with a value', (id) => {
    expect(Object.keys(THEMES[id]).sort()).toEqual(tokenNames)
    for (const [token, value] of Object.entries(THEMES[id])) {
      expect(typeof value, token).toBe('string')
      expect(value.trim(), token).not.toBe('')
    }
  })

  it('only overrides existing tokens for dark mode', () => {
    for (const token of Object.keys(GLASS_DARK)) expect(tokenNames).toContain(token)
  })

  it('turns token names into CSS variable names', () => {
    expect(cssVariable('bg')).toBe('--bg')
    expect(cssVariable('cardBorder')).toBe('--card-border')
    expect(cssVariable('radiusXl')).toBe('--radius-xl')
    expect(cssVariable('blob1')).toBe('--blob-1')
    expect(cssVariable('text2')).toBe('--text-2')
    expect(cssVariable('tileKcalBg')).toBe('--tile-kcal-bg')
  })

  it('gives every theme the same set of CSS variables', () => {
    const names = Object.keys(themeVariables('glass')).sort()
    for (const id of THEME_IDS) expect(Object.keys(themeVariables(id)).sort()).toEqual(names)
    expect(Object.keys(themeVariables('glass', true)).sort()).toEqual(names)
  })

  it('uses the colours from the design brief', () => {
    expect(THEMES.glass.bg).toBe('#DBF2FC')
    expect(THEMES.glass.accent).toBe('#FD6E88')
    expect(THEMES.clay.bg).toBe('#EDE7FF')
    expect(THEMES.clay.accent).toBe('#7B61FF')
    expect(THEMES.journal.bg).toBe('#F4EDE3')
    expect(THEMES.journal.accent).toBe('#C4532F')
    expect(THEMES.gym.bg).toBe('#FFE14D')
    expect(THEMES.diner.bg).toBe('#FBEBD3')
    expect(THEMES.diner.accent).toBe('#D9502B')
    expect(THEMES.pixel.bg).toBe('#1B1035')
    expect(THEMES.pixel.accent).toBe('#7CFF6B')
  })

  it('keeps the pixel fonts at their minimum sizes', () => {
    const px = (value: string) => parseInt(value)
    // "Press Start 2P" (headings and numbers): at least 11px. VT323 (body): at least 20px.
    for (const token of ['sizeHeadline', 'sizeTitle', 'sizeLargeTitle', 'sizeDisplay', 'sizeNumber'] as const) {
      expect(px(THEMES.pixel[token]), token).toBeGreaterThanOrEqual(11)
    }
    for (const token of ['sizeCaption', 'sizeSmall', 'sizeBody', 'sizeInput', 'sizeTab'] as const) {
      expect(px(THEMES.pixel[token]), token).toBeGreaterThanOrEqual(20)
    }
  })
})

describe('text contrast (WCAG AA: at least 4.5 to 1)', () => {
  it.each(VARIANTS)('%s', (_name, tokens) => {
    for (const [what, text, background] of textPairs(tokens)) {
      expect(contrast(text, background), `${what}: ${text} on ${background}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  // Large text and icons need 3 to 1.
  it.each(VARIANTS)('%s: the big streak number and the check mark icon (at least 3 to 1)', (_name, tokens) => {
    expect(contrast(tokens.onProtein, tokens.protein)).toBeGreaterThanOrEqual(3)
    expect(contrast(tokens.onAccent, tokens.accent)).toBeGreaterThanOrEqual(3)
  })
})

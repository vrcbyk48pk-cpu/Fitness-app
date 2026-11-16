// The six themes. A theme is nothing more than a value for every design token below.
// applyTheme() writes those values to CSS variables (e.g. cardBorder -> --card-border),
// and styles.css builds every screen from those variables only.

const SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

// Tokens that most themes share. Every theme starts from these and overrides what it needs.
const shared = {
  // ----- Font sizes -----
  sizeCaption: '12px',
  sizeSmall: '14px',
  sizeBody: '16px',
  sizeInput: '17px', // 16px or more stops iOS zooming in on focus
  sizeHeadline: '19px',
  sizeTitle: '22px',
  sizeLargeTitle: '34px',
  sizeDisplay: '46px', // the big calorie number
  sizeNumber: '16px', // values in tiles and rows
  sizeTab: '11px',
  lineHeight: '1.35',
  // ----- Font styling -----
  weightBody: '400',
  weightStrong: '600',
  weightHeading: '800',
  weightNumber: '800',
  headingTransform: 'none',
  headingSpacing: '-0.02em',
  // ----- Shapes -----
  radiusS: '14px',
  radiusM: '22px',
  radiusL: '28px',
  radiusXl: '34px',
  cardRadius: '28px',
  rowRadius: '22px',
  cardPadding: '20px',
  buttonRadius: '999px',
  buttonTransform: 'none',
  inputRadius: '999px',
  tabbarRadius: '999px',
  tabLabelDisplay: 'block',
  tileRadius: '14px',
  tileAspect: 'auto',
  tileBorder: 'none',
  tileInset: '0 0 0 0 transparent',
  tileShadowY: '0px',
  // ----- Progress bars -----
  barHeight: '10px',
  barRadius: '999px',
  barBorder: 'none',
  barMask: 'none', // a mask cuts the bar into segments (Pixel arcade)
  // ----- Dividers between plain rows -----
  divider: 'none',
  // ----- Decorations that only some themes use -----
  cardBackdrop: 'none', // the frosted-glass blur
  blobOpacity: '0',
  blob1: 'transparent',
  blob2: 'transparent',
  blob3: 'transparent',
  headerStripes: 'none',
  stripesHeight: '0px',
  ringDisplay: 'block', // the calorie ring
  energyDisplay: 'none', // the segmented energy bar (instead of the ring)
  headlineDisplay: 'none', // the editorial sentence on Today
}

// Every token a theme must define.
export type ThemeTokens = typeof shared & {
  // ----- Colours -----
  bg: string
  statusBar: string // the colour of the iPhone status bar area
  text: string
  text2: string // secondary text
  accent: string // ring, progress, highlights
  accentText: string // the accent as small text (darker where the accent is too pale to read)
  onAccent: string
  primary: string // main buttons
  onPrimary: string
  surface: string // cards and rows
  surfaceStrong: string // sheets
  surfaceSolid: string // what a card looks like as one opaque colour (used for the contrast test)
  fill: string // quiet buttons, tracks
  fillStrong: string
  scrim: string // the dimmed layer behind a sheet
  inputBg: string
  over: string // bars and ring when over the target
  // Macros: the colour for bars, and a readable version for small text.
  protein: string
  proteinText: string
  onProtein: string
  carbs: string
  carbsText: string
  fat: string
  fatText: string
  fibre: string
  fibreText: string
  // Macro tiles
  tileKcalBg: string
  tileProteinBg: string
  tileCarbsBg: string
  tileFatBg: string
  tileKcalText: string
  tileProteinText: string
  tileCarbsText: string
  tileFatText: string
  tileLabel: string
  // Tab bar
  tabbarBg: string
  tabbarText: string
  tabbarActiveBg: string
  tabbarActiveText: string
  tabbarBorder: string
  tabbarShadow: string
  // ----- Borders and shadows (complete CSS values) -----
  cardBorder: string // on all four sides
  cardRule: string // top and bottom only (lets a theme use rules instead of a box)
  cardShadow: string
  rowBorder: string
  rowRule: string // the bottom edge of a row
  rowShadow: string
  chipBg: string // secondary buttons and segmented controls
  chipBorder: string
  chipShadow: string
  buttonBorder: string
  buttonShadow: string
  inputBorder: string
  // ----- Fonts -----
  fontHeading: string
  fontBody: string
  fontNumber: string
}

export type ThemeId = 'glass' | 'clay' | 'journal' | 'gym' | 'diner' | 'pixel'

export const THEME_IDS: ThemeId[] = ['glass', 'clay', 'journal', 'gym', 'diner', 'pixel']

const INTER = `'Inter', ${SYSTEM_FONT}`

export const THEMES: Record<ThemeId, ThemeTokens> = {
  // 1. Liquid glass: frosted white cards over soft blue and pink blobs.
  glass: {
    ...shared,
    bg: '#DBF2FC',
    statusBar: '#DBF2FC',
    text: '#072D59',
    text2: '#3D5A80',
    accent: '#FD6E88',
    accentText: '#A51C38',
    onAccent: '#072D59',
    primary: '#072D59',
    onPrimary: '#DBF2FC',
    surface: 'rgba(255, 255, 255, 0.55)',
    surfaceStrong: 'rgba(236, 248, 254, 0.84)',
    surfaceSolid: '#EFF9FD',
    fill: 'rgba(7, 45, 89, 0.07)',
    fillStrong: 'rgba(7, 45, 89, 0.13)',
    scrim: 'rgba(4, 27, 54, 0.32)',
    inputBg: 'rgba(7, 45, 89, 0.07)',
    over: '#A51C38',
    protein: '#2F7DE1',
    proteinText: '#1B5CB5',
    onProtein: '#FFFFFF',
    carbs: '#F0A050',
    carbsText: '#8C4A00',
    fat: '#8C7CF0',
    fatText: '#5441CC',
    fibre: '#2FB89A',
    fibreText: '#0F6F5B',
    tileKcalBg: 'rgba(7, 45, 89, 0.07)',
    tileProteinBg: 'rgba(7, 45, 89, 0.07)',
    tileCarbsBg: 'rgba(7, 45, 89, 0.07)',
    tileFatBg: 'rgba(7, 45, 89, 0.07)',
    tileKcalText: '#A51C38',
    tileProteinText: '#1B5CB5',
    tileCarbsText: '#8C4A00',
    tileFatText: '#5441CC',
    tileLabel: '#3D5A80',
    tabbarBg: 'rgba(255, 255, 255, 0.55)',
    tabbarText: '#3D5A80',
    tabbarActiveBg: 'rgba(253, 110, 136, 0.18)',
    tabbarActiveText: '#A51C38',
    tabbarBorder: '1px solid rgba(255, 255, 255, 0.7)',
    tabbarShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 32px rgba(7, 45, 89, 0.13)',
    cardBorder: '1px solid rgba(255, 255, 255, 0.7)',
    cardRule: '1px solid rgba(255, 255, 255, 0.7)',
    cardShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 32px rgba(7, 45, 89, 0.13)',
    cardBackdrop: 'blur(26px) saturate(180%)',
    rowBorder: '1px solid rgba(255, 255, 255, 0.7)',
    rowRule: '1px solid rgba(255, 255, 255, 0.7)',
    rowShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 32px rgba(7, 45, 89, 0.13)',
    chipBg: 'rgba(255, 255, 255, 0.55)',
    chipBorder: '1px solid rgba(255, 255, 255, 0.7)',
    chipShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 6px 20px rgba(7, 45, 89, 0.13)',
    buttonBorder: 'none',
    buttonShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 8px 22px rgba(7, 45, 89, 0.13)',
    inputBorder: '1.5px solid transparent',
    blobOpacity: '0.55',
    blob1: '#6DB6EE',
    blob2: '#3C8FDC',
    blob3: '#FD9DB0',
    fontHeading: INTER,
    fontBody: INTER,
    fontNumber: INTER,
  },

  // 2. Soft clay: solid white shapes with chunky offset shadows.
  clay: {
    ...shared,
    bg: '#EDE7FF',
    statusBar: '#EDE7FF',
    text: '#2B2350',
    text2: '#5A5280',
    accent: '#7B61FF',
    accentText: '#5B3FE0',
    onAccent: '#FFFFFF',
    primary: '#6A4EF2', // a touch darker than the accent, so white button text is readable
    onPrimary: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceStrong: '#FFFFFF',
    surfaceSolid: '#FFFFFF',
    fill: '#F1ECFF',
    fillStrong: '#DDD3FA',
    scrim: 'rgba(43, 35, 80, 0.4)',
    inputBg: '#F6F2FF',
    over: '#C2255C',
    protein: '#35C08B',
    proteinText: '#0C7550',
    onProtein: '#12382A',
    carbs: '#F2B90C',
    carbsText: '#7F5B00',
    fat: '#FF8C68',
    fatText: '#AD3F1C',
    fibre: '#4FA8EA',
    fibreText: '#14639F',
    tileKcalBg: '#DCD3FF',
    tileProteinBg: '#B8F0D8',
    tileCarbsBg: '#FFE79A',
    tileFatBg: '#FFC9B5',
    tileKcalText: '#2B2350',
    tileProteinText: '#2B2350',
    tileCarbsText: '#2B2350',
    tileFatText: '#2B2350',
    tileLabel: '#3F3768',
    tabbarBg: '#2B2350',
    tabbarText: '#C4BCE8',
    tabbarActiveBg: '#6A4EF2',
    tabbarActiveText: '#FFFFFF',
    tabbarBorder: 'none',
    tabbarShadow: '0 6px 0 #17123A',
    cardBorder: 'none',
    cardRule: 'none',
    cardShadow: '0 6px 0 #CFC3F5',
    rowBorder: 'none',
    rowRule: 'none',
    rowShadow: '0 5px 0 #CFC3F5',
    chipBg: '#FFFFFF',
    chipBorder: 'none',
    chipShadow: '0 4px 0 #CFC3F5',
    buttonBorder: 'none',
    buttonShadow: '0 5px 0 #4631B0',
    inputBorder: '2px solid #DDD3FA',
    radiusS: '18px',
    radiusM: '28px',
    radiusL: '32px',
    radiusXl: '36px',
    cardRadius: '32px',
    rowRadius: '28px',
    tileRadius: '22px',
    tileShadowY: '5px',
    barHeight: '14px',
    weightBody: '700',
    weightStrong: '800',
    weightHeading: '900',
    weightNumber: '900',
    headingSpacing: '-0.01em',
    fontHeading: `'Nunito', ${SYSTEM_FONT}`,
    fontBody: `'Nunito', ${SYSTEM_FONT}`,
    fontNumber: `'Nunito', ${SYSTEM_FONT}`,
  },

  // 3. Kitchen journal: a printed page, with rules and dashed lines instead of cards.
  journal: {
    ...shared,
    bg: '#F4EDE3',
    statusBar: '#F4EDE3',
    text: '#1F3B2D',
    text2: '#4E6457',
    accent: '#C4532F',
    accentText: '#A0401F',
    onAccent: '#FFFFFF',
    primary: '#1F3B2D',
    onPrimary: '#F4EDE3',
    surface: 'transparent',
    surfaceStrong: '#FBF6EE',
    surfaceSolid: '#F4EDE3',
    fill: 'rgba(31, 59, 45, 0.08)',
    fillStrong: 'rgba(31, 59, 45, 0.16)',
    scrim: 'rgba(31, 59, 45, 0.35)',
    inputBg: '#FBF6EE',
    over: '#A0401F',
    protein: '#2F6B4F',
    proteinText: '#2A6147',
    onProtein: '#F4EDE3',
    carbs: '#C98A2B',
    carbsText: '#7A5210',
    fat: '#8A5A83',
    fatText: '#74486E',
    fibre: '#6F9A5B',
    fibreText: '#3F6632',
    tileKcalBg: 'rgba(31, 59, 45, 0.07)',
    tileProteinBg: 'rgba(31, 59, 45, 0.07)',
    tileCarbsBg: 'rgba(31, 59, 45, 0.07)',
    tileFatBg: 'rgba(31, 59, 45, 0.07)',
    tileKcalText: '#A0401F',
    tileProteinText: '#2A6147',
    tileCarbsText: '#7A5210',
    tileFatText: '#74486E',
    tileLabel: '#4E6457',
    tabbarBg: '#FBF6EE',
    tabbarText: '#4E6457',
    tabbarActiveBg: '#1F3B2D',
    tabbarActiveText: '#F4EDE3',
    tabbarBorder: '1px solid #1F3B2D',
    tabbarShadow: 'none',
    cardBorder: 'none',
    cardRule: '1px solid #1F3B2D',
    cardShadow: 'none',
    cardPadding: '20px 2px',
    cardRadius: '0px',
    rowBorder: 'none',
    rowRule: '1px dashed rgba(31, 59, 45, 0.5)',
    rowShadow: 'none',
    rowRadius: '0px',
    chipBg: '#FBF6EE',
    chipBorder: '1px solid #1F3B2D',
    chipShadow: 'none',
    buttonBorder: 'none',
    buttonShadow: 'none',
    inputBorder: '1px solid rgba(31, 59, 45, 0.45)',
    tileRadius: '6px',
    radiusS: '6px',
    radiusM: '10px',
    radiusL: '14px',
    radiusXl: '22px',
    divider: '1px dashed rgba(31, 59, 45, 0.4)',
    barHeight: '6px',
    weightHeading: '700',
    weightNumber: '700',
    headingSpacing: '-0.015em',
    headlineDisplay: 'block',
    fontHeading: "'Fraunces', Georgia, serif",
    fontBody: `'DM Sans', ${SYSTEM_FONT}`,
    fontNumber: "'Fraunces', Georgia, serif",
  },

  // 4. Gym poster: loud yellow, thick black outlines, hard shadows.
  gym: {
    ...shared,
    bg: '#FFE14D',
    statusBar: '#FFE14D',
    text: '#0D0D0D',
    text2: '#3A3A3A',
    accent: '#FF3D8B',
    accentText: '#B4005A',
    onAccent: '#0D0D0D',
    primary: '#0D0D0D',
    onPrimary: '#FFE14D',
    surface: '#FFFFFF',
    surfaceStrong: '#FFFFFF',
    surfaceSolid: '#FFFFFF',
    fill: 'rgba(13, 13, 13, 0.08)',
    fillStrong: 'rgba(13, 13, 13, 0.18)',
    scrim: 'rgba(13, 13, 13, 0.5)',
    inputBg: '#FFFFFF',
    over: '#B4005A',
    protein: '#19C98B',
    proteinText: '#08704B',
    onProtein: '#0D0D0D',
    carbs: '#FF5FB8',
    carbsText: '#A8005F',
    fat: '#3F97F5',
    fatText: '#0F57AB',
    fibre: '#FF8A00',
    fibreText: '#8F4A00',
    tileKcalBg: '#FFE14D',
    tileProteinBg: '#7DF9C7',
    tileCarbsBg: '#FF9AD5',
    tileFatBg: '#8EC5FF',
    tileKcalText: '#0D0D0D',
    tileProteinText: '#0D0D0D',
    tileCarbsText: '#0D0D0D',
    tileFatText: '#0D0D0D',
    tileLabel: '#0D0D0D',
    tabbarBg: '#FFFFFF',
    tabbarText: '#3A3A3A',
    tabbarActiveBg: '#0D0D0D',
    tabbarActiveText: '#FFE14D',
    tabbarBorder: '3px solid #0D0D0D',
    tabbarShadow: '5px 5px 0 #0D0D0D',
    cardBorder: '3px solid #0D0D0D',
    cardRule: '3px solid #0D0D0D',
    cardShadow: '6px 6px 0 #0D0D0D',
    rowBorder: '3px solid #0D0D0D',
    rowRule: '3px solid #0D0D0D',
    rowShadow: '4px 4px 0 #0D0D0D',
    chipBg: '#FFFFFF',
    chipBorder: '3px solid #0D0D0D',
    chipShadow: '3px 3px 0 #0D0D0D',
    buttonBorder: '3px solid #0D0D0D',
    buttonShadow: 'none',
    inputBorder: '3px solid #0D0D0D',
    tileBorder: '3px solid #0D0D0D',
    radiusS: '10px',
    radiusM: '16px',
    radiusL: '20px',
    radiusXl: '24px',
    cardRadius: '20px',
    rowRadius: '16px',
    tileRadius: '12px',
    barHeight: '14px',
    barBorder: '2px solid #0D0D0D',
    weightStrong: '700',
    weightHeading: '400', // Anton only has one weight, and it is already heavy
    weightNumber: '400',
    headingTransform: 'uppercase',
    headingSpacing: '0.01em',
    buttonTransform: 'uppercase',
    sizeLargeTitle: '40px',
    sizeTitle: '25px',
    sizeHeadline: '21px',
    sizeDisplay: '58px',
    sizeNumber: '20px',
    fontHeading: "'Anton', Impact, sans-serif",
    fontBody: INTER,
    fontNumber: "'Anton', Impact, sans-serif",
  },

  // 5. Seventies diner: warm cream, brown outlines, a striped header and round plates.
  diner: {
    ...shared,
    bg: '#FBEBD3',
    statusBar: '#FBEBD3',
    text: '#4A2511',
    text2: '#75472C',
    accent: '#D9502B',
    accentText: '#B03A18',
    onAccent: '#FFFFFF',
    primary: '#BC421E', // a touch darker than the accent, so the button text is readable
    onPrimary: '#FFF7EA',
    surface: '#FFFFFF',
    surfaceStrong: '#FFFDF8',
    surfaceSolid: '#FFFFFF',
    fill: 'rgba(74, 37, 17, 0.08)',
    fillStrong: 'rgba(74, 37, 17, 0.18)',
    scrim: 'rgba(74, 37, 17, 0.45)',
    inputBg: '#FFF7EA',
    over: '#B03A18',
    protein: '#2E9C86',
    proteinText: '#1B6B5B',
    onProtein: '#FFFFFF',
    carbs: '#F2A33A',
    carbsText: '#8A5200',
    fat: '#9A62AC',
    fatText: '#74447F',
    fibre: '#7C9A2B',
    fibreText: '#4D6510',
    tileKcalBg: '#FFF7EA',
    tileProteinBg: '#FFF7EA',
    tileCarbsBg: '#FFF7EA',
    tileFatBg: '#FFF7EA',
    tileKcalText: '#B03A18',
    tileProteinText: '#1B6B5B',
    tileCarbsText: '#8A5200',
    tileFatText: '#74447F',
    tileLabel: '#75472C',
    tabbarBg: '#4A2511',
    tabbarText: '#EBCFA8',
    tabbarActiveBg: '#F7CB5B',
    tabbarActiveText: '#4A2511',
    tabbarBorder: 'none',
    tabbarShadow: '0 6px 0 #F2A33A',
    cardBorder: '3px solid #4A2511',
    cardRule: '3px solid #4A2511',
    cardShadow: '5px 5px 0 #F2A33A',
    rowBorder: '3px solid #4A2511',
    rowRule: '3px solid #4A2511',
    rowShadow: 'none',
    chipBg: '#FFFFFF',
    chipBorder: '3px solid #4A2511',
    chipShadow: 'none',
    buttonBorder: '3px solid #4A2511',
    buttonShadow: 'none',
    inputBorder: '2px solid #4A2511',
    // Plates: round tiles with a rim.
    tileRadius: '50%',
    tileAspect: '1',
    tileBorder: '3px solid #4A2511',
    tileInset: 'inset 0 0 0 5px #FFFFFF, inset 0 0 0 7px rgba(74, 37, 17, 0.3)',
    radiusS: '12px',
    radiusM: '18px',
    radiusL: '24px',
    radiusXl: '28px',
    cardRadius: '24px',
    rowRadius: '18px',
    divider: '2px dotted rgba(74, 37, 17, 0.45)',
    barHeight: '12px',
    barBorder: '2px solid #4A2511',
    headerStripes: 'linear-gradient(#D9502B 0 33.4%, #F2A33A 33.4% 66.7%, #F7CB5B 66.7%)',
    stripesHeight: '24px',
    weightHeading: '400', // Shrikhand has one weight
    weightNumber: '400',
    headingSpacing: '0',
    sizeNumber: '17px',
    fontHeading: "'Shrikhand', Georgia, serif",
    fontBody: `'Work Sans', ${SYSTEM_FONT}`,
    fontNumber: "'Shrikhand', Georgia, serif",
  },

  // 6. Pixel arcade: a dark screen, blocky panels, an energy bar and XP bars.
  pixel: {
    ...shared,
    bg: '#1B1035',
    statusBar: '#1B1035',
    text: '#F4EEFF',
    text2: '#C2B3EE',
    accent: '#7CFF6B',
    accentText: '#7CFF6B',
    onAccent: '#1B1035',
    primary: '#7CFF6B',
    onPrimary: '#1B1035',
    surface: '#2A1A52',
    surfaceStrong: '#2A1A52',
    surfaceSolid: '#2A1A52',
    fill: 'rgba(255, 255, 255, 0.09)',
    fillStrong: 'rgba(255, 255, 255, 0.2)',
    scrim: 'rgba(8, 4, 20, 0.7)',
    inputBg: '#1B1035',
    over: '#FF6B6B',
    protein: '#6FE3FF',
    proteinText: '#6FE3FF',
    onProtein: '#1B1035',
    carbs: '#FFD84D',
    carbsText: '#FFD84D',
    fat: '#FF7AC6',
    fatText: '#FF7AC6',
    fibre: '#B79CFF',
    fibreText: '#C7B3FF',
    tileKcalBg: '#1B1035',
    tileProteinBg: '#1B1035',
    tileCarbsBg: '#1B1035',
    tileFatBg: '#1B1035',
    tileKcalText: '#7CFF6B',
    tileProteinText: '#6FE3FF',
    tileCarbsText: '#FFD84D',
    tileFatText: '#FF7AC6',
    tileLabel: '#C2B3EE',
    tabbarBg: '#2A1A52',
    tabbarText: '#C2B3EE',
    tabbarActiveBg: '#7CFF6B',
    tabbarActiveText: '#1B1035',
    tabbarBorder: '3px solid #5B3FA6',
    tabbarShadow: '4px 4px 0 #0D0720',
    cardBorder: '3px solid #5B3FA6',
    cardRule: '3px solid #5B3FA6',
    cardShadow: '4px 4px 0 #0D0720',
    rowBorder: '3px solid #5B3FA6',
    rowRule: '3px solid #5B3FA6',
    rowShadow: 'none',
    chipBg: '#2A1A52',
    chipBorder: '3px solid #5B3FA6',
    chipShadow: 'none',
    buttonBorder: 'none',
    buttonShadow: '4px 4px 0 #0D0720',
    inputBorder: '3px solid #5B3FA6',
    tileBorder: '2px solid #5B3FA6',
    radiusS: '2px',
    radiusM: '4px',
    radiusL: '6px',
    radiusXl: '8px',
    cardRadius: '6px',
    rowRadius: '4px',
    buttonRadius: '4px',
    inputRadius: '4px',
    tabbarRadius: '6px',
    tabLabelDisplay: 'none', // icons only: VT323 at its minimum size does not fit under four icons
    tileRadius: '4px',
    barHeight: '16px',
    barRadius: '0px',
    barBorder: '2px solid #5B3FA6',
    // Cuts every bar into blocks, like an XP bar.
    barMask: 'repeating-linear-gradient(90deg, #000 0 9px, transparent 9px 12px)',
    divider: '2px dashed #5B3FA6',
    ringDisplay: 'none',
    energyDisplay: 'block',
    // "Press Start 2P" is very wide, so headings are set small; VT323 is small, so body text is set large.
    sizeCaption: '20px',
    sizeSmall: '20px',
    sizeBody: '22px',
    sizeInput: '22px',
    sizeHeadline: '12px',
    sizeTitle: '13px',
    sizeLargeTitle: '19px',
    sizeDisplay: '24px',
    sizeNumber: '11px',
    sizeTab: '20px',
    lineHeight: '1.15',
    weightStrong: '400',
    weightHeading: '400',
    weightNumber: '400',
    headingTransform: 'uppercase',
    headingSpacing: '0',
    buttonTransform: 'uppercase',
    fontHeading: "'Press Start 2P', monospace",
    fontBody: "'VT323', monospace",
    fontNumber: "'Press Start 2P', monospace",
  },
}

// Liquid glass follows the iPhone's dark mode. These values replace the light ones.
export const GLASS_DARK: Partial<ThemeTokens> = {
  bg: '#041B36',
  statusBar: '#041B36',
  text: '#DBF2FC',
  text2: '#8FB3D9',
  accentText: '#FF94A8',
  primary: '#FD6E88',
  onPrimary: '#041B36',
  surface: 'rgba(219, 242, 252, 0.08)',
  surfaceStrong: 'rgba(9, 37, 71, 0.84)',
  surfaceSolid: '#152C46',
  fill: 'rgba(219, 242, 252, 0.09)',
  fillStrong: 'rgba(219, 242, 252, 0.17)',
  scrim: 'rgba(0, 8, 20, 0.55)',
  inputBg: 'rgba(219, 242, 252, 0.09)',
  over: '#FFB9C5',
  protein: '#5BA0F2',
  proteinText: '#82B8F6',
  onProtein: '#041B36',
  carbsText: '#F6B777',
  fatText: '#A99CFF',
  fibre: '#4FD1B3',
  fibreText: '#4FD1B3',
  tileKcalBg: 'rgba(219, 242, 252, 0.09)',
  tileProteinBg: 'rgba(219, 242, 252, 0.09)',
  tileCarbsBg: 'rgba(219, 242, 252, 0.09)',
  tileFatBg: 'rgba(219, 242, 252, 0.09)',
  tileKcalText: '#FF94A8',
  tileProteinText: '#82B8F6',
  tileCarbsText: '#F6B777',
  tileFatText: '#A99CFF',
  tileLabel: '#8FB3D9',
  tabbarBg: 'rgba(219, 242, 252, 0.08)',
  tabbarText: '#8FB3D9',
  tabbarActiveText: '#FF94A8',
  tabbarBorder: '1px solid rgba(219, 242, 252, 0.14)',
  tabbarShadow: 'inset 0 1px 0 rgba(219, 242, 252, 0.26), 0 10px 32px rgba(0, 0, 0, 0.4)',
  cardBorder: '1px solid rgba(219, 242, 252, 0.14)',
  cardRule: '1px solid rgba(219, 242, 252, 0.14)',
  cardShadow: 'inset 0 1px 0 rgba(219, 242, 252, 0.26), 0 10px 32px rgba(0, 0, 0, 0.4)',
  rowBorder: '1px solid rgba(219, 242, 252, 0.14)',
  rowRule: '1px solid rgba(219, 242, 252, 0.14)',
  rowShadow: 'inset 0 1px 0 rgba(219, 242, 252, 0.26), 0 10px 32px rgba(0, 0, 0, 0.4)',
  chipBg: 'rgba(219, 242, 252, 0.08)',
  chipBorder: '1px solid rgba(219, 242, 252, 0.14)',
  chipShadow: 'inset 0 1px 0 rgba(219, 242, 252, 0.26), 0 6px 20px rgba(0, 0, 0, 0.4)',
  buttonShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 8px 22px rgba(0, 0, 0, 0.4)',
  blobOpacity: '0.34',
  blob1: '#1A5FB4',
  blob2: '#0E4A94',
  blob3: '#FD6E88',
}

// The tokens of a theme, taking dark mode into account for Liquid glass.
export function tokensFor(id: ThemeId, dark = false): ThemeTokens {
  return id === 'glass' && dark ? { ...THEMES.glass, ...GLASS_DARK } : THEMES[id]
}

// cardBorder -> --card-border, radiusXl -> --radius-xl, blob1 -> --blob-1
export function cssVariable(token: string): string {
  return '--' + token.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()).replace(/(\d+)/, '-$1')
}

// All tokens of a theme as CSS variables, ready to put on an element.
// Used for the whole page, and for the small previews in the theme gallery.
export function themeVariables(id: ThemeId, dark = false): Record<string, string> {
  const variables: Record<string, string> = {}
  for (const [token, value] of Object.entries(tokensFor(id, dark))) variables[cssVariable(token)] = value
  return variables
}

// ---------- Fonts ----------

// Each theme's fonts are separate files, downloaded only when that theme is shown.
// (import() of a CSS file makes the build tool create a separate chunk for it.)
const FONT_LOADERS: Record<ThemeId, () => Promise<unknown>> = {
  glass: () =>
    Promise.all([
      import('@fontsource/inter/latin-400.css'),
      import('@fontsource/inter/latin-600.css'),
      import('@fontsource/inter/latin-700.css'),
      import('@fontsource/inter/latin-800.css'),
    ]),
  clay: () =>
    Promise.all([
      import('@fontsource/nunito/latin-700.css'),
      import('@fontsource/nunito/latin-800.css'),
      import('@fontsource/nunito/latin-900.css'),
    ]),
  journal: () =>
    Promise.all([
      import('@fontsource/fraunces/latin-700.css'),
      import('@fontsource/dm-sans/latin-400.css'),
      import('@fontsource/dm-sans/latin-600.css'),
    ]),
  gym: () =>
    Promise.all([
      import('@fontsource/anton/latin-400.css'),
      import('@fontsource/inter/latin-400.css'),
      import('@fontsource/inter/latin-700.css'),
    ]),
  diner: () =>
    Promise.all([
      import('@fontsource/shrikhand/latin-400.css'),
      import('@fontsource/work-sans/latin-400.css'),
      import('@fontsource/work-sans/latin-600.css'),
    ]),
  pixel: () =>
    Promise.all([import('@fontsource/press-start-2p/latin-400.css'), import('@fontsource/vt323/latin-400.css')]),
}

export function loadFonts(id: ThemeId): void {
  // If a font fails to load (offline, first visit), the fallback font in the token is used.
  FONT_LOADERS[id]().catch(() => {})
}

// ---------- Applying a theme to the whole app ----------

export function applyTheme(id: ThemeId): void {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const root = document.documentElement
  for (const [name, value] of Object.entries(themeVariables(id, dark))) root.style.setProperty(name, value)
  root.dataset.theme = id

  // The colour of the iPhone status bar area.
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
  }
  meta.content = tokensFor(id, dark).statusBar

  loadFonts(id)
}

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId)
}

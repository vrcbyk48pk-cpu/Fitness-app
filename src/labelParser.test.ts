import { describe, expect, it } from 'vitest'
import { addsUp, type LabelValues, parseLabel } from './labelParser'

// Most tests are about the four main values; this leaves fibre, sugar and salt out of the comparison.
function main(values: LabelValues): LabelValues {
  const { fibre: _fibre, sugar: _sugar, salt: _salt, ...rest } = values
  return rest
}

describe('parseLabel: clean labels', () => {
  it('reads a Dutch label with one column', () => {
    const text = `Voedingswaarden per 100 g
Energie 1046 kJ / 250 kcal
Vetten 12,5 g
waarvan verzadigd 4,1 g
Koolhydraten 20 g
waarvan suikers 3,2 g
Vezels 2,5 g
Eiwitten 13 g
Zout 1,1 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 250, fat: 12.5, carbs: 20, protein: 13 })
  })

  it('reads an Albert Heijn style label with per 100 g and per portion columns', () => {
    const text = `Voedingswaarden
Deze verpakking bevat 4 porties
Per 100 Gram Per Portie (30 gram)
Energie 2058 kJ (492 kcal) 617 kJ (148 kcal)
Vet 24 g 7,2 g
Waarvan verzadigd 11 g 3,3 g
Koolhydraten 61 g 18 g
Waarvan suikers 29 g 8,7 g
Voedingsvezel 3,6 g 1,1 g
Eiwitten 6,5 g 2 g
Zout 0,63 g 0,19 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 492, fat: 24, carbs: 61, protein: 6.5 })
  })

  it('uses the per 100 g column when the portion column comes first', () => {
    const text = `Voedingswaarde per portie (25 g) per 100 g
Energie 523 kJ / 125 kcal 2092 kJ / 500 kcal
Vetten 6,3 g 25 g
waarvan verzadigde vetzuren 1,0 g 4,0 g
Koolhydraten 13,8 g 55 g
waarvan suikers 0,5 g 2,0 g
Eiwitten 2,1 g 8,5 g
Zout 0,3 g 1,2 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 500, fat: 25, carbs: 55, protein: 8.5 })
  })

  it('reads an English label and skips the "of which" lines', () => {
    const text = `Nutrition Information
Typical values per 100g
Energy 1569kJ / 372kcal
Fat 2.0g
of which saturates 0.4g
Carbohydrate 72g
of which sugars 3.5g
Fibre 3.0g
Protein 12.5g
Salt 0.01g`
    expect(main(parseLabel(text))).toEqual({ kcal: 372, fat: 2, carbs: 72, protein: 12.5 })
  })

  it('reads a bilingual Lidl style label with reference intake percentages', () => {
    const text = `Voedingswaarden / Nutrition facts per 100 ml
Energie / Energy 268 kJ / 64 kcal 3 %
Vetten / Fat 3,6 g 5 %
waarvan verzadigde vetzuren / of which saturates 2,4 g 12 %
Koolhydraten / Carbohydrate 4,7 g 2 %
waarvan suikers / of which sugars 4,7 g 5 %
Eiwitten / Protein 3,3 g 7 %
Zout / Salt 0,1 g 2 %`
    expect(main(parseLabel(text))).toEqual({ kcal: 64, fat: 3.6, carbs: 4.7, protein: 3.3 })
  })

  it('reads a US style label and ignores saturated and trans fat', () => {
    const text = `Amount per 100 g
Total Fat 8 g
Saturated Fat 3 g
Trans Fat 0 g
Total Carbohydrate 37 g
Total Sugars 12 g
Protein 3 g
Energy 230 kcal`
    expect(main(parseLabel(text))).toEqual({ kcal: 230, fat: 8, carbs: 37, protein: 3 })
  })
})

describe('parseLabel: energy', () => {
  it('finds the kcal on the line below the kJ', () => {
    const text = `Per 100 g
Energie 1883 kJ
450 kcal
Vetten 18 g
Koolhydraten 62 g
Eiwitten 7,5 g`
    expect(parseLabel(text).kcal).toBe(450)
  })

  it('converts kJ when there is no kcal', () => {
    const text = `Energie 1046 kJ
Vetten 3 g
Koolhydraten 10 g
Eiwitten 5 g`
    expect(parseLabel(text).kcal).toBe(250)
  })

  it('understands "Energie (kJ/kcal) 1046/250" where the units come before the numbers', () => {
    const text = `Gemiddelde voedingswaarde per 100 g
Energie (kJ/kcal) 1046/250
Vetten (g) 9,0
waarvan verzadigde vetzuren (g) 1,2
Koolhydraten (g) 30
waarvan suikers (g) 4,5
Eiwitten (g) 11`
    expect(main(parseLabel(text))).toEqual({ kcal: 250, fat: 9, carbs: 30, protein: 11 })
  })

  it('finds kcal even when the word "Energie" was not read', () => {
    const text = `Fnerqle 880 kJ / 210 kcal
Vetten 10 g
Koolhydraten 15 g
Eiwitten 14 g`
    expect(parseLabel(text).kcal).toBe(210)
  })
})

describe('parseLabel: messy OCR', () => {
  it('survives misread letters in the keywords and units', () => {
    const text = `Voedingswaarden per 1OO g
Energle 1548 kl / 37O kcaI
Ve1ten 5,2 g
waarvan verzadlgd 1,O g
Koo1hydraten 65 g
waarvan sulkers 2,1 g
Eiwltten l2,5 g
Zout O,O3 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 370, fat: 5.2, carbs: 65, protein: 12.5 })
  })

  it('handles table borders, stray symbols and split decimals', () => {
    const text = `| Voedingswaarden | per 100g |
| Energie | 435 kJ/104 kcal |
| Vetten: | 2 ,4 g |
| - waarvan verzadigd | 0, 6 g |
| Koolhydraten: | 4,5g |
| - waarvan suikers | 4,5g |
| Eiwitten: | 16g |
| Zout_ | 0,13g |`
    expect(main(parseLabel(text))).toEqual({ kcal: 104, fat: 2.4, carbs: 4.5, protein: 16 })
  })

  it('reads "<0,5 g" as 0.5 and a plain 0', () => {
    const text = `Per 100 ml
Energie 4 kJ / 1 kcal
Vetten 0 g
Koolhydraten <0,5 g
Eiwitten < 0,5 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 1, fat: 0, carbs: 0.5, protein: 0.5 })
  })

  it('keeps the main value when the sub-row was glued onto the same line', () => {
    const text = `Energie 900 kJ / 215 kcal
Vetten 11 g waarvan verzadigd 6,8 g
Koolhydraten 1,5 g waarvan suikers 1,5 g
Eiwitten 27 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 215, fat: 11, carbs: 1.5, protein: 27 })
  })

  it('leaves out impossible values instead of guessing', () => {
    // More than 100 g per 100 g cannot be right, and no simple fix makes the calories fit.
    const text = `Energie 1046 kJ / 250 kcal
Vetten 480 g
Koolhydraten 20 g
Eiwitten 13 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 250, carbs: 20, protein: 13 })
  })

  it('returns only what it could read from a partial photo', () => {
    const text = `Koolhydraten 20 g
waarvan suikers 3 g
Eiwit`
    expect(main(parseLabel(text))).toEqual({ carbs: 20 })
  })

  it('ignores marketing text that mentions a nutrient without a number', () => {
    const text = `Rijk aan eiwitten!
Bron van vezels
Per 100 g
Energie 300 kJ / 71 kcal
Vetten 0,2 g
Koolhydraten 4 g
Eiwitten 12 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 71, fat: 0.2, carbs: 4, protein: 12 })
  })

  it('returns nothing for text that is not a nutrition label', () => {
    expect(parseLabel('Ingrediënten: water, suiker, zout.\nBewaren op een koele plaats.')).toEqual({})
    expect(parseLabel('')).toEqual({})
    expect(parseLabel('~~ |_ .,; ]]')).toEqual({})
  })
})

// These are real outputs from Tesseract on test photos. It reads the "g" after
// a number as a "9", and sometimes loses the decimal comma.
describe('parseLabel: "g" read as "9"', () => {
  it('reads a real two-column Dutch result', () => {
    const text = `Ingrediënten: volkoren TARWEMEEL 62%, suiker, palmolie, GERSTEMOUTEXTRACT,

zout. Kan sporen van noten bevatten.
Voedingswaarden Per 100 9g Per portie (30 g)
Energie 2058 kJ / 492 kcal 617 KJ / 148 kcal
Vetten 249 729
waarvan verzadigd 119 3,39
Koolhydraten 61,59 189
waarvan suikers 299 8,79
Vezels 3,69 119
Eiwitten 6,59 29
Zout 0,639 0,199
Koel en droog bewaren.`
    expect(main(parseLabel(text))).toEqual({ kcal: 492, fat: 24, carbs: 61.5, protein: 6.5 })
  })

  it('reads a result where only some of the g\'s became 9', () => {
    const text = `Voedingswaarden Per 100 g Per portie (30 g)
Energie 2058 kJ / 492 kcal 617 kJ / 148 kcal
Vetten 249 7,29
Koolhydraten 61,59 18g
Eiwitten 6,59 29`
    expect(main(parseLabel(text))).toEqual({ kcal: 492, fat: 24, carbs: 61.5, protein: 6.5 })
  })

  it('reads a real English result, and leaves out a value whose decimal point was lost', () => {
    const text = `Nutrition per 1009
DN
Energy 1569 kJ / 372 kcal
BJ
Carbohydrate 729
ee — — = = =
of which sugars 3.59
SS
Protein 1259
e.-s
Salt 0.019
oe. __`
    // Protein was 12.5 g but came out as "1259" -> 125: impossible, so it stays empty.
    expect(main(parseLabel(text))).toEqual({ kcal: 372, carbs: 72 })
  })

  it('reads a real result from a tight crop that cut off first letters', () => {
    // Here the "g" became 9, 4, 0, "¢" and "09" in different rows.
    const text = `Joedingswaarden Per 100 g Per portie (30 g)
nergie 2058 kJ / 492 kcal 617 KJ / 148 kcal
Jetten 24 ¢ 7,29
vaarvan verzadigd 119 3,39
<oolhydraten 61,59 189
Naarvan suikers 299 8,74
Vezels 3,60 1,10
Eiwitten 6,509 20
Zout 0,639 0,19 C`
    expect(main(parseLabel(text))).toEqual({ kcal: 492, fat: 24, carbs: 61.5, protein: 6.5 })
  })

  it('removes a glued-on "g" digit when only the calories can tell', () => {
    // Too few numbers to recognise the pattern, but 4*13 + 4*209 + 9*12 is far from 250,
    // while 4*13 + 4*20 + 9*12 = 240 fits.
    const text = `Energie 250 kcal
Vetten 12 g
Koolhydraten 209
Eiwitten 13 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 250, fat: 12, carbs: 20, protein: 13 })
  })

  it('uses the per 100 g column when the portion column comes first', () => {
    const text = `Voedingswaarde per portie (25 9) per 1009
Energie 523 kJ / 125 kcal 2092 kJ / 500 kcal
Vetten 6,39 259
Koolhydraten 13,89 559
Eiwitten 2,19 8,59`
    expect(main(parseLabel(text))).toEqual({ kcal: 500, fat: 25, carbs: 55, protein: 8.5 })
  })

  it('does not touch real values ending in 9 on a label without units', () => {
    const text = `Gemiddelde voedingswaarde per 100 g
Energie (kJ/kcal) 1590/379
Vetten (g) 9,9
waarvan verzadigde vetzuren (g) 1,2
Koolhydraten (g) 59
waarvan suikers (g) 4,5
Eiwitten (g) 11`
    expect(main(parseLabel(text))).toEqual({ kcal: 379, fat: 9.9, carbs: 59, protein: 11 })
  })
})

describe('parseLabel: checking the values against the calories', () => {
  it('puts back a lost decimal comma when that makes the calories fit', () => {
    // Protein 12,5 g was read as "125". 4*12.5 + 4*72 + 9*2 = 356, close to 372 kcal.
    const text = `Energy 1569 kJ / 372 kcal
Fat 2 g
Carbohydrate 72 g
Protein 125 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 372, fat: 2, carbs: 72, protein: 12.5 })
  })

  it('does not guess when more than one fix would work', () => {
    // 20 or 2.0 for either value would both fit: leave the values as they were read.
    const text = `Energie 100 kcal
Vetten 0 g
Koolhydraten 20 g
Eiwitten 20 g`
    expect(main(parseLabel(text))).toEqual({ kcal: 100, fat: 0, carbs: 20, protein: 20 })
  })

  it('addsUp accepts values that fit and rejects values that do not', () => {
    expect(addsUp({ kcal: 250, protein: 13, carbs: 20, fat: 12.5 })).toBe(true)
    expect(addsUp({ kcal: 250, protein: 13, carbs: 20, fat: 72 })).toBe(false)
    // With a value missing there is nothing to check.
    expect(addsUp({ kcal: 250, protein: 13 })).toBe(true)
  })
})

describe('parseLabel: fibre, sugar and salt', () => {
  it('reads them from a Dutch label', () => {
    const text = `Voedingswaarden per 100 g
Energie 1046 kJ / 250 kcal
Vetten 12,5 g
waarvan verzadigd 4,1 g
Koolhydraten 20 g
waarvan suikers 3,2 g
Vezels 2,5 g
Eiwitten 13 g
Zout 1,1 g`
    expect(parseLabel(text)).toEqual({ kcal: 250, fat: 12.5, carbs: 20, protein: 13, fibre: 2.5, sugar: 3.2, salt: 1.1 })
  })

  it('reads them from an English label', () => {
    const text = `Typical values per 100g
Energy 1569kJ / 372kcal
Fat 2.0g
of which saturates 0.4g
Carbohydrate 72g
of which sugars 3.5g
Fibre 3.0g
Protein 12.5g
Salt 0.01g`
    const values = parseLabel(text)
    expect(values.fibre).toBe(3)
    expect(values.sugar).toBe(3.5)
    expect(values.salt).toBe(0.01)
    // "of which saturates" must not be mistaken for the fat or sugar row.
    expect(values.fat).toBe(2)
  })

  it('uses the per 100 g column, also for "Voedingsvezel"', () => {
    const text = `Per 100 Gram Per Portie (30 gram)
Energie 2058 kJ (492 kcal) 617 kJ (148 kcal)
Vet 24 g 7,2 g
Waarvan verzadigd 11 g 3,3 g
Koolhydraten 61 g 18 g
Waarvan suikers 29 g 8,7 g
Voedingsvezel 3,6 g 1,1 g
Eiwitten 6,5 g 2 g
Zout 0,63 g 0,19 g`
    const values = parseLabel(text)
    expect(values.sugar).toBe(29)
    expect(values.fibre).toBe(3.6)
    expect(values.salt).toBe(0.63)
  })

  it('reads sugar when it was glued onto the carbohydrate line', () => {
    const text = `Energie 900 kJ / 215 kcal
Vetten 11 g waarvan verzadigd 6,8 g
Koolhydraten 1,5 g waarvan suikers 1,2 g
Eiwitten 27 g
Zout 1,8 g`
    const values = parseLabel(text)
    expect(values.carbs).toBe(1.5)
    expect(values.sugar).toBe(1.2)
    expect(values.fat).toBe(11) // not the 6,8 of the saturated fat
    expect(values.salt).toBe(1.8)
  })

  it('reads a bilingual label once', () => {
    const text = `Voedingswaarden / Nutrition facts per 100 ml
Energie / Energy 268 kJ / 64 kcal 3 %
Vetten / Fat 3,6 g 5 %
waarvan verzadigde vetzuren / of which saturates 2,4 g 12 %
Koolhydraten / Carbohydrate 4,7 g 2 %
waarvan suikers / of which sugars 4,7 g 5 %
Vezels / Fibre 0 g
Eiwitten / Protein 3,3 g 7 %
Zout / Salt 0,1 g 2 %`
    expect(parseLabel(text)).toEqual({ kcal: 64, fat: 3.6, carbs: 4.7, protein: 3.3, fibre: 0, sugar: 4.7, salt: 0.1 })
  })

  it('ignores saturated fat, trans fat and added sugars on a US style label', () => {
    const text = `Amount per 100 g
Total Fat 8 g
Saturated Fat 3 g
Trans Fat 0 g
Total Carbohydrate 37 g
Dietary Fiber 4 g
Total Sugars 12 g
Includes 10 g Added Sugars
Protein 3 g
Energy 230 kcal`
    const values = parseLabel(text)
    expect(values.fat).toBe(8)
    expect(values.sugar).toBe(12)
    expect(values.fibre).toBe(4)
  })

  it('reads them from real OCR output where every "g" became a "9"', () => {
    const text = `Voedingswaarden Per 100 9g Per portie (30 g)
Energie 2058 kJ / 492 kcal 617 KJ / 148 kcal
Vetten 249 729
waarvan verzadigd 119 3,39
Koolhydraten 61,59 189
waarvan suikers 299 8,79
Vezels 3,69 119
Eiwitten 6,59 29
Zout 0,639 0,199`
    const values = parseLabel(text)
    expect(values.sugar).toBe(29)
    expect(values.fibre).toBe(3.6)
    expect(values.salt).toBe(0.63)
  })

  it('leaves them out when the label does not list them', () => {
    const text = `Energie 1046 kJ / 250 kcal
Vetten 12 g
Koolhydraten 20 g
Eiwitten 13 g`
    const values = parseLabel(text)
    expect(values.fibre).toBeUndefined()
    expect(values.sugar).toBeUndefined()
    expect(values.salt).toBeUndefined()
  })

  it('does not take marketing text for a value', () => {
    const text = `Bron van vezels
Minder suiker!
Per 100 g
Energie 300 kJ / 71 kcal
Vetten 0,2 g
Koolhydraten 4 g
waarvan suikers 3,9 g
Vezels 1,5 g
Eiwitten 12 g`
    const values = parseLabel(text)
    expect(values.fibre).toBe(1.5)
    expect(values.sugar).toBe(3.9)
  })
})

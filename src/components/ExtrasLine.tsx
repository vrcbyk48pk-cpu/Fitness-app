import type { Nutrients } from '../types'
import { fmt } from '../utils'
import { t, num } from '../i18n'

// One line with the fibre, sugar and salt that are known, e.g. "Fibre 3 g · Sugar 5 g · Salt 0.2 g".
// Shows nothing when none of them is known.
export default function ExtrasLine({ fibre, sugar, salt }: Nutrients) {
  const parts: string[] = []
  if (fibre !== undefined) parts.push(t('extras.fibre', { value: fmt(fibre) }))
  if (sugar !== undefined) parts.push(t('extras.sugar', { value: fmt(sugar) }))
  // Salt amounts are small, so show two decimals.
  if (salt !== undefined) parts.push(t('extras.salt', { value: num(salt, 2) }))
  if (parts.length === 0) return null
  return <p className="muted extras">{parts.join(' · ')}</p>
}

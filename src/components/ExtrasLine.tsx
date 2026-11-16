import type { Nutrients } from '../types'
import { fmt } from '../utils'

// One line with the fibre, sugar and salt that are known, e.g. "Fibre 3 g · Sugar 5 g · Salt 0.2 g".
// Shows nothing when none of them is known.
export default function ExtrasLine({ fibre, sugar, salt }: Nutrients) {
  const parts: string[] = []
  if (fibre !== undefined) parts.push(`Fibre ${fmt(fibre)} g`)
  if (sugar !== undefined) parts.push(`Sugar ${fmt(sugar)} g`)
  // Salt amounts are small, so show two decimals.
  if (salt !== undefined) parts.push(`Salt ${Math.round(salt * 100) / 100} g`)
  if (parts.length === 0) return null
  return <p className="muted extras">{parts.join(' · ')}</p>
}

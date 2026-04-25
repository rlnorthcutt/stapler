/**
 * Convert a CSS length string to CSS pixels (at 96 DPI screen resolution).
 *
 * Supported units: px, in, cm, mm, pt, rem, em
 *
 * @param value   CSS length string, e.g. "8.5in", "2rem", "96px"
 * @param element Element used to resolve em units (defaults to document.documentElement)
 * @returns       Number of CSS pixels
 * @throws        Error if the unit is unrecognized or the value cannot be parsed
 */
export function parseToPx(value: string, element?: Element): number {
  const trimmed = value.trim()
  const match = /^(-?[\d.]+)\s*([a-z%]*)$/.exec(trimmed)

  if (!match) {
    throw new Error(`Staple Jam: cannot parse CSS length "${value}"`)
  }

  const num = parseFloat(match[1] ?? '0')
  const unit = match[2] ?? 'px'

  switch (unit) {
    case 'px':
      return num
    case 'in':
      return num * 96
    case 'cm':
      return num * 37.7952756
    case 'mm':
      return num * 3.77952756
    case 'pt':
      return num * (96 / 72)
    case 'rem': {
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      return num * rootFontSize
    }
    case 'em': {
      const el = element ?? document.documentElement
      const fontSize = parseFloat(getComputedStyle(el).fontSize)
      return num * fontSize
    }
    default:
      throw new Error(`Staple Jam: unsupported CSS unit "${unit}" in "${value}"`)
  }
}

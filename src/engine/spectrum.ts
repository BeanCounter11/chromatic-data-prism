export const VISIBLE_MIN_NM = 380
export const VISIBLE_MAX_NM = 750

export type RGB = [number, number, number]

/**
 * Approximate sRGB colour of a single visible wavelength (Dan Bruton's model),
 * with intensity roll-off at the edges of human vision. Channels are 0..1.
 */
export function wavelengthToRgb(nm: number): RGB {
  const w = Math.min(Math.max(nm, VISIBLE_MIN_NM), VISIBLE_MAX_NM)
  let r = 0
  let g = 0
  let b = 0

  if (w < 440) {
    r = -(w - 440) / (440 - 380)
    b = 1
  } else if (w < 490) {
    g = (w - 440) / (490 - 440)
    b = 1
  } else if (w < 510) {
    g = 1
    b = -(w - 510) / (510 - 490)
  } else if (w < 580) {
    r = (w - 510) / (580 - 510)
    g = 1
  } else if (w < 645) {
    r = 1
    g = -(w - 645) / (645 - 580)
  } else {
    r = 1
  }

  let factor = 1
  if (w < 420) factor = 0.3 + (0.7 * (w - 380)) / (420 - 380)
  else if (w > 700) factor = 0.3 + (0.7 * (750 - w)) / (750 - 700)

  const gamma = 0.8
  return [r, g, b].map((c) => (c > 0 ? Math.pow(c * factor, gamma) : 0)) as RGB
}

export function rgbToHex([r, g, b]: RGB): string {
  const h = (c: number) =>
    Math.round(Math.min(Math.max(c, 0), 1) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function wavelengthToHex(nm: number): string {
  return rgbToHex(wavelengthToRgb(nm))
}

export function wavelengthBandName(nm: number): string {
  if (nm < 450) return 'Violet'
  if (nm < 485) return 'Blue'
  if (nm < 500) return 'Cyan'
  if (nm < 565) return 'Green'
  if (nm < 590) return 'Yellow'
  if (nm < 625) return 'Orange'
  return 'Red'
}

/** Wavelength at the centre of spectrum bin `i` of `bins`. */
export function binToWavelength(i: number, bins: number): number {
  return VISIBLE_MIN_NM + ((i + 0.5) / bins) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM)
}

/** Wavelengths of the individual rays traced through the prism. */
export const RAY_WAVELENGTHS = [410, 445, 480, 515, 550, 585, 620, 655, 690]

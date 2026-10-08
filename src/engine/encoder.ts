import { VISIBLE_MAX_NM, VISIBLE_MIN_NM } from './spectrum'

export const SPECTRUM_BINS = 32
export const MAX_INTERNAL_REFLECTIONS = 12
export const IOR_MIN = 1.33
export const IOR_MAX = 2.42

export interface OpticalProfile {
  /** 64-bit hash of the input rendered as 16 hex characters. */
  hash: string
  /** Angle of incidence of the incoming white beam, in degrees. */
  lightAngle: number
  /** Dominant wavelength, in nanometres. */
  wavelength: number
  /** Refractive index of the glass at 589 nm (water ≈ 1.33, diamond ≈ 2.42). */
  refractionIndex: number
  /** Number of forced bounces inside the prism before light may escape. */
  internalReflections: number
  /** Spread between red and violet refraction, 0..1. */
  dispersion: number
  /** Shannon entropy of the input in bits per character. */
  entropy: number
  charCount: number
  /** Character-class histogram mapped onto the visible spectrum, normalised 0..1. */
  spectrum: number[]
}

export const DEFAULT_PROFILE: OpticalProfile = {
  hash: '0000000000000000',
  lightAngle: 42,
  wavelength: 550,
  refractionIndex: 1.52,
  internalReflections: 0,
  dispersion: 0.45,
  entropy: 0,
  charCount: 0,
  spectrum: new Array(SPECTRUM_BINS).fill(0),
}

/** cyrb53-style string hash producing two independent 32-bit halves. */
export function hash64(input: string, seed = 0): [number, number] {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return [h1 >>> 0, h2 >>> 0]
}

/** Avalanche a 32-bit integer and return it as a fraction in [0, 1). */
function mixToUnit(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d)
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

/** Printable ASCII is laid out across the spectrum so similar characters share a band. */
function charToBin(code: number): number {
  if (code >= 32 && code <= 126) {
    return Math.min(SPECTRUM_BINS - 1, Math.floor(((code - 32) / 95) * SPECTRUM_BINS))
  }
  return (Math.imul(code, 2654435761) >>> 0) % SPECTRUM_BINS
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi)
}

/** Hashes the input text and derives the optical physics properties from it. */
export function encodeOptics(input: string): OpticalProfile {
  if (input.length === 0) return DEFAULT_PROFILE

  const [h1, h2] = hash64(input)

  const counts = new Array<number>(SPECTRUM_BINS).fill(0)
  const freq = new Map<number, number>()
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    freq.set(code, (freq.get(code) ?? 0) + 1)
    // Whitespace is hashed but carries no colour.
    if (code !== 32 && code !== 9 && code !== 10 && code !== 13) counts[charToBin(code)]++
  }

  let entropy = 0
  for (const n of freq.values()) {
    const p = n / input.length
    entropy -= p * Math.log2(p)
  }

  const peak = Math.max(...counts)
  const spectrum = counts.map((c) => (peak > 0 ? c / peak : 0))

  let weighted = 0
  let total = 0
  counts.forEach((c, i) => {
    weighted += c * (i + 0.5)
    total += c
  })
  const centroid = total > 0 ? weighted / total / SPECTRUM_BINS : 0.5

  const uWave = mixToUnit(h1)
  const uAngle = mixToUnit(h1 ^ 0x9e3779b9)
  const uIor = mixToUnit(h2)
  const uBounce = mixToUnit(h2 ^ 0x85ebca6b)
  const uDisp = mixToUnit(h1 ^ h2)

  const wavelength =
    VISIBLE_MIN_NM + (VISIBLE_MAX_NM - VISIBLE_MIN_NM) * (0.35 * centroid + 0.65 * uWave)

  return {
    hash: h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0'),
    lightAngle: 12 + 60 * uAngle,
    wavelength,
    refractionIndex: IOR_MIN + (IOR_MAX - IOR_MIN) * uIor,
    internalReflections: Math.floor(uBounce * (MAX_INTERNAL_REFLECTIONS + 1)),
    dispersion: clamp(0.15 + 0.45 * clamp(entropy / 6, 0, 1) + 0.4 * uDisp, 0, 1),
    entropy,
    charCount: input.length,
    spectrum,
  }
}

/** Slowly evolving profile for the Generative Rainbow Ambient preset. */
export function generativeProfile(seedText: string, t: number): OpticalProfile {
  const base = encodeOptics(seedText)
  const sweep = 0.5 + 0.5 * Math.sin(t * 0.35)
  const spectrum = base.spectrum.map(
    (_, i) => 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.8 - i * 0.35), 2),
  )
  return {
    ...base,
    lightAngle: 38 + 18 * Math.sin(t * 0.21),
    wavelength: VISIBLE_MIN_NM + 20 + (VISIBLE_MAX_NM - VISIBLE_MIN_NM - 40) * sweep,
    refractionIndex: 1.75 + 0.35 * Math.sin(t * 0.13 + 1.2),
    internalReflections: Math.floor(3 + 3 * (0.5 + 0.5 * Math.sin(t * 0.07))),
    dispersion: 0.85 + 0.15 * Math.sin(t * 0.5),
    spectrum,
  }
}

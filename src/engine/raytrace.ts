import { RAY_WAVELENGTHS } from './spectrum'

export type Vec2 = [number, number]

export const PRISM_CIRCUMRADIUS = 1.2
const COS30 = Math.cos(Math.PI / 6)

/** Equilateral triangle cross-section of the prism, counter-clockwise, centred on the origin. */
export const PRISM_VERTICES: Vec2[] = [
  [0, PRISM_CIRCUMRADIUS],
  [-PRISM_CIRCUMRADIUS * COS30, -PRISM_CIRCUMRADIUS / 2],
  [PRISM_CIRCUMRADIUS * COS30, -PRISM_CIRCUMRADIUS / 2],
]

const EDGES: [Vec2, Vec2][] = PRISM_VERTICES.map((a, i) => [a, PRISM_VERTICES[(i + 1) % 3]])

const OUTWARD_NORMALS: Vec2[] = EDGES.map(([a, b]) => normalize([b[1] - a[1], -(b[0] - a[0])]))

const INCOMING_LENGTH = 7
const EXIT_LENGTH = 9
const MAX_STEPS = 28
/** Upper bound on `RayPath.points.length`: entry + every bounce + exit tail. */
export const MAX_RAY_POINTS = MAX_STEPS + 2

export interface RayPath {
  wavelength: number
  points: Vec2[]
  /** Relative energy carried at each point of `points`. */
  intensities: number[]
  /** Direction of the escaping ray, or null if it stayed trapped. */
  exitDirection: Vec2 | null
  /** Signed deviation from the incoming beam in degrees, or null if trapped. */
  deviation: number | null
  reflections: number
  totalInternalReflections: number
}

export interface TraceResult {
  incomingStart: Vec2
  entry: Vec2
  incomingDirection: Vec2
  rays: RayPath[]
  /** Angular spread between the shortest and longest escaping wavelengths, in degrees. */
  angularSpread: number
}

export interface TraceParams {
  lightAngle: number
  refractionIndex: number
  dispersion: number
  internalReflections: number
}

const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1]
const cross = (a: Vec2, b: Vec2) => a[0] * b[1] - a[1] * b[0]
const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]]
const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s]
const neg = (a: Vec2): Vec2 => [-a[0], -a[1]]

function normalize(a: Vec2): Vec2 {
  const l = Math.hypot(a[0], a[1]) || 1
  return [a[0] / l, a[1] / l]
}

function rotate(a: Vec2, radians: number): Vec2 {
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]
}

function reflect(d: Vec2, n: Vec2): Vec2 {
  return add(d, scale(n, -2 * dot(d, n)))
}

/** Snell refraction; `n` must face against `d`. Returns null on total internal reflection. */
function refract(d: Vec2, n: Vec2, eta: number): Vec2 | null {
  const cosI = -dot(n, d)
  const k = 1 - eta * eta * (1 - cosI * cosI)
  if (k < 0) return null
  return normalize(add(scale(d, eta), scale(n, eta * cosI - Math.sqrt(k))))
}

/** Schlick approximation of the transmitted fraction at an interface. */
function transmittance(cosI: number, n1: number, n2: number): number {
  const r0 = ((n1 - n2) / (n1 + n2)) ** 2
  return 1 - (r0 + (1 - r0) * Math.pow(1 - Math.abs(cosI), 5))
}

/** Cauchy dispersion model anchored so that n(589 nm) equals `nD`. */
export function iorAtWavelength(nD: number, dispersion: number, nm: number): number {
  const b = 0.004 + 0.045 * dispersion
  const um = nm / 1000
  return nD - b / 0.5893 ** 2 + b / (um * um)
}

function nearestEdgeHit(p: Vec2, d: Vec2, skipEdge: number) {
  let best: { t: number; edge: number } | null = null
  EDGES.forEach(([a, b], i) => {
    if (i === skipEdge) return
    const e: Vec2 = [b[0] - a[0], b[1] - a[1]]
    const denom = cross(d, e)
    if (Math.abs(denom) < 1e-9) return
    const w: Vec2 = [a[0] - p[0], a[1] - p[1]]
    const t = cross(w, e) / denom
    const u = cross(w, d) / denom
    if (t > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 && (!best || t < best.t)) best = { t, edge: i }
  })
  return best as { t: number; edge: number } | null
}

function signedAngleDeg(a: Vec2, b: Vec2): number {
  return (Math.atan2(cross(a, b), dot(a, b)) * 180) / Math.PI
}

/**
 * Traces white light through the 2D prism cross-section, splitting it into
 * `RAY_WAVELENGTHS` with a per-wavelength refractive index.
 */
export function tracePrism(params: TraceParams, wavelengths = RAY_WAVELENGTHS): TraceResult {
  const entryEdge = 0
  const [a, b] = EDGES[entryEdge]
  const entry: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const faceNormal = OUTWARD_NORMALS[entryEdge]
  const incidence = (Math.min(Math.max(params.lightAngle, 0), 85) * Math.PI) / 180
  const incomingDirection = normalize(rotate(neg(faceNormal), incidence))
  const incomingStart = add(entry, scale(incomingDirection, -INCOMING_LENGTH))
  const required = Math.round(params.internalReflections)

  const rays = wavelengths.map<RayPath>((wavelength) => {
    const n = iorAtWavelength(params.refractionIndex, params.dispersion, wavelength)
    const points: Vec2[] = [entry]
    let energy = transmittance(-dot(faceNormal, incomingDirection), 1, n)
    const intensities = [energy]
    let reflections = 0
    let tir = 0
    let exitDirection: Vec2 | null = null

    let d = refract(incomingDirection, faceNormal, 1 / n)
    if (!d) {
      return { wavelength, points, intensities, exitDirection, deviation: null, reflections, totalInternalReflections: tir }
    }

    let p = entry
    let edge = entryEdge
    for (let step = 0; step < MAX_STEPS; step++) {
      const hit = nearestEdgeHit(p, d, edge)
      if (!hit) break
      p = add(p, scale(d, hit.t))
      edge = hit.edge
      const outward = OUTWARD_NORMALS[edge]
      points.push(p)
      intensities.push(energy)

      if (reflections < required) {
        d = reflect(d, outward)
        reflections++
        energy *= 0.86
        continue
      }

      const out = refract(d, neg(outward), n)
      if (!out) {
        d = reflect(d, outward)
        tir++
        energy *= 0.97
        continue
      }

      energy *= transmittance(dot(outward, d), n, 1)
      exitDirection = out
      points.push(add(p, scale(out, EXIT_LENGTH)))
      intensities.push(energy * 0.15)
      break
    }

    return {
      wavelength,
      points,
      intensities,
      exitDirection,
      deviation: exitDirection ? signedAngleDeg(incomingDirection, exitDirection) : null,
      reflections,
      totalInternalReflections: tir,
    }
  })

  const escaped = rays.filter((r) => r.deviation !== null).map((r) => r.deviation as number)
  const angularSpread = escaped.length > 1 ? Math.max(...escaped) - Math.min(...escaped) : 0

  return { incomingStart, entry, incomingDirection, rays, angularSpread }
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomInt(maxExclusive: number): number {
  const [v] = crypto.getRandomValues(new Uint32Array(1))
  return v % maxExclusive
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)]
}

/** A fresh 256-bit key from the browser's cryptographically secure generator. Never leaves the page. */
export function generateCryptoKey(bits = 256): string {
  return toHex(randomBytes(bits / 8))
}

export function formatKeyBlock(hex: string): string {
  const lines = hex.match(/.{1,32}/g) ?? []
  return ['-----BEGIN PRISM KEY-----', ...lines, '-----END PRISM KEY-----'].join('\n')
}

const SERVICES = ['edge-gw', 'auth-svc', 'ledger', 'render-farm', 'telemetry', 'search-api'] as const
const ROUTES = ['/v1/orders', '/v1/session', '/health', '/v2/render', '/v1/search', '/metrics'] as const
const LEVELS = ['INFO', 'INFO', 'INFO', 'DEBUG', 'WARN', 'ERROR'] as const

/** Synthetic structured log line for the Live Pulse stream. */
export function makePulseLine(): string {
  const level = pick(LEVELS)
  const status = level === 'ERROR' ? pick([500, 502, 503]) : level === 'WARN' ? pick([404, 429]) : 200
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    svc: `${pick(SERVICES)}-${String(randomInt(12)).padStart(2, '0')}`,
    route: pick(ROUTES),
    status,
    latency_ms: 4 + randomInt(level === 'ERROR' ? 1800 : 240),
    trace: toHex(randomBytes(6)),
  })
}

export interface CpuReading {
  sensor: string
  tempC: number
  load: number
  frameMs: number
  cores: number | null
  ts: string
}

/**
 * Browsers cannot read hardware temperature sensors, so this estimates a
 * plausible CPU temperature from main-thread load (frame pacing + timer drift).
 */
export class CpuTemperatureEstimator {
  private frameMs = 16.7
  private drift = 0
  private load = 0.2
  private temp = 46
  private rafId = 0
  private timerId = 0
  private lastFrame = 0
  private lastTick = 0
  private readonly tickMs = 250

  constructor(private readonly onReading: (r: CpuReading) => void) {}

  start() {
    this.lastFrame = performance.now()
    this.lastTick = performance.now()
    const frame = (now: number) => {
      const dt = now - this.lastFrame
      this.lastFrame = now
      if (dt < 250) this.frameMs += (dt - this.frameMs) * 0.08
      this.rafId = requestAnimationFrame(frame)
    }
    this.rafId = requestAnimationFrame(frame)
    this.timerId = window.setInterval(() => this.tick(), this.tickMs)
  }

  stop() {
    cancelAnimationFrame(this.rafId)
    window.clearInterval(this.timerId)
  }

  private tick() {
    const now = performance.now()
    const lag = Math.max(0, now - this.lastTick - this.tickMs)
    this.lastTick = now
    this.drift += (lag - this.drift) * 0.3

    const frameLoad = Math.min(Math.max((this.frameMs - 8) / 40, 0), 1)
    const driftLoad = Math.min(this.drift / 60, 1)
    const ambient = 0.08 * (0.5 + 0.5 * Math.sin(now / 9000))
    const targetLoad = Math.min(1, 0.65 * frameLoad + 0.35 * driftLoad + ambient)
    this.load += (targetLoad - this.load) * 0.15

    const targetTemp = 38 + this.load * 52
    this.temp += (targetTemp - this.temp) * 0.06

    this.onReading({
      sensor: 'cpu0 (estimated)',
      tempC: Math.round(this.temp * 10) / 10,
      load: Math.round(this.load * 1000) / 1000,
      frameMs: Math.round(this.frameMs * 10) / 10,
      cores: navigator.hardwareConcurrency ?? null,
      ts: new Date().toISOString(),
    })
  }
}

export async function sha256Hex(text: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return toHex(new Uint8Array(digest))
}

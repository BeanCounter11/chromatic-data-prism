import { useEffect } from 'react'
import { usePrism } from '../store'
import { encodeOptics, generativeProfile, type OpticalProfile } from './encoder'
import { CpuTemperatureEstimator, makePulseLine, type CpuReading } from './liveSources'

const CRYPTO_ROTATE_MS = 4000
const RAINBOW_TICK_MS = 50
const RAINBOW_SEED = 'Generative Rainbow Ambient'

export function canonicalJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw))
  } catch {
    return raw
  }
}

/** Cool readings render blue, hot readings render red, and hot glass bends light slightly less. */
function applyThermalOptics(profile: OpticalProfile, reading: CpuReading): OpticalProfile {
  const heat = Math.min(Math.max((reading.tempC - 38) / 52, 0), 1)
  return {
    ...profile,
    wavelength: 440 + heat * 250,
    refractionIndex: 1.95 - heat * 0.45,
    dispersion: 0.35 + heat * 0.5,
  }
}

/** Runs the active live source and keeps the store's optical profile in sync with the input. */
export function useOpticsEngine() {
  const source = usePrism((s) => s.source)
  const text = usePrism((s) => s.text)
  const json = usePrism((s) => s.json)
  const pulseLines = usePrism((s) => s.pulseLines)
  const pulseRunning = usePrism((s) => s.pulseRunning)
  const pulseIntervalMs = usePrism((s) => s.pulseIntervalMs)
  const cryptoKey = usePrism((s) => s.cryptoKey)
  const cryptoAutoRotate = usePrism((s) => s.cryptoAutoRotate)
  const cpuReading = usePrism((s) => s.cpuReading)

  useEffect(() => {
    if (source !== 'pulse' || !pulseRunning) return
    const { pushPulseLine, pulseLines: existing } = usePrism.getState()
    if (existing.length === 0) pushPulseLine(makePulseLine())
    const id = window.setInterval(() => pushPulseLine(makePulseLine()), pulseIntervalMs)
    return () => window.clearInterval(id)
  }, [source, pulseRunning, pulseIntervalMs])

  useEffect(() => {
    if (source !== 'cpu') return
    const estimator = new CpuTemperatureEstimator((r) => usePrism.getState().setCpuReading(r))
    estimator.start()
    return () => estimator.stop()
  }, [source])

  useEffect(() => {
    if (source !== 'crypto' || !cryptoAutoRotate) return
    const id = window.setInterval(() => usePrism.getState().regenerateKey(), CRYPTO_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [source, cryptoAutoRotate])

  useEffect(() => {
    if (source !== 'rainbow') return
    let tick = 0
    const id = window.setInterval(() => {
      const t = performance.now() / 1000
      usePrism.getState().setEncoded(RAINBOW_SEED, generativeProfile(RAINBOW_SEED, t), tick++ % 5 === 0)
    }, RAINBOW_TICK_MS)
    return () => window.clearInterval(id)
  }, [source])

  useEffect(() => {
    if (source === 'rainbow') return
    let sourceText: string
    switch (source) {
      case 'text':
        sourceText = text
        break
      case 'json':
        sourceText = canonicalJson(json)
        break
      case 'pulse':
        sourceText = pulseLines.join('\n')
        break
      case 'crypto':
        sourceText = cryptoKey
        break
      case 'cpu':
        sourceText = cpuReading ? `cpu0:${Math.round(cpuReading.tempC)}C` : 'cpu0'
        break
    }
    let profile = encodeOptics(sourceText)
    if (source === 'cpu' && cpuReading) profile = applyThermalOptics(profile, cpuReading)
    usePrism.getState().setEncoded(sourceText, profile, true)
  }, [source, text, json, pulseLines, cryptoKey, cpuReading])
}

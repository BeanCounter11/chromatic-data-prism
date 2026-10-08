import { create } from 'zustand'
import { DEFAULT_PROFILE, type OpticalProfile } from './engine/encoder'
import { generateCryptoKey, type CpuReading } from './engine/liveSources'

export type ViewMode = 'diagnostic' | 'art'
export type ManualSource = 'text' | 'json' | 'pulse'
export type PresetId = 'crypto' | 'cpu' | 'rainbow'
export type SourceKind = ManualSource | PresetId

export type AudioStatus = 'off' | 'starting' | 'ready' | 'live' | 'error'

export interface AudioState {
  audioEnabled: boolean
  audioInput: 'mic' | 'file' | null
  audioStatus: AudioStatus
  audioMessage: string | null
  audioFileName: string | null
  audioPlaying: boolean
}

export interface HistorySample {
  wavelength: number
  refractionIndex: number
  lightAngle: number
  internalReflections: number
}

export const MAX_INPUT_CHARS = 50_000
export const PULSE_WINDOW = 14
const HISTORY_LENGTH = 90

const DEFAULT_TEXT = 'Light is just data that has not been split yet.'
const DEFAULT_JSON = JSON.stringify(
  {
    ts: '2026-10-08T22:14:07.311Z',
    level: 'WARN',
    svc: 'ledger-03',
    msg: 'settlement batch retried',
    attempt: 2,
    latency_ms: 812,
  },
  null,
  2,
)

interface PrismState extends AudioState {
  mode: ViewMode
  source: SourceKind
  text: string
  json: string
  pulseLines: string[]
  pulseRunning: boolean
  pulseIntervalMs: number
  cryptoKey: string
  cryptoAutoRotate: boolean
  cpuReading: CpuReading | null

  /** The exact string currently being hashed. */
  sourceText: string
  profile: OpticalProfile
  history: HistorySample[]

  setMode: (mode: ViewMode) => void
  toggleMode: () => void
  setSource: (source: SourceKind) => void
  setText: (text: string) => void
  setJson: (json: string) => void
  pushPulseLine: (line: string) => void
  setPulseRunning: (running: boolean) => void
  setPulseIntervalMs: (ms: number) => void
  regenerateKey: () => void
  setCryptoAutoRotate: (on: boolean) => void
  setCpuReading: (reading: CpuReading) => void
  setEncoded: (sourceText: string, profile: OpticalProfile, recordHistory: boolean) => void
  applyPreset: (preset: PresetId) => void
  setAudio: (patch: Partial<AudioState>) => void
}

const clampInput = (s: string) => (s.length > MAX_INPUT_CHARS ? s.slice(0, MAX_INPUT_CHARS) : s)

export const usePrism = create<PrismState>((set) => ({
  mode: 'diagnostic',
  source: 'text',
  text: DEFAULT_TEXT,
  json: DEFAULT_JSON,
  pulseLines: [],
  pulseRunning: true,
  pulseIntervalMs: 700,
  cryptoKey: generateCryptoKey(),
  cryptoAutoRotate: false,
  cpuReading: null,

  audioEnabled: false,
  audioInput: null,
  audioStatus: 'off',
  audioMessage: null,
  audioFileName: null,
  audioPlaying: false,

  sourceText: '',
  profile: DEFAULT_PROFILE,
  history: [],

  setMode: (mode) => set({ mode }),
  toggleMode: () => set((s) => ({ mode: s.mode === 'art' ? 'diagnostic' : 'art' })),
  setSource: (source) => set({ source }),
  setText: (text) => set({ text: clampInput(text) }),
  setJson: (json) => set({ json: clampInput(json) }),
  pushPulseLine: (line) => set((s) => ({ pulseLines: [...s.pulseLines, line].slice(-PULSE_WINDOW) })),
  setPulseRunning: (pulseRunning) => set({ pulseRunning }),
  setPulseIntervalMs: (pulseIntervalMs) => set({ pulseIntervalMs }),
  regenerateKey: () => set({ cryptoKey: generateCryptoKey() }),
  setCryptoAutoRotate: (cryptoAutoRotate) => set({ cryptoAutoRotate }),
  setCpuReading: (cpuReading) => set({ cpuReading }),
  setAudio: (patch) => set(patch),
  setEncoded: (sourceText, profile, recordHistory) =>
    set((s) => ({
      sourceText,
      profile,
      history: recordHistory
        ? [
            ...s.history,
            {
              wavelength: profile.wavelength,
              refractionIndex: profile.refractionIndex,
              lightAngle: profile.lightAngle,
              internalReflections: profile.internalReflections,
            },
          ].slice(-HISTORY_LENGTH)
        : s.history,
    })),
  applyPreset: (preset) =>
    set(() => {
      switch (preset) {
        case 'crypto':
          return { source: 'crypto', cryptoKey: generateCryptoKey(), mode: 'diagnostic' }
        case 'cpu':
          return { source: 'cpu', mode: 'diagnostic' }
        case 'rainbow':
          return { source: 'rainbow', mode: 'art' }
      }
    }),
}))

export const PRESETS: { id: PresetId; label: string; blurb: string }[] = [
  { id: 'crypto', label: 'Crypto Key Prism', blurb: 'A fresh 256-bit key, refracted' },
  { id: 'cpu', label: 'Live CPU Temperature', blurb: 'Thermal load mapped to colour' },
  { id: 'rainbow', label: 'Generative Rainbow Ambient', blurb: 'Endless slow spectral drift' },
]

export function isPreset(source: SourceKind): source is PresetId {
  return source === 'crypto' || source === 'cpu' || source === 'rainbow'
}

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { BAND_RANGES, audioBridge, describeAudioError } from '../audio/audioPrismBridge'
import { usePrism } from '../store'

const BANDS = [
  { id: 'bass', label: 'Bass', drives: 'Pulse · beam', colour: '#ff5a7a' },
  { id: 'mids', label: 'Mids', drives: 'IOR · dispersion', colour: '#7dff9a' },
  { id: 'treble', label: 'Treble', drives: 'Shake · spin · rays', colour: '#7ab8ff' },
] as const

function formatHz([lo, hi]: [number, number]) {
  const f = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : String(hz))
  return hi >= 20000 ? `${f(lo)}Hz+` : `${f(lo)}–${f(hi)}Hz`
}

function WaveIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 12h2M7 8v8M11 4v16M15 7v10M19 10v4M21 12h0" strokeLinecap="round" />
    </svg>
  )
}

/** Live band meters, updated straight from the analyser without re-rendering React. */
function BandMeters() {
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const hit = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const l = audioBridge.levels
      ;[l.bass, l.mids, l.treble].forEach((v, i) => {
        const bar = bars.current[i]
        if (bar) bar.style.transform = `scaleX(${Math.max(0.02, v)})`
      })
      if (hit.current) hit.current.style.opacity = String(0.15 + l.bassHit * 0.85)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="space-y-2">
      {BANDS.map((b, i) => (
        <div key={b.id}>
          <div className="mb-1 flex items-baseline justify-between text-[10px]">
            <span className="font-semibold tracking-wider text-white/70 uppercase">
              {b.label}
              {b.id === 'bass' && (
                <span
                  ref={hit}
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-400 opacity-15"
                  title="Kick detected"
                />
              )}
            </span>
            <span className="font-mono text-white/35">
              {formatHz(BAND_RANGES[b.id])} → {b.drives}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <span
              ref={(el) => {
                bars.current[i] = el
              }}
              className="block h-full origin-left rounded-full"
              style={{ background: b.colour, boxShadow: `0 0 10px ${b.colour}`, transform: 'scaleX(0.02)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const sourceButton =
  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition disabled:cursor-wait disabled:opacity-50'

export function AudioToggle() {
  const enabled = usePrism((s) => s.audioEnabled)
  const input = usePrism((s) => s.audioInput)
  const status = usePrism((s) => s.audioStatus)
  const message = usePrism((s) => s.audioMessage)
  const fileName = usePrism((s) => s.audioFileName)
  const playing = usePrism((s) => s.audioPlaying)
  const setAudio = usePrism((s) => s.setAudio)

  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const busy = status === 'starting'

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const fail = (err: unknown) =>
    setAudio({ audioStatus: 'error', audioMessage: describeAudioError(err), audioPlaying: false })

  const enable = () => {
    setAudio({ audioStatus: 'starting', audioMessage: null })
    setOpen(true)
    // Must run inside the click: browsers only let an AudioContext start from a user gesture.
    audioBridge
      .activate()
      .then(() =>
        setAudio({
          audioEnabled: true,
          audioStatus: 'ready',
          audioMessage: 'Choose the microphone or upload an audio file.',
        }),
      )
      .catch(fail)
  }

  const disable = () => {
    void audioBridge.stop()
    setAudio({
      audioEnabled: false,
      audioInput: null,
      audioStatus: 'off',
      audioMessage: null,
      audioFileName: null,
      audioPlaying: false,
    })
    setOpen(false)
  }

  const startMicrophone = () => {
    setAudio({ audioStatus: 'starting', audioMessage: 'Waiting for microphone permission…' })
    audioBridge
      .startMicrophone()
      .then(() =>
        setAudio({
          audioInput: 'mic',
          audioStatus: 'live',
          audioMessage: null,
          audioFileName: null,
          audioPlaying: true,
        }),
      )
      .catch(fail)
  }

  const onFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAudio({ audioStatus: 'starting', audioMessage: `Loading ${file.name}…` })
    audioBridge
      .startFile(file)
      .then(() =>
        setAudio({
          audioInput: 'file',
          audioStatus: 'live',
          audioMessage: null,
          audioFileName: file.name,
          audioPlaying: true,
        }),
      )
      .catch(fail)
  }

  const togglePlayback = () => {
    audioBridge
      .togglePlayback()
      .then((isPlaying) => setAudio({ audioPlaying: isPlaying }))
      .catch(fail)
  }

  const statusLabel =
    status === 'live'
      ? `Live · ${input === 'mic' ? 'Microphone' : 'File'}`
      : status === 'starting'
        ? 'Starting…'
        : status === 'error'
          ? 'Needs attention'
          : 'Ready'

  return (
    <div ref={root} className="pointer-events-auto relative">
      <div className={`glass flex items-center rounded-full ${enabled ? 'ring-1 ring-fuchsia-300/30' : ''}`}>
        <button
          type="button"
          aria-pressed={enabled}
          aria-label={enabled ? 'Disable Audio Reactive Mode' : 'Enable Audio Reactive Mode'}
          title={enabled ? 'Disable Audio Reactive Mode' : 'Enable Audio Reactive Mode'}
          onClick={enabled ? disable : enable}
          disabled={busy && !enabled}
          className={`flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition ${
            enabled ? 'text-white' : 'text-white/65 hover:text-white'
          }`}
        >
          <span className="relative flex">
            <WaveIcon className={enabled ? 'text-fuchsia-300' : ''} />
            {status === 'live' && (
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            )}
          </span>
          <span className="hidden xl:inline">{enabled ? 'Audio Reactive: On' : 'Enable Audio Reactive Mode'}</span>
          <span className="hidden sm:inline xl:hidden">{enabled ? 'Audio On' : 'Audio Reactive'}</span>
        </button>
        {enabled && (
          <button
            type="button"
            aria-label="Audio source settings"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="cursor-pointer border-l border-white/10 py-2 pr-3 pl-2 text-white/60 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Audio reactive settings"
          className="glass animate-fade-in absolute top-full right-0 z-20 mt-2 w-80 rounded-2xl p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/90">Audio Reactive</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                status === 'live'
                  ? 'bg-emerald-400/15 text-emerald-200'
                  : status === 'error'
                    ? 'bg-amber-400/15 text-amber-200'
                    : 'bg-white/10 text-white/60'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              type="button"
              disabled={busy || !enabled}
              onClick={startMicrophone}
              className={`${sourceButton} ${
                input === 'mic' ? 'border-fuchsia-300/40 bg-fuchsia-400/10 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              🎙 Microphone
            </button>
            <button
              type="button"
              disabled={busy || !enabled}
              onClick={() => fileInput.current?.click()}
              className={`${sourceButton} ${
                input === 'file' ? 'border-fuchsia-300/40 bg-fuchsia-400/10 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              ⬆ Audio file
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus"
              className="hidden"
              onChange={onFileChosen}
            />
          </div>

          {input === 'file' && fileName && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-1.5">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={playing ? 'Pause' : 'Play'}
                className="cursor-pointer text-xs text-white/80 hover:text-white"
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <span className="min-w-0 truncate font-mono text-[11px] text-white/60" title={fileName}>
                {fileName}
              </span>
            </div>
          )}

          <BandMeters />

          {message && (
            <p className={`mt-3 text-[11px] leading-relaxed ${status === 'error' ? 'text-amber-200/90' : 'text-white/50'}`}>
              {message}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
            <p className="text-[10px] leading-snug text-white/35">
              Analysed live in your browser. Nothing is recorded or uploaded.
            </p>
            {enabled && (
              <button
                type="button"
                onClick={disable}
                className="shrink-0 cursor-pointer rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:border-white/25 hover:text-white"
              >
                Turn off
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

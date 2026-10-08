import { useMemo } from 'react'
import { MAX_INPUT_CHARS, PRESETS, isPreset, usePrism, type ManualSource } from '../store'
import { formatKeyBlock } from '../engine/liveSources'
import { wavelengthToHex } from '../engine/spectrum'
import { Panel, SectionLabel } from './Panel'

const TABS: { id: ManualSource; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'json', label: 'JSON Log' },
  { id: 'pulse', label: 'Live Pulse' },
]

const TEXT_SAMPLES = [
  'The quick brown fox jumps over the lazy dog.',
  'ERROR 0x7f3a: segfault in render thread @ frame 88412',
  'あいうえお 🌈 prism ✦ 光',
]

const textareaClass =
  'thin-scroll w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm leading-relaxed text-white/90 outline-none transition placeholder:text-white/25 focus:border-white/30 focus:ring-2 focus:ring-indigo-400/20'

const smallButton =
  'cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'

function TextSource() {
  const text = usePrism((s) => s.text)
  const setText = usePrism((s) => s.setText)
  return (
    <div className="space-y-3">
      <textarea
        aria-label="Text to encode"
        className={`${textareaClass} h-40`}
        value={text}
        maxLength={MAX_INPUT_CHARS}
        placeholder="Type anything — every keystroke re-hashes the light…"
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {TEXT_SAMPLES.map((s) => (
          <button key={s} type="button" className={`${smallButton} max-w-full truncate`} onClick={() => setText(s)}>
            {s.length > 22 ? `${s.slice(0, 22)}…` : s}
          </button>
        ))}
        <button type="button" className={smallButton} onClick={() => setText('')}>
          Clear
        </button>
      </div>
    </div>
  )
}

function JsonSource() {
  const json = usePrism((s) => s.json)
  const setJson = usePrism((s) => s.setJson)
  const status = useMemo(() => {
    if (!json.trim()) return { ok: false, message: 'Empty' }
    try {
      JSON.parse(json)
      return { ok: true, message: 'Valid JSON · hashed in canonical form' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Invalid JSON' }
    }
  }, [json])

  const format = () => {
    try {
      setJson(JSON.stringify(JSON.parse(json), null, 2))
    } catch {
      /* leave invalid input untouched */
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        aria-label="JSON log to encode"
        className={`${textareaClass} h-52 font-mono text-xs`}
        value={json}
        maxLength={MAX_INPUT_CHARS}
        placeholder='{"level":"INFO","msg":"paste a log line"}'
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
      />
      <div className="flex items-center justify-between gap-2">
        <p
          className={`min-w-0 truncate text-[11px] ${status.ok ? 'text-emerald-300/80' : 'text-amber-300/80'}`}
          title={status.message}
        >
          {status.ok ? '●' : '○'} {status.message}
        </p>
        <button type="button" className={smallButton} onClick={format} disabled={!status.ok}>
          Format
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        Whitespace and indentation are ignored, so the same log always produces the same light.
      </p>
    </div>
  )
}

const LEVEL_COLOURS: Record<string, string> = {
  ERROR: 'text-rose-300',
  WARN: 'text-amber-300',
  DEBUG: 'text-sky-300/70',
  INFO: 'text-emerald-300/80',
}

function PulseSource() {
  const lines = usePrism((s) => s.pulseLines)
  const running = usePrism((s) => s.pulseRunning)
  const interval = usePrism((s) => s.pulseIntervalMs)
  const setRunning = usePrism((s) => s.setPulseRunning)
  const setRate = usePrism((s) => s.setPulseIntervalMs)

  const parsed = useMemo(
    () =>
      lines
        .map((l) => {
          try {
            return JSON.parse(l) as { level: string; svc: string; route: string; status: number; latency_ms: number }
          } catch {
            return null
          }
        })
        .reverse(),
    [lines],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" className={smallButton} onClick={() => setRunning(!running)}>
          {running ? '❚❚ Pause' : '▶ Resume'}
        </button>
        <label className="flex items-center gap-2 text-[11px] text-white/50">
          Rate
          <select
            value={interval}
            onChange={(e) => setRate(Number(e.target.value))}
            className="cursor-pointer rounded-lg border border-white/10 bg-black/50 px-2 py-1 text-[11px] text-white/80 outline-none"
          >
            <option value={250}>Burst · 4/s</option>
            <option value={700}>Steady · 1.4/s</option>
            <option value={1600}>Calm · 0.6/s</option>
          </select>
        </label>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/50">
          <span className={`h-1.5 w-1.5 rounded-full ${running ? 'animate-pulse bg-emerald-400' : 'bg-white/30'}`} />
          {running ? 'Streaming' : 'Paused'}
        </span>
      </div>
      <ol className="thin-scroll h-56 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-2 font-mono text-[10.5px]">
        {parsed.map((p, i) =>
          p ? (
            <li key={lines.length - i} className="flex gap-2 truncate animate-fade-in">
              <span className={`w-10 shrink-0 ${LEVEL_COLOURS[p.level] ?? 'text-white/60'}`}>{p.level}</span>
              <span className="w-24 shrink-0 truncate text-white/60">{p.svc}</span>
              <span className="truncate text-white/45">
                {p.route} {p.status} {p.latency_ms}ms
              </span>
            </li>
          ) : null,
        )}
        {parsed.length === 0 && <li className="text-white/30">Waiting for pulse…</li>}
      </ol>
      <p className="text-[11px] leading-relaxed text-white/40">
        Synthetic service logs. The rolling window of the last {lines.length || 'few'} lines is hashed on every
        beat, so each new event re-cuts the light.
      </p>
    </div>
  )
}

function CryptoPreset() {
  const key = usePrism((s) => s.cryptoKey)
  const regenerate = usePrism((s) => s.regenerateKey)
  const auto = usePrism((s) => s.cryptoAutoRotate)
  const setAuto = usePrism((s) => s.setCryptoAutoRotate)
  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-cyan-200/90">
        {formatKeyBlock(key)}
      </pre>
      <div className="flex items-center gap-2">
        <button type="button" className={smallButton} onClick={regenerate}>
          ↻ New key
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/60">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-indigo-400" />
          Rotate every 4 s
        </label>
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        256-bit key from your browser&apos;s secure random generator. It is created and used only in this tab and is
        never sent anywhere. Don&apos;t paste real production secrets into any web tool.
      </p>
    </div>
  )
}

function CpuPreset() {
  const r = usePrism((s) => s.cpuReading)
  const heat = r ? Math.min(Math.max((r.tempC - 38) / 52, 0), 1) : 0
  const colour = wavelengthToHex(440 + heat * 250)
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <span className="font-mono text-5xl font-light tabular-nums" style={{ color: colour }}>
          {r ? r.tempC.toFixed(1) : '--.-'}
        </span>
        <span className="pb-2 text-sm text-white/50">°C est.</span>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[11px] text-white/45">
          <span>Main-thread load</span>
          <span className="font-mono">{r ? `${Math.round(r.load * 100)}%` : '—'}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(r?.load ?? 0) * 100}%`, background: colour }}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="rounded-lg bg-white/5 p-2">
          <dt className="text-white/40">Frame time</dt>
          <dd className="text-white/80">{r ? `${r.frameMs} ms` : '—'}</dd>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <dt className="text-white/40">Logical cores</dt>
          <dd className="text-white/80">{r?.cores ?? '—'}</dd>
        </div>
      </dl>
      <p className="text-[11px] leading-relaxed text-white/40">
        Browsers can&apos;t read hardware sensors, so temperature is estimated from how hard this page is working.
        Cool readings glow blue, hot readings shift to red, and warmer glass bends light a little less.
      </p>
    </div>
  )
}

function RainbowPreset() {
  return (
    <div className="space-y-3">
      <div className="spectrum-bar h-2 animate-pulse rounded-full" />
      <p className="text-[12px] leading-relaxed text-white/60">
        A self-playing composition: wavelength, angle and glass density drift on slow, overlapping cycles. Best
        enjoyed in Art / Ambient mode — drag to orbit the prism.
      </p>
    </div>
  )
}

export function InputPanel({ className = '' }: { className?: string }) {
  const source = usePrism((s) => s.source)
  const setSource = usePrism((s) => s.setSource)
  const preset = isPreset(source) ? PRESETS.find((p) => p.id === source) : undefined

  return (
    <Panel kicker="Data-to-Light Encoder" title="Input Signal" className={className}>
      <div role="tablist" aria-label="Input source" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-black/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={source === t.id}
            onClick={() => setSource(t.id)}
            className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium transition ${
              source === t.id ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {preset && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionLabel>{preset.label}</SectionLabel>
          <span className="rounded-full border border-indigo-300/30 bg-indigo-400/10 px-2 py-0.5 text-[10px] text-indigo-200">
            Preset
          </span>
        </div>
      )}

      {source === 'text' && <TextSource />}
      {source === 'json' && <JsonSource />}
      {source === 'pulse' && <PulseSource />}
      {source === 'crypto' && <CryptoPreset />}
      {source === 'cpu' && <CpuPreset />}
      {source === 'rainbow' && <RainbowPreset />}
    </Panel>
  )
}

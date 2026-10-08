import { useId } from 'react'
import { IOR_MAX, IOR_MIN, MAX_INTERNAL_REFLECTIONS } from '../engine/encoder'
import { VISIBLE_MAX_NM, VISIBLE_MIN_NM, binToWavelength, wavelengthToHex } from '../engine/spectrum'
import type { HistorySample } from '../store'

const SPAN_NM = VISIBLE_MAX_NM - VISIBLE_MIN_NM

function SpectrumGradientStops() {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <stop key={i} offset={i / 11} stopColor={wavelengthToHex(VISIBLE_MIN_NM + (i / 11) * SPAN_NM)} />
      ))}
    </>
  )
}

export function SpectrumChart({ spectrum, wavelength }: { spectrum: number[]; wavelength: number }) {
  const W = 320
  const H = 120
  const plotH = 92
  const barW = W / spectrum.length
  const gradientId = `spectrum-${useId().replace(/[^\w-]/g, '')}`
  const markerX = ((wavelength - VISIBLE_MIN_NM) / SPAN_NM) * W

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Character spectrum histogram">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <SpectrumGradientStops />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={W} y1={plotH * g} y2={plotH * g} stroke="white" strokeOpacity="0.05" />
      ))}
      {spectrum.map((v, i) => {
        const h = Math.max(1.5, v * (plotH - 4))
        const colour = wavelengthToHex(binToWavelength(i, spectrum.length))
        return (
          <rect
            key={i}
            x={i * barW + 1}
            y={plotH - h}
            width={barW - 2}
            height={h}
            rx="1.5"
            fill={colour}
            fillOpacity={0.25 + v * 0.75}
            style={{ transition: 'y 200ms ease, height 200ms ease' }}
          />
        )
      })}
      <line x1={markerX} x2={markerX} y1="0" y2={plotH + 6} stroke="white" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx={markerX} cy={plotH + 6} r="3" fill={wavelengthToHex(wavelength)} stroke="white" strokeWidth="1" />
      <rect x="0" y={plotH + 12} width={W} height="4" rx="2" fill={`url(#${gradientId})`} />
      <g className="fill-white/40 font-mono" fontSize="8">
        <text x="0" y={H - 1}>380nm</text>
        <text x={W / 2} y={H - 1} textAnchor="middle">
          565nm
        </text>
        <text x={W} y={H - 1} textAnchor="end">
          750nm
        </text>
      </g>
    </svg>
  )
}

export function HistoryChart({ history }: { history: HistorySample[] }) {
  const W = 320
  const H = 90
  if (history.length < 2) {
    return <div className="flex h-[90px] items-center justify-center text-[11px] text-white/30">Collecting samples…</div>
  }
  const x = (i: number) => (i / (history.length - 1)) * W
  const yWave = (nm: number) => H - 6 - ((nm - VISIBLE_MIN_NM) / SPAN_NM) * (H - 12)
  const yIor = (n: number) => H - 6 - ((n - IOR_MIN) / (IOR_MAX - IOR_MIN)) * (H - 12)
  const iorPath = history.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yIor(s.refractionIndex).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Wavelength and refraction history">
      {history.slice(1).map((s, i) => (
        <line
          key={i}
          x1={x(i)}
          y1={yWave(history[i].wavelength)}
          x2={x(i + 1)}
          y2={yWave(s.wavelength)}
          stroke={wavelengthToHex(s.wavelength)}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      <path d={iorPath} fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  )
}

/** Face of the prism (vertical), its normal (dashed) and the incoming ray at `angle` degrees. */
export function AngleDial({ angle }: { angle: number }) {
  const r = 26
  const rad = (angle * Math.PI) / 180
  const cx = 44
  const cy = 32
  const rx = cx - Math.cos(rad) * r
  const ry = cy + Math.sin(rad) * r
  const arcX = cx - Math.cos(rad) * 12
  const arcY = cy + Math.sin(rad) * 12
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden>
      <rect x={cx} y="4" width="16" height="56" fill="white" fillOpacity="0.06" />
      <line x1={cx} y1="4" x2={cx} y2="60" stroke="white" strokeOpacity="0.5" />
      <line x1={cx - r} y1={cy} x2={cx + 14} y2={cy} stroke="white" strokeOpacity="0.35" strokeDasharray="2 2" />
      <path d={`M ${cx - 12} ${cy} A 12 12 0 0 0 ${arcX} ${arcY}`} fill="none" stroke="#a5b4fc" strokeWidth="1.5" />
      <line x1={rx} y1={ry} x2={cx} y2={cy} stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2" fill="white" />
    </svg>
  )
}

const IOR_LANDMARKS = [
  { n: 1.33, label: 'Water' },
  { n: 1.52, label: 'Glass' },
  { n: 1.77, label: 'Sapphire' },
  { n: 2.42, label: 'Diamond' },
]

export function IorScale({ ior }: { ior: number }) {
  const pct = (n: number) => ((n - IOR_MIN) / (IOR_MAX - IOR_MIN)) * 100
  const nearest = IOR_LANDMARKS.reduce((a, b) => (Math.abs(b.n - ior) < Math.abs(a.n - ior) ? b : a))
  return (
    <div>
      <div className="relative mt-1 h-1.5 rounded-full bg-gradient-to-r from-sky-400/40 via-white/30 to-fuchsia-300/60">
        {IOR_LANDMARKS.map((l) => (
          <span key={l.n} className="absolute top-0 h-1.5 w-px bg-black/60" style={{ left: `${pct(l.n)}%` }} />
        ))}
        <span
          className="absolute -top-1 h-3.5 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_white] transition-[left] duration-300"
          style={{ left: `${pct(ior)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-white/40">≈ {nearest.label}</p>
    </div>
  )
}

export function ReflectionDots({ count }: { count: number }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1" aria-label={`${count} internal reflections`}>
      {Array.from({ length: MAX_INTERNAL_REFLECTIONS }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${i < count ? 'bg-white shadow-[0_0_6px_white]' : 'bg-white/10'}`}
        />
      ))}
    </div>
  )
}

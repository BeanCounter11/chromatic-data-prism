import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePrism } from '../store'
import { tracePrism, iorAtWavelength } from '../engine/raytrace'
import { sha256Hex } from '../engine/liveSources'
import { wavelengthBandName, wavelengthToHex } from '../engine/spectrum'
import { Panel, SectionLabel } from './Panel'
import { AngleDial, HistoryChart, IorScale, ReflectionDots, SpectrumChart } from './charts'

function Metric({ label, value, unit, children }: { label: string; value: string; unit?: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45 uppercase">{label}</p>
      <p className="mt-1 font-mono text-xl text-white tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs text-white/40">{unit}</span>}
      </p>
      {children}
    </div>
  )
}

function useSha256(text: string) {
  const [digest, setDigest] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    const id = window.setTimeout(() => {
      sha256Hex(text).then((d) => !cancelled && setDigest(d))
    }, 150)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [text])
  return digest
}

export function DiagnosticsPanel({ className = '' }: { className?: string }) {
  const profile = usePrism((s) => s.profile)
  const history = usePrism((s) => s.history)
  const sourceText = usePrism((s) => s.sourceText)
  const trace = useMemo(() => tracePrism(profile), [profile])
  const digest = useSha256(sourceText)
  const colour = wavelengthToHex(profile.wavelength)
  const escaped = trace.rays.filter((r) => r.exitDirection).length

  return (
    <Panel
      kicker="Utility / Diagnostic"
      title="Spectral Metrics"
      className={className}
      actions={
        <span className="rounded-md bg-black/40 px-2 py-1 font-mono text-[10px] text-white/55" title="64-bit input hash">
          #{profile.hash}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Light angle" value={profile.lightAngle.toFixed(1)} unit="°">
          <AngleDial angle={profile.lightAngle} />
        </Metric>
        <Metric label="Wavelength" value={profile.wavelength.toFixed(0)} unit="nm">
          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full ring-1 ring-white/30"
              style={{ background: colour, boxShadow: `0 0 14px ${colour}` }}
            />
            <span className="text-xs text-white/60">{wavelengthBandName(profile.wavelength)}</span>
          </div>
        </Metric>
        <Metric label="Refraction index" value={profile.refractionIndex.toFixed(3)} unit="n">
          <IorScale ior={profile.refractionIndex} />
        </Metric>
        <Metric label="Internal reflections" value={String(profile.internalReflections)} unit="bounces">
          <ReflectionDots count={profile.internalReflections} />
        </Metric>
      </div>

      <div className="mt-5">
        <SectionLabel hint={`${profile.charCount.toLocaleString()} chars`}>Data spectrum</SectionLabel>
        <SpectrumChart spectrum={profile.spectrum} wavelength={profile.wavelength} />
      </div>

      <div className="mt-5">
        <SectionLabel hint={`${trace.angularSpread.toFixed(2)}° spread · ${escaped}/${trace.rays.length} escaped`}>
          Ray trace
        </SectionLabel>
        <table className="w-full font-mono text-[10.5px]">
          <thead className="text-left text-white/35">
            <tr>
              <th className="pb-1 font-normal">λ</th>
              <th className="pb-1 font-normal">n(λ)</th>
              <th className="pb-1 text-right font-normal">deviation</th>
              <th className="pb-1 text-right font-normal">bounces</th>
            </tr>
          </thead>
          <tbody>
            {trace.rays.map((ray) => (
              <tr key={ray.wavelength} className="text-white/75">
                <td className="py-0.5">
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ background: wavelengthToHex(ray.wavelength) }}
                  />
                  {ray.wavelength}
                </td>
                <td>{iorAtWavelength(profile.refractionIndex, profile.dispersion, ray.wavelength).toFixed(3)}</td>
                <td className="text-right">
                  {ray.deviation === null ? <span className="text-amber-300/80">trapped</span> : `${ray.deviation.toFixed(1)}°`}
                </td>
                <td className="text-right">
                  {ray.reflections}
                  {ray.totalInternalReflections > 0 && (
                    <span className="text-white/40" title="Total internal reflections">
                      +{ray.totalInternalReflections}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <SectionLabel
          hint={
            <span>
              <span className="text-white/70">━</span> λ <span className="ml-2 text-white/70">┄</span> n
            </span>
          }
        >
          Signal history
        </SectionLabel>
        <HistoryChart history={history} />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2 font-mono text-[10.5px]">
        <div className="rounded-lg bg-white/[0.04] p-2">
          <dt className="text-white/40">Entropy</dt>
          <dd className="text-white/80">{profile.entropy.toFixed(2)} b/ch</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-2">
          <dt className="text-white/40">Dispersion</dt>
          <dd className="text-white/80">{(profile.dispersion * 100).toFixed(0)}%</dd>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-2">
          <dt className="text-white/40">Band</dt>
          <dd style={{ color: colour }}>{wavelengthBandName(profile.wavelength)}</dd>
        </div>
      </dl>
      <p className="mt-3 truncate font-mono text-[10px] text-white/30" title={digest ?? undefined}>
        SHA-256 {digest ?? (globalThis.crypto?.subtle ? 'computing…' : 'unavailable (needs HTTPS or localhost)')}
      </p>
    </Panel>
  )
}

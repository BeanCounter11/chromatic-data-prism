import { PRESETS, usePrism, type PresetId } from '../store'

function PresetIcon({ id }: { id: PresetId }) {
  const common = 'h-4 w-4 shrink-0'
  switch (id) {
    case 'crypto':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="8" cy="12" r="4" />
          <path d="M12 12h9M18 12v3M21 12v2" strokeLinecap="round" />
        </svg>
      )
    case 'cpu':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" strokeLinecap="round" />
        </svg>
      )
    case 'rainbow':
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" strokeWidth="2" aria-hidden>
          <path d="M3 17a9 9 0 0 1 18 0" stroke="#ff5a5a" />
          <path d="M6 17a6 6 0 0 1 12 0" stroke="#f4f16b" />
          <path d="M9 17a3 3 0 0 1 6 0" stroke="#4db8ff" />
        </svg>
      )
  }
}

export function PresetBar() {
  const source = usePrism((s) => s.source)
  const applyPreset = usePrism((s) => s.applyPreset)

  return (
    <nav aria-label="Presets" className="pointer-events-auto flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => {
        const active = source === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            aria-pressed={active}
            title={p.blurb}
            className={`group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? 'border-white/30 bg-white/12 text-white shadow-[0_0_24px_-6px_rgba(140,170,255,0.7)]'
                : 'glass border-white/10 text-white/65 hover:border-white/25 hover:text-white'
            }`}
          >
            {active && <span aria-hidden className="spectrum-bar absolute inset-x-0 bottom-0 h-px opacity-90" />}
            <PresetIcon id={p.id} />
            <span className="whitespace-nowrap">{p.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

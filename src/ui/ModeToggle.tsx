import { usePrism, type ViewMode } from '../store'

const MODES: { id: ViewMode; label: string; short: string }[] = [
  { id: 'art', label: 'Art / Ambient', short: 'Art' },
  { id: 'diagnostic', label: 'Utility / Diagnostic', short: 'Utility' },
]

export function ModeToggle() {
  const mode = usePrism((s) => s.mode)
  const setMode = usePrism((s) => s.setMode)

  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="glass pointer-events-auto relative flex rounded-full p-1 text-xs font-medium"
    >
      <span
        aria-hidden
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ${
          mode === 'art' ? 'left-1 spectrum-bar opacity-80' : 'left-1/2 bg-white/15'
        }`}
      />
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={mode === m.id}
          onClick={() => setMode(m.id)}
          title={`${m.label} (press M to toggle)`}
          className={`relative z-10 w-1/2 min-w-[8.5rem] cursor-pointer rounded-full px-4 py-1.5 transition-colors ${
            mode === m.id ? (m.id === 'art' ? 'text-black' : 'text-white') : 'text-white/50 hover:text-white/80'
          }`}
        >
          <span className="hidden sm:inline">{m.label}</span>
          <span className="sm:hidden">{m.short}</span>
        </button>
      ))}
    </div>
  )
}

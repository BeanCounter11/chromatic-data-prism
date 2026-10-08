import { useEffect } from 'react'
import { usePrism } from './store'
import { useOpticsEngine } from './engine/useOpticsEngine'
import { wavelengthBandName, wavelengthToHex } from './engine/spectrum'
import { PrismScene } from './scene/PrismScene'
import { ModeToggle } from './ui/ModeToggle'
import { AudioToggle } from './ui/AudioToggle'
import { PresetBar } from './ui/PresetBar'
import { InputPanel } from './ui/InputPanel'
import { DiagnosticsPanel } from './ui/DiagnosticsPanel'

function useModeShortcut() {
  const toggleMode = usePrism((s) => s.toggleMode)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'm' || e.key === 'M') toggleMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleMode])
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/prism.svg" alt="" className="h-8 w-8 rounded-lg" />
      <div className={compact ? 'hidden' : ''}>
        <h1 className="text-sm font-semibold tracking-wide text-white">
          Chromatic <span className="spectrum-text">Data Prism</span>
        </h1>
        <p className="text-[11px] text-white/40">Every character bends the light differently.</p>
      </div>
    </div>
  )
}

function ArtCaption() {
  const profile = usePrism((s) => s.profile)
  const colour = wavelengthToHex(profile.wavelength)
  return (
    <div className="pointer-events-none flex items-center gap-3 font-mono text-[11px] text-white/45">
      <span className="h-2 w-2 rounded-full" style={{ background: colour, boxShadow: `0 0 12px ${colour}` }} />
      <span>
        {profile.wavelength.toFixed(0)}nm {wavelengthBandName(profile.wavelength)}
      </span>
      <span className="text-white/20">·</span>
      <span>n {profile.refractionIndex.toFixed(2)}</span>
      <span className="text-white/20">·</span>
      <span>{profile.lightAngle.toFixed(0)}°</span>
      <span className="text-white/20">·</span>
      <span>{profile.internalReflections} bounces</span>
    </div>
  )
}

export default function App() {
  useOpticsEngine()
  useModeShortcut()
  const mode = usePrism((s) => s.mode)
  const art = mode === 'art'

  const fade = (visible: boolean) =>
    `transition-all duration-500 ease-out ${visible ? 'opacity-100' : 'pointer-events-none !opacity-0'}`

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink text-white">
      <div className="absolute inset-0">
        <PrismScene />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3 sm:p-4">
        <header className="relative z-30 flex flex-wrap items-center justify-between gap-3">
          <div className={fade(!art)}>
            <Brand compact={false} />
          </div>
          <div className={`order-3 w-full lg:order-none lg:w-auto ${fade(!art)}`}>
            <PresetBar />
          </div>
          <div
            className={`flex items-center gap-2 ${art ? 'opacity-40 transition-opacity focus-within:opacity-100 hover:opacity-100' : ''}`}
          >
            <AudioToggle />
            <ModeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:justify-between">
          <div
            className={`flex max-h-[42vh] min-h-0 w-full lg:max-h-none lg:w-[360px] ${fade(!art)} ${art ? '-translate-x-6' : ''}`}
          >
            <InputPanel className="max-h-full w-full self-start" />
          </div>
          <div className={`hidden min-h-0 w-[380px] lg:flex ${fade(!art)} ${art ? 'translate-x-6' : ''}`}>
            <DiagnosticsPanel className="max-h-full w-full self-start" />
          </div>
        </div>

        <footer className="flex items-center justify-center">
          <div className={fade(art)}>
            <ArtCaption />
          </div>
        </footer>
      </div>

      <p
        className={`pointer-events-none absolute bottom-3 left-4 hidden text-[10px] text-white/25 md:block ${fade(!art)}`}
      >
        Drag to orbit · scroll to zoom · right-drag to pan · M toggles mode
      </p>
    </main>
  )
}

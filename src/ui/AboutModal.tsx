import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-b border-white/5 pb-5 last:border-0 last:pb-0">
      <h3 className="text-[11px] font-semibold tracking-[0.16em] text-white/50 uppercase">{title}</h3>
      <div className="space-y-2 text-[13px] leading-relaxed text-white/70">{children}</div>
    </section>
  )
}

function Term({ children }: { children: ReactNode }) {
  return <span className="font-medium text-white/90">{children}</span>
}

function AboutBody() {
  return (
    <>
      <Section title="What this is">
        <p>
          <Term>Chromatic Data Prism</Term> turns any string of data into light. Your input is hashed into
          optical properties — beam angle, wavelength, glass density, internal bounces, and how strongly colours
          split apart. Those numbers drive a live 3D prism: the glass, the rainbow beams, and the caustics on the
          floor all update as the data changes.
        </p>
        <p>
          Nothing here is a real spectrometer or security tool. It is a visual experiment: data in, light out,
          built for curiosity under the #BuildForJoy ethos.
        </p>
      </Section>

      <Section title="Art / Ambient vs Utility / Diagnostic">
        <p>
          <Term>Utility / Diagnostic</Term> is the working desk. You see the input panel, presets, and Spectral
          Metrics so you can watch how each character changes the physics. Use this when you want to understand or
          poke at the encoder.
        </p>
        <p>
          <Term>Art / Ambient</Term> clears the panels so the prism fills the view. A small caption keeps the
          current wavelength and index; drag to orbit. Press <Term>M</Term> (or use the mode toggle) to switch
          either way. Audio and About stay available in both modes.
        </p>
      </Section>

      <Section title="Presets">
        <p>
          The three chips in the header swap the whole input source. They are shortcuts into ready-made signals:
        </p>
        <ul className="list-disc space-y-2 pl-4 marker:text-white/35">
          <li>
            <Term>Crypto Key Prism</Term> — generates a fresh 256-bit key in your browser (never uploaded) and
            refracts it. Hit “New key” or enable auto-rotate to watch the spectrum avalanche when a few bits flip.
          </li>
          <li>
            <Term>Live CPU Temperature</Term> — browsers cannot read real sensors, so temperature is estimated from
            how hard this page is working. Cool load glows blue; heat shifts toward red and softens the glass
            slightly. Useful as a living thermal colour map, not a thermometer.
          </li>
          <li>
            <Term>Generative Rainbow Ambient</Term> — no typed input. Wavelength, angle, and density drift on slow
            overlapping cycles. Best in Art / Ambient: sit back and orbit the prism.
          </li>
        </ul>
      </Section>

      <Section title="Input Signal">
        <p>When no preset is active, the left panel offers three manual sources:</p>
        <ul className="list-disc space-y-2 pl-4 marker:text-white/35">
          <li>
            <Term>Text</Term> — type anything; every keystroke re-hashes the light. Sample chips load quick demos.
          </li>
          <li>
            <Term>JSON Log</Term> — paste a log object. Valid JSON is canonicalised so whitespace does not change
            the colour; the same log always produces the same light.
          </li>
          <li>
            <Term>Live Pulse</Term> — a synthetic stream of service logs. The rolling window is re-hashed on every
            beat, so each new event re-cuts the beam.
          </li>
        </ul>
      </Section>

      <Section title="Enable Audio Reactive Mode">
        <p>
          Turn this on from the header, then pick a <Term>microphone</Term> or an <Term>audio file</Term>. Analysis
          stays entirely in your browser — nothing is recorded or uploaded. The analyser splits sound into three
          bands that nudge the scene:
        </p>
        <ul className="list-disc space-y-1.5 pl-4 marker:text-white/35">
          <li>
            <Term>Bass</Term> — pulse and beam energy (kick hits flash the meters).
          </li>
          <li>
            <Term>Mids</Term> — refractive index and dispersion (the glass “thickens” with the music).
          </li>
          <li>
            <Term>Treble</Term> — camera shake, spin, and finer ray motion.
          </li>
        </ul>
        <p>Combine it with any input source or preset — audio modulates the optics on top of the hashed profile.</p>
      </Section>

      <Section title="Spectral Metrics">
        <p>
          The right-hand panel (Utility mode, wide screens) is a live readout of the physics derived from your
          input:
        </p>
        <ul className="list-disc space-y-2 pl-4 marker:text-white/35">
          <li>
            <Term>Light angle</Term> — incidence angle of the incoming white beam on the prism face.
          </li>
          <li>
            <Term>Wavelength</Term> — dominant colour of the hashed signal, in nanometres (with a band name like
            Red or Cyan).
          </li>
          <li>
            <Term>Refraction index (n)</Term> — how strongly the glass bends light (water ≈ 1.33, typical glass ≈
            1.5, diamond ≈ 2.4).
          </li>
          <li>
            <Term>Internal reflections</Term> — how many bounces are forced inside the prism before light may
            escape.
          </li>
          <li>
            <Term>Data spectrum</Term> — character-class histogram stretched across the visible range; spikes show
            which “colours” of characters dominate the text.
          </li>
          <li>
            <Term>Ray trace</Term> — nine wavelengths run through Snell’s law; deviation and bounce counts show
            which colours escape vs stay trapped.
          </li>
          <li>
            <Term>Signal history</Term> — recent wavelength and index over time (handy with Live Pulse or rotating
            keys).
          </li>
          <li>
            <Term>Entropy / Dispersion / Band</Term> — Shannon entropy of the text, how hard red and violet split
            apart, and the named colour band. The footer hash and SHA-256 fingerprint the current input string.
          </li>
        </ul>
      </Section>

      <Section title="How to look around">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-white/35">
          <li>
            <Term>Drag</Term> to orbit · <Term>scroll</Term> to zoom · <Term>right-drag</Term> to pan.
          </li>
          <li>
            Press <Term>M</Term> to toggle Art / Utility when you are not typing in a field.
          </li>
          <li>On narrow screens, Spectral Metrics hide — switch to a wider layout or use the Art caption for a quick readout.</li>
        </ul>
      </Section>
    </>
  )
}

export function AboutButton() {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="pointer-events-auto glass flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-white/65 transition hover:text-white"
        title="About this tool"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7.5h.01" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">About</span>
      </button>

      {open && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close about dialog"
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="glass animate-fade-in relative z-10 flex max-h-[min(88dvh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">Guide</p>
                <h2 id={titleId} className="text-base font-semibold text-white">
                  About Chromatic Data Prism
                </h2>
                <p className="mt-0.5 text-[12px] text-white/45">A quick tour for first-time visitors.</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Close
              </button>
            </header>
            <div className="thin-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <AboutBody />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

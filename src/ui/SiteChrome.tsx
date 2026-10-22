const BUILD_FOR_JOY = 'https://buildforjoy.dev'
const GITHUB_REPO = 'https://github.com/BeanCounter11/chromatic-data-prism'

/** Back-link to the Build for Joy hub — always reachable, including in Art mode. */
export function BuildForJoyLink({ className = '' }: { className?: string }) {
  return (
    <a
      href={BUILD_FOR_JOY}
      target="_blank"
      rel="noopener noreferrer"
      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur-md transition hover:border-white/25 hover:text-white ${className}`}
      title="Back to buildforjoy.dev"
    >
      <span aria-hidden className="text-white/40">
        ←
      </span>
      buildforjoy.dev
    </a>
  )
}

/** AS-IS / MIT / #BuildForJoy footer shown on every layout. */
export function LegalFooter({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <footer
      className={`pointer-events-auto max-w-3xl px-2 text-center transition-opacity duration-500 ${
        dimmed ? 'opacity-35 hover:opacity-90 focus-within:opacity-90' : 'opacity-80'
      }`}
    >
      <p className="text-[10px] leading-relaxed text-white/55 sm:text-[11px]">
        This app is a non-commercial hobby experiment provided &apos;AS IS&apos; without warranty of any kind, express
        or implied. Use at your own risk. Released under the{' '}
        <a
          href={`${GITHUB_REPO}/blob/main/LICENSE`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/60"
        >
          MIT License
        </a>
        .
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-white/45 sm:text-[11px]">
        Built for curiosity under the{' '}
        <a
          href={BUILD_FOR_JOY}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/60"
        >
          #BuildForJoy
        </a>{' '}
        ethos — learning by making, not monetising. Further details at{' '}
        <a
          href={BUILD_FOR_JOY}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/60"
        >
          buildforjoy.dev
        </a>
        .{' '}
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/60"
        >
          Open Source
        </a>
      </p>
    </footer>
  )
}

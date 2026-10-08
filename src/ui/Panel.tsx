import type { ReactNode } from 'react'

export function Panel({
  title,
  kicker,
  actions,
  children,
  className = '',
}: {
  title: string
  kicker?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`glass pointer-events-auto flex min-h-0 flex-col rounded-2xl ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          {kicker && <p className="text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">{kicker}</p>}
          <h2 className="text-sm font-semibold text-white/90">{title}</h2>
        </div>
        {actions}
      </header>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  )
}

export function SectionLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-semibold tracking-[0.14em] text-white/55 uppercase">{children}</h3>
      {hint && <span className="font-mono text-[10px] text-white/40">{hint}</span>}
    </div>
  )
}

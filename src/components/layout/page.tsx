import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Container padrão das páginas do app. */
export function Page({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl space-y-8 px-6 py-8 lg:px-10 lg:py-10', className)}>{children}</div>
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-display text-5xl font-extrabold uppercase italic leading-none tracking-wide text-silver-bright">
          {title}
        </h1>
        {description && <p className="pt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions}
    </header>
  )
}

/** Rótulo de HUD: mono, caixa alta, com marcador roxo. */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary-soft', className)}>
      <span className="h-px w-5 bg-primary" />
      {children}
    </p>
  )
}

/** Título de seção: condensado, com índice opcional ("01"). */
export function SectionTitle({ index, children, actions }: { index?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
      <h2 className="flex items-baseline gap-3 font-display text-2xl font-bold uppercase tracking-wide text-silver-bright">
        {index && <span className="font-mono text-xs font-medium text-primary-soft">{index}</span>}
        {children}
      </h2>
      {actions}
    </div>
  )
}

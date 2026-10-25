import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning'

const tones: Record<Tone, string> = {
  neutral: 'border-line-strong bg-raised text-fg-muted',
  primary: 'border-primary/40 bg-primary-dim text-primary-soft',
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-danger/30 bg-danger-dim text-danger-hover',
  warning: 'border-warning/30 bg-warning/10 text-warning',
}

/** Etiqueta de HUD: mono, caixa alta. */
export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

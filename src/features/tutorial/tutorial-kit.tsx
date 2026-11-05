import type { ReactNode } from 'react'
import { ChevronsRight, type LucideIcon } from 'lucide-react'
import { classIcons } from '@/features/game/class-icons'
import type { CharacterClass } from '@/features/game/game-api'
import { cn } from '@/lib/cn'

// Peças dos passos dos tutoriais: texto, lista de pontos e as miniaturas da tela ("como aparece"). As miniaturas são
// desenhos com os mesmos tokens da tela real, sem dado de verdade.

export const Lead = ({ children }: { children: ReactNode }) => <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{children}</p>
export const Strong = ({ children }: { children: ReactNode }) => <b className="font-semibold text-fg">{children}</b>

export type Point = { label: string; text: ReactNode; icon?: LucideIcon }

/** Passo padrão: frase de abertura, a miniatura da tela ao lado dos pontos e uma dica opcional no pé. */
export function StepLayout({ lead, visual, points, tip }: { lead: ReactNode; visual?: ReactNode; points?: Point[]; tip?: ReactNode }) {
  return (
    <div className="space-y-6">
      <Lead>{lead}</Lead>
      {(visual || points) && (
        <div className={cn('grid items-start gap-8', visual && points ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : undefined)}>
          {visual && <Mock>{visual}</Mock>}
          {points && <Points points={points} />}
        </div>
      )}
      {tip && <p className="border-t border-line/60 pt-4 text-xs leading-relaxed text-fg-subtle">{tip}</p>}
    </div>
  )
}

/** Lista numerada ("01") dos elementos da tela. */
export function Points({ points }: { points: Point[] }) {
  return (
    <ol className="space-y-4">
      {points.map(({ label, text, icon: Icon }, i) => (
        <li key={label} className="flex gap-3">
          <span className="w-6 shrink-0 pt-0.5 font-mono text-[11px] text-primary-soft tabular-nums">{String(i + 1).padStart(2, '0')}</span>
          <div className="min-w-0 space-y-0.5">
            <p className="flex items-center gap-1.5 font-display text-base leading-tight font-bold uppercase tracking-wide text-silver-bright">
              {Icon && <Icon className="size-4 shrink-0 text-primary-soft" />}
              {label}
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Moldura da miniatura: "como aparece na tela". */
export function Mock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <figure className={cn('hud-corners relative space-y-3 border border-line/60 bg-bg/60 p-4', className)}>
      <figcaption className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-subtle">{'// '}Na tela</figcaption>
      <div aria-hidden className="pointer-events-none space-y-3 select-none">
        {children}
      </div>
    </figure>
  )
}

/** Rótulo pequeno de HUD dentro da miniatura. */
export const MockLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn('font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle', className)}>{children}</p>
)

/** Cartão chanfrado da miniatura (o mesmo formato dos cards reais). */
export function MockCard({ children, active, tone = 'primary', className }: {
  children: ReactNode
  active?: boolean
  tone?: 'primary' | 'danger' | 'warning'
  className?: string
}) {
  const activeStyle = {
    primary: '[--chamfer-bg:rgb(34_26_61/0.9)] [--chamfer-border:var(--color-primary-soft)]',
    danger: '[--chamfer-bg:rgb(59_21_23/0.9)] [--chamfer-border:var(--color-danger-hover)]',
    warning: '[--chamfer-bg:rgb(59_40_10/0.85)] [--chamfer-border:rgb(245_165_36/0.6)]',
  }[tone]
  return (
    <div
      className={cn(
        'chamfer p-3 [--cut:10px]',
        active ? activeStyle : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Botão desenhado (não clica): mesmo visual do primário ou secundário. */
export function MockButton({ children, variant = 'primary', className }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1.5 px-3 font-display text-xs font-bold uppercase tracking-widest',
        variant === 'primary' && 'chamfer text-on-primary [--chamfer-bg:var(--color-primary)] [--chamfer-border:var(--color-primary-soft)] [--cut:7px]',
        variant === 'secondary' && 'chamfer text-fg [--chamfer-bg:var(--color-raised)] [--chamfer-border:var(--color-line-strong)] [--cut:7px]',
        variant === 'ghost' && 'text-fg-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}

export type MockUnit = { row: number; column: number; characterClass: CharacterClass; tag?: ReactNode }

/**
 * Grade 3x3 da formação em miniatura. `column` 0 é a frente: do lado do jogador fica à direita, encarando o inimigo;
 * `mirrored` desenha o lado do inimigo (frente à esquerda).
 */
export function MockGrid({ units = [], side = 'PLAYER', highlight = [], size = 'md', arrow }: {
  units?: MockUnit[]
  side?: 'PLAYER' | 'OPPONENT'
  /** Casas acesas (alvo válido, por exemplo). */
  highlight?: { row: number; column: number }[]
  size?: 'sm' | 'md'
  arrow?: boolean
}) {
  const ally = side === 'PLAYER'
  const columns = ally ? [2, 1, 0] : [0, 1, 2]
  return (
    <div className="flex items-center gap-2">
      <div className={cn('grid grid-cols-3', size === 'sm' ? 'gap-1' : 'gap-1.5')}>
        {[0, 1, 2].flatMap((row) =>
          columns.map((column) => {
            const unit = units.find((u) => u.row === row && u.column === column)
            const lit = highlight.some((h) => h.row === row && h.column === column)
            const Icon = unit && classIcons[unit.characterClass]
            return (
              <span
                key={`${row}:${column}`}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 rounded-control border',
                  size === 'sm' ? 'size-9' : 'size-12',
                  unit
                    ? ally
                      ? 'border-primary-soft/60 bg-primary/15'
                      : 'border-danger-hover/60 bg-danger/15'
                    : 'border-silver/12 bg-white/2',
                  lit && (ally ? 'border-primary-soft bg-primary/25 ring-1 ring-primary-soft' : 'border-danger-hover bg-danger/25 ring-1 ring-danger-hover'),
                )}
              >
                {Icon && <Icon className={cn('text-silver-bright', size === 'sm' ? 'size-3.5' : 'size-4')} strokeWidth={1.75} />}
                {unit?.tag}
              </span>
            )
          }),
        )}
      </div>
      {arrow && <ChevronsRight className="size-4 shrink-0 text-enemy/60" />}
    </div>
  )
}

/** Barra de progresso fina (XP, vida). */
export function MockBar({ value, tone = 'primary', className }: { value: number; tone?: 'primary' | 'success' | 'danger' | 'silver'; className?: string }) {
  return (
    <span className={cn('block h-1 bg-overlay', className)}>
      <span
        className={cn(
          'block h-full',
          tone === 'primary' && 'bg-gradient-primary',
          tone === 'success' && 'bg-success',
          tone === 'danger' && 'bg-danger',
          tone === 'silver' && 'bg-silver/60',
        )}
        style={{ width: `${value}%` }}
      />
    </span>
  )
}

/** Fluxo em setas: "A → B → C". */
export function Flow({ items }: { items: { icon: LucideIcon; label: string }[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {items.map(({ icon: Icon, label }, i) => (
        <li key={label} className="flex items-center gap-2">
          <span className="chamfer flex items-center gap-1.5 px-2.5 py-1.5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line-strong)] [--cut:7px]">
            <Icon className="size-3.5 text-primary-soft" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-fg">{label}</span>
          </span>
          {i < items.length - 1 && <ChevronsRight className="size-3.5 text-fg-subtle" />}
        </li>
      ))}
    </ol>
  )
}

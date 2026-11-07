import type { CSSProperties } from 'react'
import { Flame } from 'lucide-react'
import type { AwakeningHint } from '@/features/game/game-api'
import { awakeningHints } from '@/features/game/glossary'
import { cn } from '@/lib/cn'

// A dica do despertar (D151). O jogador nunca vê qual despertar nem as missões: só que algo está mudando.
// Sinais e iminente em âmbar (algo se mexendo); despertado em roxo (a energia acesa de vez).

const stages = ['SIGNS', 'IMMINENT', 'AWAKENED'] as const

const toneOf = (hint: AwakeningHint) => (hint === 'AWAKENED' ? 'var(--color-primary-soft)' : 'var(--color-warning)')

/** Núcleo pulsando dentro do losango: mais rápido no iminente, aceso de vez no despertado. */
function Core({ hint, size = 'md' }: { hint: AwakeningHint; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('relative flex shrink-0 items-center justify-center', size === 'md' ? 'size-12' : 'size-6')}>
      <span
        className={cn(
          'absolute inset-[18%] rotate-45 border border-(--tone)/60 bg-(--tone)/10 transition-transform duration-500 group-hover:rotate-135',
          hint === 'AWAKENED' && 'bg-(--tone)/20 shadow-[0_0_18px_-4px_var(--tone)]',
        )}
      />
      <span
        aria-hidden
        className={cn(
          'absolute inset-[28%] rounded-pill bg-(--tone) blur-md motion-reduce:animate-none',
          hint === 'SIGNS' && 'animate-awaken-pulse opacity-50',
          hint === 'IMMINENT' && 'animate-awaken-pulse-fast',
          hint === 'AWAKENED' && 'opacity-60',
        )}
      />
      <Flame className={cn('relative text-(--tone)', size === 'md' ? 'size-5' : 'size-3')} />
    </span>
  )
}

/** Etiqueta curta (cartões do elenco). Silêncio não aparece. */
export function AwakeningChip({ hint, className }: { hint: AwakeningHint; className?: string }) {
  if (hint === 'SILENT') return null
  const info = awakeningHints[hint]
  return (
    <span
      title={info.text}
      style={{ '--tone': toneOf(hint) } as CSSProperties}
      className={cn(
        'group inline-flex items-center gap-1 border border-(--tone)/40 bg-bg/80 py-0.5 pr-2 pl-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-(--tone) backdrop-blur-sm',
        className,
      )}
    >
      <Core hint={hint} size="sm" />
      {info.label}
    </span>
  )
}

/**
 * Cartão da ficha: o estado, a frase e a trilha de 3 marcas (sinais, iminente, despertado). A trilha mostra o estágio,
 * não as missões.
 */
export function AwakeningCard({ hint }: { hint: AwakeningHint }) {
  if (hint === 'SILENT') return null
  const info = awakeningHints[hint]
  const reached = stages.indexOf(hint)

  return (
    <div
      style={{ '--tone': toneOf(hint) } as CSSProperties}
      className="chamfer group relative w-full max-w-md animate-awaken-in overflow-hidden p-4 [--chamfer-bg:rgb(12_12_15/0.8)] [--chamfer-border:color-mix(in_srgb,var(--tone)_40%,transparent)] [--cut:14px] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:[--chamfer-border:var(--tone)]"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_0%_50%,color-mix(in_srgb,var(--tone)_16%,transparent),transparent)] opacity-70 transition-opacity group-hover:opacity-100" />
      <Flame className="pointer-events-none absolute -right-3 -bottom-5 size-24 text-(--tone) opacity-[0.06] transition-all duration-500 group-hover:-rotate-6 group-hover:opacity-[0.12]" />

      <div className="relative flex items-center gap-3">
        <Core hint={hint} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--tone)">Despertar</p>
          <p className="font-display text-xl leading-tight font-bold uppercase italic tracking-wide text-silver-bright">
            {info.label}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted transition-colors group-hover:text-fg">{info.text}</p>
        </div>
      </div>

      <ol className="relative mt-3 grid grid-cols-3 gap-1" aria-label="Estágio do despertar">
        {stages.map((stage, i) => (
          <li key={stage} className="space-y-1">
            <span
              className={cn(
                'block h-1 -skew-x-12 transition-colors duration-500',
                i <= reached ? 'bg-(--tone) shadow-[0_0_8px_var(--tone)]' : 'bg-overlay',
                i === reached && hint !== 'AWAKENED' && 'animate-awaken-pulse motion-reduce:animate-none',
              )}
            />
            <span className={cn('block font-mono text-[9px] uppercase tracking-[0.14em]', i <= reached ? 'text-(--tone)' : 'text-fg-subtle')}>
              {awakeningHints[stage].short}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Aviso do fim da batalha (resultado e histórico): quem despertou agora. O jogador só fica sabendo aqui. */
export function AwakenedBanner({ names, className }: { names: string[]; className?: string }) {
  if (!names.length) return null
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
  return (
    <div
      role="status"
      style={{ '--tone': 'var(--color-primary-soft)' } as CSSProperties}
      className={cn(
        'chamfer group relative animate-awaken-in overflow-hidden p-4 [--chamfer-bg:rgb(34_26_61/0.85)] [--chamfer-border:var(--color-primary-soft)] [--cut:14px] shadow-glow',
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_0%_50%,rgb(139_92_246/0.35),transparent)]" />
      <span className="pointer-events-none absolute inset-0 scanlines opacity-60" />
      <div className="relative flex items-center gap-3">
        <Core hint="AWAKENED" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary-soft">Despertar</p>
          <p className="font-display text-2xl leading-tight font-extrabold uppercase italic text-silver-bright">
            {who} <span className="text-gradient-primary pr-1">{names.length === 1 ? 'despertou' : 'despertaram'}</span>
          </p>
          <p className="text-xs text-fg-muted">O poder evoluiu. Os blocos de recuperação estão na ficha, com skills despertadas.</p>
        </div>
      </div>
    </div>
  )
}

import { Coins as CoinsIcon, Gem } from 'lucide-react'
import type { FragmentDelta } from '@/features/economy/economy-api'
import { formatCoins, fragmentLabels, fragmentTone, fragmentTypes, rarityTone } from '@/features/economy/economy-labels'
import type { Lineage, Rarity } from '@/features/game/game-api'
import { cn } from '@/lib/cn'

// Peças visuais da economia: moeda (M), fragmentos por tipo, cor da raridade e o desenho do baú.

/** Valor em moeda: ícone dourado + número em mono + "M". */
export function Coins({ value, signed, className, iconClassName }: {
  value: number
  /** Mostra "+" no ganho. */
  signed?: boolean
  className?: string
  iconClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono tabular-nums', className)}>
      <CoinsIcon className={cn('size-3.5 shrink-0 text-coin', iconClassName)} aria-hidden />
      {signed && value > 0 && '+'}
      {formatCoins(value)}
      <span className="text-[0.8em] text-fg-subtle">M</span>
    </span>
  )
}

/** Ícone do fragmento na cor do tipo. */
export function FragmentIcon({ type, className }: { type: Lineage; className?: string }) {
  return <Gem className={cn('size-3.5 shrink-0', fragmentTone[type].text, className)} aria-hidden />
}

/** Fragmentos ganhos (variação): uma etiqueta por tipo que mudou. */
export function FragmentDeltaList({ fragments, className }: { fragments: FragmentDelta; className?: string }) {
  const entries = fragmentTypes.filter((type) => fragments[type])
  if (entries.length === 0) return null
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {entries.map((type) => (
        <span
          key={type}
          title={`Fragmento ${fragmentLabels[type]}`}
          className="inline-flex items-center gap-1 border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[11px] text-fg tabular-nums"
        >
          <FragmentIcon type={type} className="size-3" />
          {fragments[type]! > 0 && '+'}
          {fragments[type]}
          <span className="text-fg-subtle">{fragmentLabels[type]}</span>
        </span>
      ))}
    </span>
  )
}

/** Etiqueta da raridade: a letra na cor dela. */
export function RarityTag({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-6 items-center justify-center border px-1 font-display text-sm leading-5 font-extrabold italic',
        rarityTone[rarity].text,
        rarityTone[rarity].border,
        className,
      )}
      title={`Raridade ${rarity}`}
    >
      {rarity}
    </span>
  )
}

/**
 * Baú desenhado (SVG), na cor do nível. `open`: tampa levantada e luz saindo, com transição (o expositor do Mercado abre
 * no hover). Sem arquivo de arte: o mesmo desenho em toda a tela.
 */
export function ChestArt({ tier, open, className }: { tier: Rarity; open?: boolean; className?: string }) {
  const color = rarityTone[tier].color
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
  return (
    <svg viewBox="0 0 120 100" className={cn('overflow-visible', className)} style={{ color }} aria-hidden>
      {/* brilho no chão */}
      <ellipse cx="60" cy="94" rx="46" ry="5" fill="currentColor" style={{ opacity: open ? 0.35 : 0.15, transition: 'opacity 300ms' }} />
      {/* luz que sai do baú aberto */}
      <path
        d="M30 50 L8 -6 L112 -6 L90 50 Z"
        fill="currentColor"
        style={{ opacity: open ? 0.2 : 0, transformBox: 'fill-box', transformOrigin: '50% 100%', transform: open ? 'scaleY(1)' : 'scaleY(0.2)', transition: `opacity 300ms, transform 400ms ${ease}` }}
      />
      {/* corpo */}
      <path d="M16 50 H104 V88 L98 94 H22 L16 88 Z" fill="var(--color-raised)" stroke="currentColor" strokeWidth="2" />
      <path d="M16 62 H104" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <path d="M38 50 V94 M82 50 V94" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      {/* tampa: gira pela dobradiça de trás (canto esquerdo de baixo) */}
      <g
        style={{
          transformBox: 'fill-box',
          transformOrigin: '0% 100%',
          transform: open ? 'translateY(-14px) rotate(-14deg)' : 'none',
          transition: `transform 400ms ${ease}`,
        }}
      >
        <path d="M16 50 V34 L26 22 H94 L104 34 V50 Z" fill="var(--color-overlay)" stroke="currentColor" strokeWidth="2" />
        <path d="M16 38 H104" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      </g>
      {/* fecho */}
      <g style={{ opacity: open ? 0 : 1, transition: 'opacity 150ms' }}>
        <path d="M52 44 H68 V60 L60 66 L52 60 Z" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2" />
        <circle cx="60" cy="53" r="2.5" fill="currentColor" />
      </g>
    </svg>
  )
}

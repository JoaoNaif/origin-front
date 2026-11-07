import type { CSSProperties } from 'react'
import { Coins as CoinsIcon, Gem } from 'lucide-react'
import { useWallet } from '@/features/economy/economy-api'
import { formatCoins, fragmentLabels, fragmentTone, fragmentTypes } from '@/features/economy/economy-labels'
import type { Lineage } from '@/features/game/game-api'
import { cn } from '@/lib/cn'
import { useCountUp } from '@/lib/use-count-up'

type WalletBarProps = {
  className?: string
  /** Tipo destacado (ex.: o escolhido na troca do Mercado). */
  selected?: Lineage
  /** Com ele, cada fragmento vira botão. */
  onSelect?: (type: Lineage) => void
}

/**
 * Carteira de HUD (Mercado e Baús): o cofre de moeda à esquerda e uma coluna por tipo de fragmento, cada uma na cor da
 * linhagem, com a barra até o limite. Os números correm até o valor novo e o ganho/gasto sobe na tela.
 */
export function WalletBar({ className, selected, onSelect }: WalletBarProps) {
  const wallet = useWallet()

  if (wallet.isPending) {
    return (
      <div className={cn('grid gap-3 lg:grid-cols-[19rem_1fr]', className)}>
        <div className="h-44 animate-pulse bg-raised" />
        <div className="h-44 animate-pulse bg-raised" />
      </div>
    )
  }
  if (wallet.isError) return <p className={cn('text-sm text-danger', className)}>Não foi possível carregar a carteira.</p>

  const { coins, fragments, fragmentCap } = wallet.data
  const total = fragmentTypes.reduce((sum, type) => sum + fragments[type], 0)

  return (
    <div className={cn('grid gap-3 lg:grid-cols-[19rem_1fr]', className)}>
      <CoinVault coins={coins} />

      <div className="relative min-w-0">
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            <span className="h-px w-4 bg-line-strong" />
            Fragmentos de Éon
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle tabular-nums">
            {total} no total · limite {fragmentCap} por tipo
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {fragmentTypes.map((type, i) => (
            <li key={type}>
              <FragmentTile
                type={type}
                index={i}
                value={fragments[type]}
                cap={fragmentCap}
                selected={selected === type}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Cofre da moeda: o número grande, ícone num losango dourado e o brilho que acorda no hover. */
function CoinVault({ coins }: { coins: number }) {
  const { shown, delta } = useCountUp(coins)

  return (
    <div className="chamfer group relative flex min-h-44 flex-col justify-between overflow-hidden p-5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--color-coin)_35%,transparent)] [--cut:20px] hover:[--chamfer-border:var(--color-coin)]">
      {/* luz dourada no canto e linhas de varredura */}
      <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-pill bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-coin)_22%,transparent),transparent_70%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 scanlines" />
      <CoinsIcon className="pointer-events-none absolute -right-6 -bottom-8 size-40 -rotate-12 text-coin/5 transition-transform duration-500 ease-out-soft group-hover:-rotate-3 group-hover:scale-105" />

      <div className="relative flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
          <span className="text-coin">//</span> Moeda
        </p>
        <span className="font-mono text-[10px] text-fg-subtle">M</span>
      </div>

      <div className="relative flex items-center gap-4">
        <span className="relative flex size-12 shrink-0 items-center justify-center">
          <span className="absolute inset-1 rotate-45 border border-coin/50 bg-coin/10 shadow-[0_0_18px_-4px_var(--color-coin)] transition-transform duration-300 ease-out-soft group-hover:rotate-135" />
          <CoinsIcon className="relative size-5 text-coin" />
        </span>
        <div className="relative min-w-0">
          <p className="truncate font-display text-5xl leading-none font-extrabold italic text-silver-bright tabular-nums">
            {formatCoins(shown)}
          </p>
          {delta && <DeltaPop key={delta.key} value={delta.value} suffix=" M" className="left-1 -top-5 text-sm" />}
        </div>
      </div>

      <div className="relative h-px bg-linear-to-r from-coin/60 via-coin/15 to-transparent" />
    </div>
  )
}

function FragmentTile({ type, index, value, cap, selected, onSelect }: {
  type: Lineage
  index: number
  value: number
  cap: number
  selected: boolean
  onSelect?: (type: Lineage) => void
}) {
  const { shown, delta } = useCountUp(value)
  const fill = Math.min(100, (value / cap) * 100)
  const full = value >= cap
  const empty = value === 0
  const Tag = onSelect ? 'button' : 'div'

  return (
    <Tag
      {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(type), 'aria-pressed': selected } : {})}
      title={`Fragmento ${fragmentLabels[type]}: ${value} de ${cap}`}
      style={{ '--tone': fragmentTone[type].color } as CSSProperties}
      className={cn(
        'chamfer group relative flex h-44 w-full flex-col items-center overflow-hidden px-3 pt-3 pb-3.5 text-center [--cut:12px]',
        'transition-all duration-200 ease-out-soft hover:-translate-y-1',
        '[--chamfer-bg:var(--color-surface)] hover:[--chamfer-bg:var(--color-raised)]',
        selected
          ? '[--chamfer-border:var(--tone)] shadow-[0_10px_30px_-14px_var(--tone)]'
          : '[--chamfer-border:color-mix(in_srgb,var(--tone)_22%,var(--color-line))] hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_70%,transparent)]',
        onSelect && 'focus-ring cursor-pointer',
      )}
    >
      {/* brilho na cor do tipo, que cresce no hover */}
      <span
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_srgb,var(--tone)_28%,transparent),transparent)] transition-opacity duration-300',
          selected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100',
        )}
      />
      {/* topo: índice e percentual */}
      <span className="relative flex w-full items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em]">
        <span className={selected ? 'text-(--tone)' : 'text-fg-subtle'}>{String(index + 1).padStart(2, '0')}</span>
        {full ? (
          <span className="text-warning">Cheio</span>
        ) : (
          <span className="text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100">{Math.round(fill)}%</span>
        )}
      </span>

      {/* gema num losango */}
      <span className="relative mt-2 flex size-11 items-center justify-center">
        <span
          className={cn(
            'absolute inset-1.5 rotate-45 border transition-all duration-300 ease-out-soft group-hover:rotate-135 group-hover:scale-110',
            empty ? 'border-line-strong' : 'border-(--tone)/60 bg-(--tone)/10 shadow-[0_0_16px_-6px_var(--tone)]',
          )}
        />
        <Gem className={cn('relative size-4.5 transition-transform duration-300 group-hover:scale-110', empty ? 'text-fg-subtle' : 'text-(--tone)')} />
      </span>

      {/* quantidade */}
      <span className="relative mt-2">
        <span className={cn('font-display text-3xl leading-none font-extrabold italic tabular-nums', empty ? 'text-fg-subtle' : 'text-silver-bright')}>
          {shown}
        </span>
        {delta && <DeltaPop key={delta.key} value={delta.value} className="-top-3 left-full ml-1 text-xs" />}
      </span>
      <span className={cn('relative mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors', selected ? 'text-(--tone)' : 'text-fg-muted group-hover:text-fg')}>
        {fragmentLabels[type]}
      </span>

      {/* barra até o limite */}
      <span className="relative mt-auto w-full">
        <span className="block h-0.75 w-full -skew-x-12 bg-overlay">
          <span
            className="block h-full bg-(--tone) shadow-[0_0_8px_var(--tone)] transition-[width] duration-700 ease-out-soft"
            style={{ width: `${Math.max(fill, empty ? 0 : 2)}%` }}
          />
        </span>
        <span className="mt-1 block font-mono text-[9px] text-fg-subtle tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
          {value} / {cap}
        </span>
      </span>
    </Tag>
  )
}

/** Variação que sobe e some ao lado do número (+130, −300). */
function DeltaPop({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute font-mono font-bold whitespace-nowrap tabular-nums motion-safe:animate-float-up motion-reduce:hidden',
        value > 0 ? 'text-success' : 'text-danger-hover',
        className,
      )}
    >
      {value > 0 ? '+' : '−'}
      {formatCoins(Math.abs(value))}
      {suffix}
    </span>
  )
}

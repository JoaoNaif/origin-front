import { useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Gem, Minus, Plus } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { useBuyFragments, useSellFragments, type EconomyValues, type Wallet } from '@/features/economy/economy-api'
import { formatCoins, fragmentLabels, fragmentTone, fragmentTypes } from '@/features/economy/economy-labels'
import { Coins } from '@/features/economy/economy-ui'
import type { Lineage } from '@/features/game/game-api'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

type Mode = 'buy' | 'sell'

/**
 * Troca de fragmentos com o sistema (D104): a lista dos 7 tipos à esquerda e o terminal de troca à direita, na cor do
 * tipo escolhido, com o antes → depois da carteira. Limites (saldo, 500 por tipo) só orientam; quem decide é o servidor.
 */
export function FragmentExchange({ economy, wallet, type, onTypeChange }: {
  economy: EconomyValues
  wallet: Wallet
  type: Lineage
  onTypeChange: (type: Lineage) => void
}) {
  const { cap, sellPrice } = economy.fragments

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="space-y-4">
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
          O aprimoramento de skill gasta fragmentos da <span className="text-fg">linhagem da skill</span> (Neutro nas sem linhagem). Compre o
          que faltar e venda o que sobrar. Até {cap} por tipo: o que passar disso vira moeda ({sellPrice} M cada).
        </p>
        <ul className="space-y-1.5" aria-label="Tipos de fragmento">
          {fragmentTypes.map((t, i) => (
            <li key={t}>
              <FragmentRow type={t} index={i} value={wallet.fragments[t]} cap={cap} selected={t === type} onSelect={() => onTypeChange(t)} />
            </li>
          ))}
        </ul>
      </div>

      <TradeTerminal economy={economy} wallet={wallet} type={type} />
    </div>
  )
}

function FragmentRow({ type, index, value, cap, selected, onSelect }: {
  type: Lineage
  index: number
  value: number
  cap: number
  selected: boolean
  onSelect: () => void
}) {
  const fill = Math.min(100, (value / cap) * 100)

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{ '--tone': fragmentTone[type].color } as CSSProperties}
      className={cn(
        'focus-ring chamfer group relative flex w-full items-center gap-4 overflow-hidden py-2.5 pr-4 pl-3 text-left [--cut:10px]',
        'transition-all duration-200 ease-out-soft hover:translate-x-1',
        selected
          ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_9%,var(--color-surface))] [--chamfer-border:color-mix(in_srgb,var(--tone)_70%,transparent)]'
          : '[--chamfer-bg:transparent] [--chamfer-border:transparent] hover:[--chamfer-bg:var(--color-surface)] hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_30%,var(--color-line))]',
      )}
    >
      {/* barra de seleção à esquerda */}
      <span className={cn('absolute inset-y-2 left-0 w-0.75 bg-(--tone) shadow-[0_0_10px_var(--tone)] transition-transform duration-200', selected ? 'scale-y-100' : 'scale-y-0')} />

      <span className="w-5 font-mono text-[10px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
      <GemBadge type={type} size="sm" active={selected} />
      <span className={cn('w-28 font-display text-lg font-bold uppercase tracking-wide transition-colors', selected ? 'text-(--tone)' : 'text-fg group-hover:text-silver-bright')}>
        {fragmentLabels[type]}
      </span>

      {/* barra com marcas a cada 10% */}
      <span className="relative h-2 flex-1 -skew-x-12 bg-overlay">
        <span className="absolute inset-y-0 left-0 bg-(--tone) shadow-[0_0_8px_var(--tone)] transition-[width] duration-500 ease-out-soft" style={{ width: `${fill}%` }} />
        <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_calc(10%-1px),var(--color-bg)_calc(10%-1px)_10%)]" />
      </span>

      <span className="w-24 text-right font-mono text-xs tabular-nums">
        <span className={cn('text-sm', value ? 'text-fg' : 'text-fg-subtle')}>{value}</span>
        <span className="text-fg-subtle"> / {cap}</span>
      </span>
    </button>
  )
}

/** Painel de troca: modo, quantidade com atalhos, o antes → depois e a ação. */
function TradeTerminal({ economy, wallet, type }: { economy: EconomyValues; wallet: Wallet; type: Lineage }) {
  const [mode, setMode] = useState<Mode>('buy')
  const [amount, setAmount] = useState(1)
  const buy = useBuyFragments()
  const sell = useSellFragments()
  const mutation = mode === 'buy' ? buy : sell

  const { buyPrice, sellPrice, cap } = economy.fragments
  const have = wallet.fragments[type]
  const room = cap - have
  const affordable = Math.floor(wallet.coins / buyPrice)
  const max = mode === 'buy' ? Math.max(0, Math.min(room, affordable)) : have
  const qty = Math.min(Math.max(1, amount), Math.max(1, max))
  const unit = mode === 'buy' ? buyPrice : sellPrice
  const total = qty * unit
  const blocked = max === 0
  const reason =
    mode === 'sell'
      ? 'Você não tem fragmentos deste tipo para vender.'
      : room === 0
        ? `Este tipo já está no limite de ${cap}.`
        : `Moeda insuficiente: cada um custa ${buyPrice} M.`
  const limitHint = mode === 'sell' ? 'tudo o que você tem' : room <= affordable ? `limite de ${cap} do tipo` : 'sua moeda'

  const afterFragments = mode === 'buy' ? have + qty : have - qty
  const afterCoins = mode === 'buy' ? wallet.coins - total : wallet.coins + total

  function submit() {
    mutation.mutate(
      { type, amount: qty },
      {
        onSuccess: () => {
          toast.success(
            `${mode === 'buy' ? 'Comprou' : 'Vendeu'} ${qty} ${qty === 1 ? 'fragmento' : 'fragmentos'} ${fragmentLabels[type]}`,
            `${mode === 'buy' ? '−' : '+'}${formatCoins(total)} M`,
          )
          setAmount(1)
        },
      },
    )
  }

  return (
    <div
      style={{ '--tone': fragmentTone[type].color } as CSSProperties}
      className="chamfer relative h-fit overflow-hidden [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_45%,var(--color-line))] [--cut:22px]"
    >
      {/* cabeçalho na cor do tipo */}
      <div className="relative overflow-hidden border-b border-line/70 px-5 pt-5 pb-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_0%_0%,color-mix(in_srgb,var(--tone)_22%,transparent),transparent)]" />
        <div className="pointer-events-none absolute inset-0 scanlines" />
        <Gem className="pointer-events-none absolute -top-6 -right-6 size-32 rotate-12 text-(--tone) opacity-[0.07]" />

        <div className="relative flex items-center gap-4">
          <GemBadge type={type} size="lg" active />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">Fragmento de Éon</p>
            <p key={type} className="font-display text-3xl leading-none font-extrabold uppercase italic text-(--tone) motion-safe:animate-fade-in">
              {fragmentLabels[type]}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl leading-none font-extrabold italic text-silver-bright tabular-nums">{have}</p>
            <p className="font-mono text-[10px] text-fg-subtle">/ {cap}</p>
          </div>
        </div>
      </div>

      <div className="relative space-y-5 p-5">
        {/* modo */}
        <div className="grid grid-cols-2 gap-1 border border-line/70 bg-bg/60 p-1" role="tablist" aria-label="Tipo de troca">
          {(
            [
              ['buy', 'Comprar', ArrowDownToLine, `${buyPrice} M cada`],
              ['sell', 'Vender', ArrowUpFromLine, `${sellPrice} M cada`],
            ] as const
          ).map(([value, label, Icon, price]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value)
                setAmount(1)
                mutation.reset()
              }}
              className={cn(
                'focus-ring flex flex-col items-center py-2 transition-all duration-150',
                mode === value
                  ? 'chamfer [--chamfer-bg:color-mix(in_srgb,var(--tone)_14%,var(--color-raised))] [--chamfer-border:color-mix(in_srgb,var(--tone)_60%,transparent)] [--cut:8px]'
                  : 'text-fg-subtle hover:bg-white/3 hover:text-fg-muted',
              )}
            >
              <span className={cn('flex items-center gap-1.5 font-display text-base font-bold uppercase tracking-[0.12em]', mode === value ? 'text-silver-bright' : '')}>
                <Icon className={cn('size-4', mode === value && 'text-(--tone)')} />
                {label}
              </span>
              <span className="font-mono text-[10px] tabular-nums">{price}</span>
            </button>
          ))}
        </div>

        {/* quantidade */}
        <div className={cn('space-y-2.5', blocked && 'opacity-40')}>
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Quantidade</p>
            {!blocked && (
              <p className="font-mono text-[10px] text-fg-subtle">
                máx. {max} <span className="text-fg-subtle/70">({limitHint})</span>
              </p>
            )}
          </div>
          <div className="flex items-stretch gap-2">
            <StepButton label="Menos" onClick={() => setAmount(qty - 1)} disabled={blocked || qty <= 1}>
              <Minus className="size-4" />
            </StepButton>
            <label className="relative flex flex-1 items-center justify-center border border-line bg-bg focus-within:border-(--tone)/70">
              <span className="sr-only">Quantidade</span>
              <input
                type="number"
                min={1}
                max={max}
                value={qty}
                disabled={blocked}
                onChange={(e) => setAmount(Math.floor(Number(e.target.value) || 1))}
                className="h-14 w-full bg-transparent text-center font-display text-4xl font-extrabold italic text-silver-bright tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </label>
            <StepButton label="Mais" onClick={() => setAmount(qty + 1)} disabled={blocked || qty >= max}>
              <Plus className="size-4" />
            </StepButton>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 10, 50].map((step) => (
              <QuickChip key={step} onClick={() => setAmount(Math.min(max, qty === 1 && step !== 1 ? step : qty + step))} disabled={blocked || qty >= max}>
                +{step}
              </QuickChip>
            ))}
            <QuickChip onClick={() => setAmount(max)} disabled={blocked || qty >= max} accent>
              Máx
            </QuickChip>
          </div>
        </div>

        {/* antes → depois */}
        {blocked ? (
          <p className="border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">{reason}</p>
        ) : (
          <div className="space-y-1.5 border-y border-line/70 py-3">
            <Preview
              label={<span className="text-(--tone)">{fragmentLabels[type]}</span>}
              before={String(have)}
              after={String(afterFragments)}
              gain={mode === 'buy'}
            />
            <Preview
              label={<span className="text-coin">Moeda</span>}
              before={formatCoins(wallet.coins)}
              after={formatCoins(afterCoins)}
              gain={mode === 'sell'}
            />
          </div>
        )}

        {/* ação */}
        <button
          type="button"
          onClick={submit}
          disabled={blocked || mutation.isPending}
          className={cn(
            'focus-ring chamfer group relative flex h-14 w-full items-center justify-between gap-3 px-5 [--cut:12px] transition-all duration-150 disabled:opacity-40',
            mode === 'buy'
              ? 'text-on-primary [--chamfer-bg:var(--color-primary)] [--chamfer-border:var(--color-primary-soft)] hover:[--chamfer-bg:var(--color-primary-hover)] active:[--chamfer-bg:var(--color-primary-active)] enabled:hover:shadow-glow'
              : 'text-fg [--chamfer-bg:var(--color-raised)] [--chamfer-border:color-mix(in_srgb,var(--tone)_55%,transparent)] hover:[--chamfer-bg:var(--color-overlay)]',
          )}
        >
          <span className="font-display text-lg font-bold uppercase tracking-[0.14em]">
            {mutation.isPending ? (mode === 'buy' ? 'Comprando...' : 'Vendendo...') : `${mode === 'buy' ? 'Comprar' : 'Vender'} ${qty}`}
          </span>
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <Coins value={mode === 'buy' ? -total : total} signed={mode === 'sell'} iconClassName={mode === 'buy' ? 'text-on-primary' : undefined} />
            <ArrowRight className="size-4 transition-transform group-enabled:group-hover:translate-x-0.5" />
          </span>
        </button>
        {mutation.isError && <p className="text-xs text-danger">{apiErrorMessage(mutation.error)}</p>}
      </div>
    </div>
  )
}

/** Gema num losango na cor do tipo. */
function GemBadge({ type, size, active }: { type: Lineage; size: 'sm' | 'lg'; active?: boolean }) {
  return (
    <span
      style={{ '--tone': fragmentTone[type].color } as CSSProperties}
      className={cn('relative flex shrink-0 items-center justify-center', size === 'lg' ? 'size-14' : 'size-8')}
    >
      <span
        className={cn(
          'absolute rotate-45 border transition-all duration-300 ease-out-soft group-hover:rotate-135',
          size === 'lg' ? 'inset-2' : 'inset-1.5',
          active ? 'border-(--tone)/70 bg-(--tone)/15 shadow-[0_0_18px_-4px_var(--tone)]' : 'border-(--tone)/35 bg-(--tone)/5',
        )}
      />
      <Gem className={cn('relative text-(--tone)', size === 'lg' ? 'size-5' : 'size-3.5')} />
    </span>
  )
}

function Preview({ label, before, after, gain }: { label: ReactNode; before: string; after: string; gain: boolean }) {
  return (
    <p className="flex items-center justify-between gap-3 font-mono text-xs tabular-nums">
      <span className="uppercase tracking-[0.14em]">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-fg-subtle">{before}</span>
        <ArrowRight className="size-3 text-fg-subtle" />
        <span className={cn('text-sm font-bold', gain ? 'text-success' : 'text-danger-hover')}>{after}</span>
      </span>
    </p>
  )
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="focus-ring chamfer flex w-12 shrink-0 items-center justify-center text-fg-muted [--chamfer-bg:var(--color-raised)] [--chamfer-border:var(--color-line)] [--cut:8px] transition-colors hover:text-(--tone) hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_60%,transparent)] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function QuickChip({ onClick, disabled, accent, children }: { onClick: () => void; disabled?: boolean; accent?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring h-8 border font-mono text-xs uppercase tracking-widest transition-all duration-150 disabled:pointer-events-none disabled:opacity-40',
        accent
          ? 'border-(--tone)/50 bg-(--tone)/10 text-(--tone) hover:bg-(--tone)/20'
          : 'border-line bg-bg/60 text-fg-muted hover:border-(--tone)/50 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

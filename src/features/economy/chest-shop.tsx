import { useState, type CSSProperties } from 'react'
import { ArrowRight, Gem, Lock, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from '@/components/ui/toast'
import { rarityOrder, useBuyChest, useChests, type EconomyValues, type Wallet } from '@/features/economy/economy-api'
import { formatCoins, rarityTone } from '@/features/economy/economy-labels'
import { ChestArt, Coins } from '@/features/economy/economy-ui'
import type { Rarity } from '@/features/game/game-api'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

type ChestOffer = EconomyValues['chests'][number]

const percent = (value: number) => {
  const p = value * 100
  return `${p < 1 ? p.toFixed(1).replace('.', ',') : Math.round(p)}%`
}

/**
 * Baús à venda (D150): um expositor por nível, com o baú no pedestal (abre no hover), a faixa de chances de cada
 * raridade e a compra. Preços e chances de `GET /economy`; quem sorteia é o servidor, na abertura.
 */
export function ChestShop({ economy, wallet }: { economy: EconomyValues; wallet?: Wallet }) {
  const chests = useChests()
  const forSale = economy.chests.filter((c) => c.price !== null)
  const notForSale = economy.chests.filter((c) => c.price === null).map((c) => c.tier)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {forSale.map((offer) => (
          <ChestDisplay key={offer.tier} offer={offer} wallet={wallet} owned={chests.data?.filter((c) => c.tier === offer.tier).length ?? 0} />
        ))}
      </div>

      {notForSale.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-fg-subtle">
          <Lock className="size-3.5" />
          Baús
          {notForSale.map((tier) => (
            <span key={tier} className={cn('font-display text-sm font-bold italic', rarityTone[tier].text)}>
              {tier}
            </span>
          ))}
          não se compram: virão de eventos, do ranqueado e de missões.
        </p>
      )}
    </div>
  )
}

function ChestDisplay({ offer, wallet, owned }: { offer: ChestOffer; wallet?: Wallet; owned: number }) {
  const buy = useBuyChest()
  const [hover, setHover] = useState(false)
  const [focusRarity, setFocusRarity] = useState<Rarity | null>(null)
  // "+1" que sobe a cada compra (a key nova reinicia a animação)
  const [bought, setBought] = useState(0)

  const { tier, fragments, rarityChances } = offer
  const price = offer.price!
  const short = wallet ? Math.max(0, price - wallet.coins) : 0
  const disabled = !wallet || short > 0 || buy.isPending
  const aboveE = 1 - rarityChances.E

  function purchase() {
    buy.mutate(tier, {
      onSuccess: () => {
        setBought((n) => n + 1)
        toast.success(`Baú ${tier} comprado`, 'Está em Baús, pronto para abrir.')
      },
      onError: (error) => toast.error('Não deu para comprar', apiErrorMessage(error)),
    })
  }

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false)
        setFocusRarity(null)
      }}
      style={{ '--tone': rarityTone[tier].color } as CSSProperties}
      className={cn(
        'chamfer group relative flex flex-col overflow-hidden [--cut:22px]',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_30%,var(--color-line))]',
        'transition-transform duration-300 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:var(--tone)]',
      )}
    >
      {/* palco: grade, luz de baixo, letra gigante vazada e o baú no pedestal */}
      <div className="relative h-60 overflow-hidden border-b border-line/70">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 mask-[linear-gradient(to_top,black,transparent_85%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_100%,color-mix(in_srgb,var(--tone)_32%,transparent),transparent)] opacity-50 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 scanlines" />
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] font-display text-[13rem] leading-none font-extrabold italic text-(--tone) opacity-[0.08] transition-all duration-500 ease-out-soft select-none group-hover:scale-110 group-hover:opacity-[0.16]">
          {tier}
        </span>

        {/* etiquetas do topo */}
        <div className="relative flex items-start justify-between p-4">
          <span className="flex items-center gap-2 border border-(--tone)/50 bg-bg/70 px-2 py-1 backdrop-blur-sm">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle">Nível</span>
            <span className="font-display text-base leading-none font-extrabold italic text-(--tone)">{tier}</span>
          </span>
          {owned > 0 && (
            <Link
              to="/baus"
              className="focus-ring flex items-center gap-1.5 border border-line-strong bg-bg/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted backdrop-blur-sm transition-colors hover:border-(--tone)/60 hover:text-fg"
            >
              <Package className="size-3" /> {owned} {owned === 1 ? 'fechado' : 'fechados'}
            </Link>
          )}
        </div>

        {/* pedestal */}
        <div className="absolute inset-x-0 bottom-5 flex flex-col items-center">
          <div className="relative motion-safe:animate-bob">
            <ChestArt tier={tier} open={hover} className="h-28 w-36 drop-shadow-[0_10px_24px_rgb(0_0_0/0.6)]" />
            {bought > 0 && (
              <span
                key={bought}
                aria-hidden
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-display text-2xl font-extrabold italic text-(--tone) motion-safe:animate-float-up motion-reduce:hidden"
              >
                +1
              </span>
            )}
          </div>
          <div className="-mt-1 h-2 w-40 rounded-pill bg-(--tone)/25 blur-[6px] transition-all duration-500 group-hover:w-48 group-hover:bg-(--tone)/45" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        {/* nome e conteúdo */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-4xl leading-none font-extrabold uppercase italic text-silver-bright">
              Baú <span className="text-(--tone)">{tier}</span>
            </h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-fg-muted">
              <span>1 item</span>
              <span className="text-fg-subtle">+</span>
              <span className="inline-flex items-center gap-1">
                <Gem className="size-3 text-(--tone)" />
                {fragments} {fragments === 1 ? 'fragmento' : 'fragmentos'}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl leading-none font-extrabold italic text-(--tone) tabular-nums">{percent(aboveE)}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">acima de E</p>
          </div>
        </div>

        {/* faixa de chances: cada raridade um pedaço, do tamanho da chance */}
        <div className="space-y-2">
          <p className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            <span>Chance do item</span>
            {focusRarity && (
              <span className={rarityTone[focusRarity].text}>
                {focusRarity} · {percent(rarityChances[focusRarity])}
              </span>
            )}
          </p>
          <div className="flex h-3 gap-px" aria-hidden>
            {rarityOrder.map((rarity) => (
              <span
                key={rarity}
                className={cn(
                  'min-w-1 -skew-x-12 transition-all duration-200',
                  rarityTone[rarity].bg,
                  focusRarity && focusRarity !== rarity ? 'opacity-20' : 'opacity-90',
                  focusRarity === rarity && 'scale-y-150 opacity-100',
                )}
                style={{ flexGrow: rarityChances[rarity] }}
              />
            ))}
          </div>
          <ul className="grid grid-cols-7 gap-1">
            {rarityOrder.map((rarity) => (
              <li key={rarity}>
                <button
                  type="button"
                  onMouseEnter={() => setFocusRarity(rarity)}
                  onFocus={() => setFocusRarity(rarity)}
                  onBlur={() => setFocusRarity(null)}
                  aria-label={`Raridade ${rarity}: ${percent(rarityChances[rarity])}`}
                  className={cn(
                    'focus-ring flex w-full flex-col items-center border py-1.5 transition-colors duration-150',
                    focusRarity === rarity ? 'border-line-strong bg-raised' : 'border-line/60 bg-bg/50 hover:bg-raised',
                  )}
                >
                  <span className={cn('font-display text-sm leading-none font-extrabold italic', rarityTone[rarity].text)}>{rarity}</span>
                  <span className="mt-1 font-mono text-[9px] leading-none text-fg-muted tabular-nums">{percent(rarityChances[rarity])}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* compra */}
        <button
          type="button"
          onClick={purchase}
          disabled={disabled}
          className={cn(
            'focus-ring chamfer group/buy mt-auto flex h-14 w-full items-center justify-between gap-3 px-5 text-on-primary [--cut:12px] transition-all duration-150',
            '[--chamfer-bg:var(--color-primary)] [--chamfer-border:var(--color-primary-soft)] enabled:hover:[--chamfer-bg:var(--color-primary-hover)] enabled:hover:shadow-glow enabled:active:[--chamfer-bg:var(--color-primary-active)]',
            'disabled:text-fg-muted disabled:[--chamfer-bg:var(--color-raised)] disabled:[--chamfer-border:var(--color-line)]',
          )}
        >
          <span className="font-display text-lg font-bold uppercase tracking-[0.14em]">
            {buy.isPending ? 'Comprando...' : short > 0 ? `Faltam ${formatCoins(short)} M` : 'Comprar'}
          </span>
          <span className="flex items-center gap-2 font-display text-xl font-bold">
            <Coins value={price} iconClassName={disabled ? undefined : 'text-on-primary'} />
            {!disabled && <ArrowRight className="size-4 transition-transform group-hover/buy:translate-x-0.5" />}
          </span>
        </button>
      </div>
    </article>
  )
}

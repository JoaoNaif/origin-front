import { useState, type CSSProperties, type ReactNode } from 'react'
import { Coins as CoinsIcon, Flag, Gauge, Gem, Package, Repeat, Skull, Trophy, type LucideIcon } from 'lucide-react'
import type { EconomyValues } from '@/features/economy/economy-api'
import { fragmentTone, fragmentTypes, rarityTone } from '@/features/economy/economy-labels'
import { ChestArt } from '@/features/economy/economy-ui'
import { cn } from '@/lib/cn'
import { useCountUp } from '@/lib/use-count-up'

type Outcome = 'WIN' | 'LOSS'

const percent = (value: number) => {
  const p = value * 100
  return `${p < 1 ? p.toFixed(1).replace('.', ',') : Number.isInteger(p) ? p : p.toFixed(1).replace('.', ',')}%`
}

/**
 * O que cada batalha rende (D150), antes da dificuldade e da repetição do mesmo adversário: moeda, fragmentos e a
 * chance de baú. O seletor Vitória/Derrota troca os três cartões. Valores de `GET /economy`.
 */
export function EarningsPanel({ economy }: { economy: EconomyValues }) {
  const [outcome, setOutcome] = useState<Outcome>('WIN')
  const { coins, fragments, chestDrop, lossChestDropFactor } = economy.battle
  const win = outcome === 'WIN'
  const factor = win ? 1 : lossChestDropFactor
  const drops = chestDrop.map((d) => ({ ...d, chance: d.chance * factor }))
  const anyChest = drops.reduce((sum, d) => sum + d.chance, 0)

  return (
    <div className="space-y-4">
      {/* seletor do resultado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm text-fg-muted">Toda batalha paga, mesmo perdendo. Veja quanto rende cada resultado.</p>
        <div className="grid grid-cols-2 gap-1 border border-line/70 bg-bg/60 p-1" role="tablist" aria-label="Resultado da batalha">
          <OutcomeTab active={win} onClick={() => setOutcome('WIN')} icon={Trophy} tone="var(--color-success)">
            Vitória
          </OutcomeTab>
          <OutcomeTab active={!win} onClick={() => setOutcome('LOSS')} icon={Skull} tone="var(--color-danger)">
            Derrota
          </OutcomeTab>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RewardCard icon={CoinsIcon} tone="var(--color-coin)" label="Moeda" index="01">
          <BigNumber value={coins[outcome]} suffix="M" />
          <Compare
            current={coins[outcome]}
            max={Math.max(coins.WIN, coins.LOSS)}
            caption={win ? `${coins.LOSS} M na derrota` : `${coins.WIN} M na vitória`}
          />
        </RewardCard>

        <RewardCard icon={Gem} tone="var(--color-primary-soft)" label="Fragmentos" index="02">
          <BigNumber value={fragments[outcome]} prefix="+" />
          <div className="space-y-2">
            <div className="flex gap-1" aria-hidden>
              {fragmentTypes.map((type) => (
                <span
                  key={type}
                  className="h-1.5 flex-1 -skew-x-12 opacity-40 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: fragmentTone[type].color }}
                />
              ))}
            </div>
            <p className="text-xs leading-relaxed text-fg-subtle">Do tipo das variantes do esquadrão (Neutro sem variante).</p>
          </div>
        </RewardCard>

        <RewardCard icon={Package} tone={rarityTone.C.color} label="Baú" index="03">
          <BigNumber value={Math.round(anyChest * 100)} suffix="%" caption="de cair um baú" />
          <ul className="space-y-1.5">
            {drops.map((drop) => (
              <li
                key={drop.tier}
                style={{ '--row': rarityTone[drop.tier].color } as CSSProperties}
                className="group/row flex items-center gap-2.5"
              >
                <ChestArt tier={drop.tier} className="h-4 w-5 shrink-0 transition-transform group-hover/row:-translate-y-0.5" />
                <span className="w-12 font-display text-sm font-bold uppercase italic text-(--row)">Baú {drop.tier}</span>
                <span className="h-1 flex-1 -skew-x-12 bg-overlay">
                  <span
                    className="block h-full bg-(--row) transition-[width] duration-500 ease-out-soft"
                    style={{ width: `${Math.min(100, (drop.chance / chestDrop[chestDrop.length - 1].chance) * 100)}%` }}
                  />
                </span>
                <span className="w-10 text-right font-mono text-xs text-fg tabular-nums">{percent(drop.chance)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-fg-subtle">No máximo um por batalha{win ? '. Na derrota, metade da chance.' : ': metade da chance da vitória.'}</p>
        </RewardCard>
      </div>

      {/* o que muda o valor */}
      <ul className="grid gap-2 sm:grid-cols-3">
        <Modifier icon={Gauge} title="Dificuldade">
          Adversário mais difícil rende mais; o mais fácil, menos.
        </Modifier>
        <Modifier icon={Repeat} title="Mesmo adversário">
          Repetir o mesmo adversário rende menos a cada vez.
        </Modifier>
        <Modifier icon={Flag} title="Desistir" warn>
          Não dá moeda, fragmento, baú nem XP.
        </Modifier>
      </ul>
    </div>
  )
}

function OutcomeTab({ active, onClick, icon: Icon, tone, children }: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  tone: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{ '--tab': tone } as CSSProperties}
      className={cn(
        'focus-ring flex items-center justify-center gap-2 px-5 py-2 font-display text-base font-bold uppercase tracking-[0.12em] transition-all duration-150',
        active
          ? 'chamfer text-silver-bright [--chamfer-bg:color-mix(in_srgb,var(--tab)_14%,var(--color-raised))] [--chamfer-border:color-mix(in_srgb,var(--tab)_60%,transparent)] [--cut:8px]'
          : 'text-fg-subtle hover:bg-white/3 hover:text-fg-muted',
      )}
    >
      <Icon className={cn('size-4', active && 'text-(--tab)')} />
      {children}
    </button>
  )
}

/** Cartão de recompensa: ícone num losango, rótulo e o conteúdo. Sobe e acende no hover. */
function RewardCard({ icon: Icon, tone, label, index, children }: {
  icon: LucideIcon
  tone: string
  label: string
  index: string
  children: ReactNode
}) {
  return (
    <div
      style={{ '--tone': tone } as CSSProperties}
      className={cn(
        'chamfer group relative flex flex-col gap-4 overflow-hidden p-5 [--cut:18px]',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_25%,var(--color-line))]',
        'transition-transform duration-300 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_80%,transparent)]',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,color-mix(in_srgb,var(--tone)_16%,transparent),transparent)] opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 scanlines" />
      <Icon className="pointer-events-none absolute -right-5 -bottom-6 size-32 -rotate-12 text-(--tone) opacity-[0.05] transition-all duration-500 ease-out-soft group-hover:-rotate-3 group-hover:opacity-[0.1]" />

      <div className="relative flex items-center gap-3">
        <span className="relative flex size-10 shrink-0 items-center justify-center">
          <span className="absolute inset-1.5 rotate-45 border border-(--tone)/60 bg-(--tone)/10 shadow-[0_0_16px_-6px_var(--tone)] transition-transform duration-300 ease-out-soft group-hover:rotate-135" />
          <Icon className="relative size-4 text-(--tone)" />
        </span>
        <p className="flex-1 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">Por batalha</p>
        <span className="font-mono text-[10px] text-fg-subtle">{index}</span>
      </div>
      <p className="relative -mb-2 font-display text-lg leading-none font-bold uppercase tracking-wide text-fg">{label}</p>
      <div className="relative flex flex-1 flex-col gap-4">{children}</div>
    </div>
  )
}

/** Número grande que corre até o valor novo ao trocar o resultado. */
function BigNumber({ value, prefix, suffix, caption }: { value: number; prefix?: string; suffix?: string; caption?: string }) {
  const { shown } = useCountUp(value, 450)
  return (
    <p className="flex items-baseline gap-2">
      <span className="font-display text-6xl leading-none font-extrabold italic text-silver-bright tabular-nums">
        {prefix}
        {shown}
      </span>
      {suffix && <span className="font-display text-2xl font-bold italic text-(--tone)">{suffix}</span>}
      {caption && <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">{caption}</span>}
    </p>
  )
}

/** Barra do valor atual contra o maior dos dois resultados. */
function Compare({ current, max, caption }: { current: number; max: number; caption: string }) {
  return (
    <div className="space-y-1.5">
      <span className="block h-1.5 -skew-x-12 bg-overlay">
        <span className="block h-full bg-(--tone) shadow-[0_0_8px_var(--tone)] transition-[width] duration-500 ease-out-soft" style={{ width: `${(current / max) * 100}%` }} />
      </span>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">{caption}</p>
    </div>
  )
}

function Modifier({ icon: Icon, title, warn, children }: { icon: LucideIcon; title: string; warn?: boolean; children: ReactNode }) {
  return (
    <li className="group flex items-start gap-3 border border-line/60 bg-bg/40 px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-surface">
      <Icon className={cn('mt-0.5 size-4 shrink-0 transition-colors', warn ? 'text-warning' : 'text-fg-subtle group-hover:text-primary-soft')} />
      <span>
        <span className="block font-display text-sm font-bold uppercase tracking-wide text-fg">{title}</span>
        <span className="block text-xs leading-relaxed text-fg-muted">{children}</span>
      </span>
    </li>
  )
}

import { useMemo, useState, type CSSProperties } from 'react'
import { Lock, Package, Trophy } from 'lucide-react'
import { rarityOrder, type EconomyValues } from '@/features/economy/economy-api'
import { rarityTone } from '@/features/economy/economy-labels'
import { CharacterPortrait } from '@/features/game/character-art'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, useCharacters, useTemplates, type Rarity, type Template } from '@/features/game/game-api'
import { cn } from '@/lib/cn'

const chanceFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 1 })

/**
 * Vitrine dos personagens que a conta ainda não tem: o medidor da coleção e um cartão por personagem, na cor da
 * raridade. No hover, o retrato sai da sombra e acende a chance de ele vir em cada baú à venda.
 *
 * A chance espelha `drawChest` no servidor: sorteia a raridade pelo nível do baú e, nela, um personagem por igual
 * (inclusive os que a conta já tem, que viram moeda). O servidor deixa os exclusivos de fora, mas `GET /templates` não
 * diz quem é exclusivo; hoje nenhum é.
 */
export function MissingRoster({ economy }: { economy: EconomyValues }) {
  const templates = useTemplates()
  const characters = useCharacters()
  const [hovered, setHovered] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!templates.data || !characters.data) return null
    const owned = new Set(characters.data.map((c) => c.templateKey))
    const byRarity = (a: Template, b: Template) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
    const all = [...templates.data].sort(byRarity)
    const perRarity = new Map<Rarity, number>()
    for (const t of all) perRarity.set(t.rarity, (perRarity.get(t.rarity) ?? 0) + 1)
    return {
      all,
      owned,
      perRarity,
      // os mais raros primeiro: é o que chama
      missing: all.filter((t) => !owned.has(t.key)).reverse(),
    }
  }, [templates.data, characters.data])

  if (!data) return <div className="h-80 animate-pulse bg-raised" />

  const shops = economy.chests.filter((c) => c.price !== null)
  const chanceOf = (template: Template) =>
    shops.map((c) => ({ tier: c.tier, chance: c.rarityChances[template.rarity] / data.perRarity.get(template.rarity)! }))

  const ownedCount = data.all.length - data.missing.length

  return (
    <div className="space-y-5">
      {/* cabeçalho + medidor da coleção */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-xl space-y-1">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary-soft">
            <span className="h-px w-4 bg-primary" />O que pode sair
          </p>
          <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">Fora do seu elenco</p>
          <p className="text-sm text-fg-muted">
            O baú sorteia a raridade e, nela, um personagem. Já tem? Vira moeda. Passe o mouse para ver a chance de cada um.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2 sm:w-auto sm:min-w-80">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Coleção</span>
            <span className="font-display text-3xl leading-none font-extrabold italic tabular-nums">
              <span className="text-silver-bright">{ownedCount}</span>
              <span className="text-fg-subtle"> / {data.all.length}</span>
            </span>
          </div>
          <ul className="flex gap-1" aria-label={`${ownedCount} de ${data.all.length} personagens`}>
            {data.all.map((t) => {
              const has = data.owned.has(t.key)
              const lit = hovered === t.key
              return (
                <li
                  key={t.key}
                  title={`${t.name} · ${t.rarity}${has ? '' : ' · falta'}`}
                  style={{ '--tone': rarityTone[t.rarity].color } as CSSProperties}
                  className={cn(
                    'h-3 flex-1 -skew-x-12 transition-all duration-200',
                    has ? 'bg-silver/70' : 'border border-(--tone)/50 bg-(--tone)/10',
                    lit && 'scale-y-150 border-(--tone) bg-(--tone) shadow-[0_0_10px_var(--tone)]',
                  )}
                />
              )
            })}
          </ul>
          <p className="flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">
            <span>E</span>
            <span>raridade</span>
            <span>SS</span>
          </p>
        </div>
      </div>

      {data.missing.length === 0 ? (
        <div className="chamfer flex items-center gap-4 p-6 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--color-coin)_45%,transparent)] [--cut:16px]">
          <Trophy className="size-8 text-coin" />
          <div>
            <p className="font-display text-2xl font-bold uppercase tracking-wide text-silver-bright">Coleção completa</p>
            <p className="text-sm text-fg-muted">Você tem todos. Um personagem repetido no baú vira moeda pelo valor da raridade.</p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {data.missing.map((t, i) => (
            <li key={t.key} onMouseEnter={() => setHovered(t.key)} onMouseLeave={() => setHovered(null)}>
              <RosterCard template={t} index={i} chances={chanceOf(t)} onFocus={() => setHovered(t.key)} onBlur={() => setHovered(null)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RosterCard({ template, index, chances, onFocus, onBlur }: {
  template: Template
  index: number
  chances: { tier: Rarity; chance: number }[]
  onFocus: () => void
  onBlur: () => void
}) {
  const ClassIcon = classIcons[template.characterClass]
  const best = Math.max(...chances.map((c) => c.chance))

  return (
    <div
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={`${template.name}, raridade ${template.rarity}, ${classLabels[template.characterClass]}. Ainda não está no seu elenco.`}
      style={{ '--tone': rarityTone[template.rarity].color } as CSSProperties}
      className={cn(
        'focus-ring chamfer group relative flex h-80 flex-col overflow-hidden [--cut:16px]',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_25%,var(--color-line))]',
        'transition-transform duration-300 ease-out-soft hover:-translate-y-1.5 hover:[--chamfer-border:var(--tone)] focus-visible:[--chamfer-border:var(--tone)]',
      )}
    >
      {/* fundo: grade, brilho na cor da raridade e a letra gigante */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 mask-[linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_100%,color-mix(in_srgb,var(--tone)_30%,transparent),transparent)] opacity-40 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="pointer-events-none absolute -top-4 -right-2 font-display text-[9rem] leading-none font-extrabold italic text-(--tone) opacity-[0.07] transition-all duration-500 ease-out-soft select-none group-hover:-translate-x-2 group-hover:opacity-20">
        {template.rarity}
      </span>

      {/* retrato: na sombra até o hover */}
      <div className="absolute inset-x-0 top-8 bottom-24">
        <CharacterPortrait
          templateKey={template.key}
          characterClass={template.characterClass}
          zoom={1.35}
          className="size-full opacity-55 brightness-50 grayscale transition-all duration-500 ease-out-soft mask-[linear-gradient(to_bottom,black_60%,transparent)] group-hover:scale-105 group-hover:opacity-100 group-hover:brightness-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:brightness-100 group-focus-visible:grayscale-0"
          iconClassName="size-16 text-(--tone)/30 transition-colors group-hover:text-(--tone)/70"
        />
      </div>

      {/* varredura de scanner no hover */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/5 -translate-y-full bg-linear-to-b from-transparent via-(--tone)/25 to-transparent motion-safe:group-hover:animate-scan" />

      {/* topo: raridade e cadeado */}
      <div className="relative flex items-center justify-between p-3">
        <span className="flex items-center gap-1.5">
          <span className="flex h-6 min-w-7 items-center justify-center border border-(--tone)/60 bg-bg/70 px-1 font-display text-sm font-extrabold italic text-(--tone) backdrop-blur-sm">
            {template.rarity}
          </span>
          <span className="font-mono text-[9px] text-fg-subtle">{String(index + 1).padStart(2, '0')}</span>
        </span>
        <span className="relative flex size-6 items-center justify-center border border-line-strong bg-bg/70 backdrop-blur-sm">
          <Lock className="size-3 text-fg-subtle transition-all duration-200 group-hover:scale-0 group-hover:opacity-0" />
          <Package className="absolute size-3 scale-0 text-(--tone) opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
        </span>
      </div>

      {/* rodapé: classe, nome e chance por baú */}
      <div className="relative mt-auto space-y-2 bg-linear-to-t from-bg via-bg/90 to-transparent px-3 pt-6 pb-3">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle transition-colors group-hover:text-(--tone)">
            <ClassIcon className="size-3" />
            {classLabels[template.characterClass]}
          </p>
          <p className="truncate font-display text-xl leading-tight font-bold uppercase tracking-wide text-fg transition-colors group-hover:text-silver-bright">
            {template.name}
          </p>
        </div>

        <div className="h-px bg-linear-to-r from-(--tone)/60 to-transparent" />

        <div className="grid grid-cols-3 gap-1" aria-label="Chance de vir em cada baú">
          {chances.map(({ tier, chance }) => (
            <span
              key={tier}
              className={cn(
                'flex flex-col items-center border px-1 py-1 transition-all duration-200',
                'border-line/70 bg-bg/60 group-hover:border-(--tone)/30',
                chance === best && 'group-hover:border-(--tone)/70 group-hover:bg-(--tone)/10',
              )}
            >
              <span className={cn('font-display text-[11px] leading-none font-bold italic', rarityTone[tier].text)}>Baú {tier}</span>
              <span className="mt-0.5 font-mono text-[10px] leading-none text-fg-muted tabular-nums transition-colors group-hover:text-fg">
                {chanceFormat.format(chance * 100)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { AlertTriangle, Plus, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { rarityTone } from '@/features/economy/economy-labels'
import { classIcons } from '@/features/game/class-icons'
import {
  classLabels,
  useCharacters,
  useSkillOffers,
  useTemplates,
  type Character,
  type CharacterClass,
  type Rarity,
  type Stat,
} from '@/features/game/game-api'
import { statLabels, statOrder, statShort } from '@/features/game/game-labels'
import { statInfo } from '@/features/game/glossary'
import { CharacterPortrait, PortraitPop } from '@/features/game/character-art'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const CHARACTERS_ART = '/art/banner-sunna.jpg'

type Sort = 'level' | 'name' | 'class'

const sorts: { value: Sort; label: string }[] = [
  { value: 'level', label: 'Nível' },
  { value: 'name', label: 'Nome' },
  { value: 'class', label: 'Classe' },
]

const compare: Record<Sort, (a: Character, b: Character) => number> = {
  level: (a, b) => b.level - a.level || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  class: (a, b) => classLabels[a.characterClass].localeCompare(classLabels[b.characterClass]) || b.level - a.level,
}

/** Stats de destaque no card (o HP fica de fora: escala diferente). */
const cardStats: Stat[] = statOrder.filter((stat) => stat !== 'HP')

const unspentPoints = (c: Character) => c.freePoints.available - statOrder.reduce((t, s) => t + c.freePoints.allocated[s], 0)
const buildSize = (c: Character) => c.skills.filter((s) => s.buildSlot).length

/** Pendências que pedem uma visita à ficha: bloco de skill, pontos livres, build incompleta. */
type Pending = 'offers' | 'points' | 'build'

export function CharactersPage() {
  const characters = useCharacters()
  const offers = useSkillOffers()
  const templates = useTemplates()
  const [classFilter, setClassFilter] = useState<CharacterClass | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [sort, setSort] = useState<Sort>('level')

  const all = useMemo(() => characters.data ?? [], [characters.data])
  const classes = useMemo(
    () => [...new Set(all.map((c) => c.characterClass))].sort((a, b) => classLabels[a].localeCompare(classLabels[b])),
    [all],
  )
  const offersByCharacter = useMemo(() => {
    const count = new Map<string, number>()
    for (const offer of offers.data ?? []) count.set(offer.characterId, (count.get(offer.characterId) ?? 0) + 1)
    return count
  }, [offers.data])
  const rarityOf = (c: Character) => templates.data?.find((t) => t.key === c.templateKey)?.rarity

  const hasPending: Record<Pending, (c: Character) => boolean> = {
    offers: (c) => (offersByCharacter.get(c.id) ?? 0) > 0,
    points: (c) => unspentPoints(c) > 0,
    build: (c) => buildSize(c) < 4,
  }
  const pendingFilters: { value: Pending; label: string; icon: LucideIcon; tone: string }[] = [
    { value: 'offers', label: 'Blocos de skill', icon: Sparkles, tone: 'var(--color-primary-soft)' },
    { value: 'points', label: 'Pontos livres', icon: Plus, tone: 'var(--color-primary-soft)' },
    { value: 'build', label: 'Build incompleta', icon: AlertTriangle, tone: 'var(--color-warning)' },
  ]

  const roster = all
    .filter((c) => (!classFilter || c.characterClass === classFilter) && (!pending || hasPending[pending](c)))
    .sort(compare[sort])

  return (
    <div className="pb-12">
      <PageBanner
        art={CHARACTERS_ART}
        tutorial="personagens"
        outlineWord="Elenco"
        meta={
          <>
            <Badge tone="primary">
              <Users className="size-3" />
              Coleção
            </Badge>
            {characters.data && <BannerMeta>{characters.data.length} no elenco</BannerMeta>}
          </>
        }
        title={
          <>
            Perso
            <span className="text-gradient-primary pr-3">nagens</span>
          </>
        }
        description="Cada um com sua classe, seus stats e suas 4 skills. Ajuste os pontos livres e monte a build de quem vai para a grade."
      />

      <Page className="pt-10 lg:pt-10">
        {/* Filtros */}
        <div className="space-y-3 border-b border-line pb-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por classe">
            <FilterChip active={!classFilter} count={all.length} onClick={() => setClassFilter(null)}>
              Todas
            </FilterChip>
            {classes.map((characterClass) => {
              const Icon = classIcons[characterClass]
              return (
                <FilterChip
                  key={characterClass}
                  active={classFilter === characterClass}
                  count={all.filter((c) => c.characterClass === characterClass).length}
                  onClick={() => setClassFilter(classFilter === characterClass ? null : characterClass)}
                >
                  <Icon className="size-3.5" />
                  {classLabels[characterClass]}
                </FilterChip>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* pendências: só aparecem as que existem */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por pendência">
              <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Pendências</span>
              {pendingFilters.map((f) => {
                const count = all.filter(hasPending[f.value]).length
                if (count === 0) return null
                const active = pending === f.value
                const Icon = f.icon
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPending(active ? null : f.value)}
                    style={{ '--tone': f.tone } as CSSProperties}
                    className={cn(
                      'focus-ring flex h-7 items-center gap-1.5 border px-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-all',
                      active
                        ? 'border-(--tone)/60 bg-(--tone)/15 text-fg'
                        : 'border-line bg-surface/60 text-fg-muted hover:-translate-y-0.5 hover:border-(--tone)/50 hover:text-fg',
                    )}
                  >
                    <Icon className="size-3 text-(--tone)" />
                    {f.label}
                    <span className="text-(--tone)">{count}</span>
                  </button>
                )
              })}
              {pendingFilters.every((f) => all.filter(hasPending[f.value]).length === 0) && (
                <span className="font-mono text-[10px] text-fg-subtle">nenhuma: tudo em dia</span>
              )}
            </div>

            <div className="flex items-center gap-2" role="group" aria-label="Ordenar">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Ordem</span>
              <div className="flex border border-line bg-bg/60 p-0.5">
                {sorts.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={sort === option.value}
                    onClick={() => setSort(option.value)}
                    className={cn(
                      'focus-ring px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors',
                      sort === option.value ? 'bg-primary-dim text-silver-bright' : 'text-fg-subtle hover:text-fg-muted',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {characters.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-96 animate-pulse bg-raised" />
            ))}
          </div>
        ) : characters.isError ? (
          <Empty title="Não foi possível carregar o elenco" detail="Verifique a conexão e recarregue a página." />
        ) : roster.length === 0 ? (
          <Empty title="Nenhum personagem" detail="Nenhum personagem com esse filtro." />
        ) : (
          // corta só na horizontal (com margem na lateral da página): a camada do hover é mais larga que o card e não pode criar rolagem
          <ul className="grid gap-4 overflow-x-clip [overflow-clip-margin:2.5rem] sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {roster.map((character) => (
              <li key={character.id}>
                <CharacterCard character={character} rarity={rarityOf(character)} offers={offersByCharacter.get(character.id) ?? 0} />
              </li>
            ))}
          </ul>
        )}
      </Page>
    </div>
  )
}

function FilterChip({ active, count, onClick, children }: { active: boolean; count: number; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'focus-ring chamfer group flex h-9 items-center gap-1.5 px-3 font-display text-sm font-semibold uppercase tracking-widest transition-all [--cut:8px]',
        active
          ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.14)] [--chamfer-border:rgb(167_139_250/0.6)]'
          : 'text-fg-muted [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:-translate-y-0.5 hover:text-fg hover:[--chamfer-border:rgb(167_139_250/0.35)]',
      )}
    >
      {children}
      <span className={cn('ml-0.5 font-mono text-[10px] tabular-nums', active ? 'text-primary-soft' : 'text-fg-subtle group-hover:text-fg-muted')}>{count}</span>
    </button>
  )
}

function CharacterCard({ character, rarity, offers }: { character: Character; rarity?: Rarity; offers: number }) {
  const Icon = classIcons[character.characterClass]
  const progress = character.xpToNextLevel ? Math.min(100, (character.xp / character.xpToNextLevel) * 100) : 100
  const [first, ...rest] = character.name.split(' ')
  const unspent = unspentPoints(character)
  const build = buildSize(character)
  const top = Math.max(...cardStats.map((s) => character.stats[s]))
  const tone = rarity ? rarityTone[rarity].color : 'var(--color-line-strong)'
  const xp = character.xpToNextLevel ? `${character.xp} / ${character.xpToNextLevel} XP` : 'Nível máximo'

  // pendências como ícones pequenos no canto (o texto vai no title)
  const alerts: { key: string; icon: LucideIcon; label: string; text?: string; warn?: boolean }[] = [
    ...(offers > 0 ? [{ key: 'offers', icon: Sparkles, label: `${offers} ${offers === 1 ? 'bloco' : 'blocos'} de skill para escolher` }] : []),
    ...(unspent > 0 ? [{ key: 'points', icon: Plus, label: `${unspent} pontos livres para distribuir`, text: String(unspent) }] : []),
    ...(build < 4 ? [{ key: 'build', icon: AlertTriangle, label: `Build com ${build} de 4 skills`, warn: true }] : []),
  ]

  return (
    <Link
      to={`/personagens/${character.id}`}
      aria-label={`${character.name}, ${classLabels[character.characterClass]}, nível ${character.level}`}
      style={{ '--tone': tone } as CSSProperties}
      className={cn(
        'focus-ring chamfer group flex h-full min-h-96 flex-col justify-end gap-4 p-5 [--cut:18px] hover:z-10 focus-visible:z-10',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
        'transition-all duration-200 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:rgb(167_139_250/0.7)]',
        'hover:drop-shadow-[0_10px_24px_rgb(139_92_246/0.3)]',
      )}
    >
      {/* Retrato de fundo do card inteiro (recortado no chanfro); o texto fica embaixo, sobre o degradê */}
      <div className="pointer-events-none absolute inset-px overflow-hidden [clip-path:var(--chamfer-shape)]">
        <div className="absolute inset-x-8 top-8 bottom-12 rounded-pill bg-primary/10 blur-2xl transition-colors group-hover:bg-primary/25" />
        <CharacterPortrait
          templateKey={character.templateKey}
          characterClass={character.characterClass}
          zoom={1.25}
          hideOnHover
          className="size-full"
          iconClassName="size-16 text-silver/30 transition-colors group-hover:text-primary-soft"
        />
        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/90 via-35% to-transparent to-65%" />
        {/* raridade: só uma linha fina no topo, na cor dela */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-(--tone) opacity-70 shadow-[0_0_10px_var(--tone)] transition-opacity group-hover:opacity-100" />
      </div>
      {/* no hover, o personagem cresce e sai do card */}
      <PortraitPop templateKey={character.templateKey} />

      {alerts.length > 0 && (
        <span className="absolute top-4 right-4 flex flex-col gap-1.5">
          {alerts.map(({ key, icon: AlertIcon, label, text, warn }) => (
            <span
              key={key}
              title={label}
              aria-label={label}
              className={cn(
                'chamfer flex h-6 min-w-6 items-center justify-center gap-0.5 px-1 font-mono text-[10px] font-bold [--cut:5px]',
                warn
                  ? 'text-bg [--chamfer-bg:var(--color-warning)] [--chamfer-border:var(--color-warning)]'
                  : 'text-on-primary [--chamfer-bg:var(--color-primary)] [--chamfer-border:var(--color-primary-soft)] shadow-[0_0_12px_-2px_var(--color-primary)]',
              )}
            >
              <AlertIcon className={cn('size-3.5', key === 'offers' && 'motion-safe:animate-pulse')} />
              {text}
            </span>
          ))}
        </span>
      )}

      <div className="relative space-y-2.5">
        {/* classe e raridade numa linha só */}
        <p className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
          <span className="flex items-center gap-1.5 transition-colors group-hover:text-fg-muted">
            <Icon className="size-3.5" />
            {classLabels[character.characterClass]}
          </span>
          {rarity && <span className="font-display text-base font-extrabold tracking-normal text-(--tone)">{rarity}</span>}
        </p>

        <p className="font-display text-3xl leading-[0.95] font-extrabold uppercase italic text-silver-bright">
          {first}
          {/* linha do sobrenome sempre reservada: o LV fica alinhado em todos os cards */}
          <span className="block min-h-lh text-base font-semibold not-italic tracking-wide text-fg-muted">{rest.join(' ')}</span>
        </p>

        <div className="flex items-center gap-2" title={xp}>
          <span className="font-mono text-[11px] text-primary-soft">LV {character.level}</span>
          <div className="h-0.75 flex-1 -skew-x-12 bg-overlay transition-all duration-200 group-hover:h-1">
            <div className="h-full bg-gradient-primary transition-shadow group-hover:shadow-[0_0_8px_var(--color-primary)]" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[10px] text-fg-subtle tabular-nums">HP {character.stats.HP}</span>
        </div>
      </div>

      {/* Stats: valor e uma barra fina; o maior em roxo */}
      <dl className="relative grid grid-cols-6 gap-2 border-t border-line/60 pt-3">
        {cardStats.map((stat) => {
          const best = character.stats[stat] === top
          return (
            <div key={stat} className="space-y-1">
              {/* o cartão é um link: dica nativa (o Term é botão) */}
              <dt className={cn('font-mono text-[9px]', best ? 'text-primary-soft' : 'text-fg-subtle')} title={`${statLabels[stat]}: ${statInfo[stat]}`}>
                {statShort[stat]}
              </dt>
              <dd className={cn('font-mono text-sm leading-none tabular-nums', best ? 'text-silver-bright' : 'text-fg-muted group-hover:text-fg')}>
                {character.stats[stat]}
              </dd>
              <div className="h-0.5 -skew-x-12 bg-overlay">
                <div
                  className={cn('h-full transition-colors', best ? 'bg-primary-soft shadow-[0_0_6px_var(--color-primary)]' : 'bg-silver/35 group-hover:bg-silver/60')}
                  style={{ width: `${top ? (character.stats[stat] / top) * 100 : 0}%` }}
                />
              </div>
            </div>
          )
        })}
      </dl>
    </Link>
  )
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-16 text-center">
      <Users className="size-6 text-fg-subtle" />
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">{title}</p>
      <p className="text-sm text-fg-muted">{detail}</p>
    </div>
  )
}

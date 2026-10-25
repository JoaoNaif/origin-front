import { useMemo, useState, type ReactNode } from 'react'
import { Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { classIcons } from '@/features/game/class-icons'
import {
  classLabels,
  useCharacters,
  useSkillOffers,
  type Character,
  type CharacterClass,
  type Stat,
} from '@/features/game/game-api'
import { statOrder, statShort } from '@/features/game/game-labels'
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

export function CharactersPage() {
  const characters = useCharacters()
  const offers = useSkillOffers()
  const [classFilter, setClassFilter] = useState<CharacterClass | null>(null)
  const [sort, setSort] = useState<Sort>('level')

  const classes = useMemo(
    () => [...new Set(characters.data?.map((c) => c.characterClass))].sort((a, b) => classLabels[a].localeCompare(classLabels[b])),
    [characters.data],
  )
  const roster = useMemo(
    () => (characters.data ?? []).filter((c) => !classFilter || c.characterClass === classFilter).sort(compare[sort]),
    [characters.data, classFilter, sort],
  )
  const offersByCharacter = useMemo(() => {
    const count = new Map<string, number>()
    for (const offer of offers.data ?? []) count.set(offer.characterId, (count.get(offer.characterId) ?? 0) + 1)
    return count
  }, [offers.data])

  return (
    <div className="pb-12">
      <PageBanner
        art={CHARACTERS_ART}
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por classe">
            <FilterChip active={!classFilter} onClick={() => setClassFilter(null)}>
              Todas
            </FilterChip>
            {classes.map((characterClass) => {
              const Icon = classIcons[characterClass]
              return (
                <FilterChip key={characterClass} active={classFilter === characterClass} onClick={() => setClassFilter(characterClass)}>
                  <Icon className="size-3.5" />
                  {classLabels[characterClass]}
                </FilterChip>
              )
            })}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Ordenar">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Ordem</span>
            {sorts.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={sort === option.value}
                onClick={() => setSort(option.value)}
                className={cn(
                  'focus-ring rounded-control px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors',
                  sort === option.value ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg-muted',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {characters.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-80 animate-pulse bg-raised" />
            ))}
          </div>
        ) : characters.isError ? (
          <Empty title="Não foi possível carregar o elenco" detail="Verifique a conexão e recarregue a página." />
        ) : roster.length === 0 ? (
          <Empty title="Nenhum personagem" detail="Nenhum personagem dessa classe no elenco." />
        ) : (
          // corta só na horizontal (com margem na lateral da página): a camada do hover é mais larga que o card e não pode criar rolagem
          <ul className="grid gap-4 overflow-x-clip [overflow-clip-margin:2.5rem] sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {roster.map((character, i) => (
              <li key={character.id}>
                <CharacterCard character={character} index={i + 1} offers={offersByCharacter.get(character.id) ?? 0} />
              </li>
            ))}
          </ul>
        )}
      </Page>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'focus-ring chamfer flex h-8 items-center gap-1.5 px-3 font-display text-sm font-semibold uppercase tracking-widest transition-all [--cut:7px]',
        active
          ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.14)] [--chamfer-border:rgb(139_92_246/0.5)]'
          : 'text-fg-muted [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:text-fg hover:[--chamfer-border:var(--color-line-strong)]',
      )}
    >
      {children}
    </button>
  )
}

function CharacterCard({ character, index, offers }: { character: Character; index: number; offers: number }) {
  const Icon = classIcons[character.characterClass]
  const progress = character.xpToNextLevel ? Math.min(100, (character.xp / character.xpToNextLevel) * 100) : 100
  const [first, ...rest] = character.name.split(' ')
  const unspent = unspentPoints(character)
  const build = character.skills.filter((s) => s.buildSlot).length
  const top = Math.max(...cardStats.map((s) => character.stats[s]))

  return (
    <Link
      to={`/personagens/${character.id}`}
      className={cn(
        'focus-ring chamfer group flex h-full flex-col gap-4 p-5 [--cut:18px] hover:z-10 focus-visible:z-10',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
        'transition-all duration-200 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:rgb(167_139_250/0.7)]',
        'hover:drop-shadow-[0_10px_24px_rgb(139_92_246/0.3)]',
      )}
    >
      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[10px] text-fg-subtle">{String(index).padStart(2, '0')}</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          <Icon className="size-3" />
          {classLabels[character.characterClass]}
        </span>
      </div>

      {/* Retrato de fundo do card inteiro (recortado no chanfro); nome, nível e stats ficam por cima, sobre o degradê */}
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
        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/80 via-35% to-transparent to-70%" />
        <div className="absolute inset-x-0 top-0 h-12 bg-linear-to-b from-surface/80 to-transparent" />
      </div>
      {/* no hover, o personagem cresce e sai do card */}
      <PortraitPop templateKey={character.templateKey} />

      {/* espaço do retrato (a imagem fica no fundo) */}
      <div className="relative h-40">
        <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
          {offers > 0 && (
            <Badge tone="primary">
              <Sparkles className="size-3" />
              {offers} bloco{offers > 1 && 's'}
            </Badge>
          )}
          {unspent > 0 && <Badge tone="primary">+{unspent} pts</Badge>}
          {build < 4 && <Badge tone="warning">Build {build}/4</Badge>}
        </div>
      </div>

      <div className="relative space-y-2">
        <p className="font-display text-3xl leading-[0.95] font-extrabold uppercase italic text-silver-bright">
          {first}
          {/* linha do sobrenome sempre reservada: o LV fica alinhado em todos os cards */}
          <span className="block min-h-[1lh] text-lg font-semibold not-italic text-fg-muted">{rest.join(' ')}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-primary-soft">LV {character.level}</span>
          <div className="h-0.75 flex-1 bg-overlay">
            <div className="h-full bg-gradient-primary" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-[10px] text-fg-subtle tabular-nums">HP {character.stats.HP}</span>
        </div>
      </div>

      {/* Mini HUD de stats */}
      <dl className="relative mt-auto grid grid-cols-6 gap-1.5 border-t border-line/70 pt-3">
        {cardStats.map((stat) => (
          <div key={stat} className="space-y-1 text-center">
            <dt className="font-mono text-[9px] text-fg-subtle">{statShort[stat]}</dt>
            <dd className="font-mono text-xs text-fg tabular-nums">{character.stats[stat]}</dd>
            <div className="h-0.5 bg-overlay">
              <div className="h-full bg-silver/50" style={{ width: `${top ? (character.stats[stat] / top) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
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

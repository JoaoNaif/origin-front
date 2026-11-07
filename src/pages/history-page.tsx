import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Clock, Flame, Gauge, LayoutGrid, type LucideIcon, Percent, Play, Skull, Sparkles, Swords, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { AwakenedBanner } from '@/features/characters/awakening-ui'
import { buttonClasses } from '@/components/ui/button-classes'
import { rarityTone } from '@/features/economy/economy-labels'
import { ChestArt, Coins, FragmentDeltaList } from '@/features/economy/economy-ui'
import { CharacterPortrait } from '@/features/game/character-art'
import { classIcons } from '@/features/game/class-icons'
import {
  difficultyLabels,
  useBattle,
  useBattles,
  useCharacters,
  useSquads,
  type AiDifficulty,
  type BattleDetail,
  type BattleSummary,
} from '@/features/game/game-api'
import { battleOutcome, endReasonLabels, outcomeLabels, profileLabels, type BattleOutcome } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'
import { useCountUp } from '@/lib/use-count-up'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const HISTORY_ART = '/art/banner-adagas.jpg'

type Filter = 'ALL' | BattleOutcome

const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'WIN', label: 'Vitórias' },
  { value: 'LOSS', label: 'Derrotas' },
  { value: 'ABANDON', label: 'Desistências' },
]

/** Cor de cada resultado, como variável (`--tone`): vitória verde, derrota vermelha, desistência apagada. */
const outcomeColor: Record<BattleOutcome, string> = {
  WIN: 'var(--color-success)',
  LOSS: 'var(--color-danger)',
  ABANDON: 'var(--color-fg-subtle)',
}

const streakLabels: Record<BattleOutcome, string> = {
  WIN: 'vitórias seguidas',
  LOSS: 'derrotas seguidas',
  ABANDON: 'desistências seguidas',
}

const difficultyOrder = Object.keys(difficultyLabels) as AiDifficulty[]

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function duration(battle: BattleSummary) {
  if (!battle.finishedAt) return '—'
  const minutes = Math.round((new Date(battle.finishedAt).getTime() - new Date(battle.startedAt).getTime()) / 60000)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

export function HistoryPage() {
  const battles = useBattles()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [difficulty, setDifficulty] = useState<AiDifficulty | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const finished = useMemo(() => battles.data?.filter((b) => b.status === 'FINISHED') ?? [], [battles.data])
  const inProgress = battles.data?.find((b) => b.status === 'IN_PROGRESS')
  const difficulties = useMemo(() => difficultyOrder.filter((d) => finished.some((b) => b.opponent.difficulty === d)), [finished])
  const countOf = (f: Filter) => (f === 'ALL' ? finished.length : finished.filter((b) => battleOutcome(b) === f).length)
  const shown = finished.filter(
    (b) => (filter === 'ALL' || battleOutcome(b) === filter) && (!difficulty || b.opponent.difficulty === difficulty),
  )

  return (
    <div className="pb-12">
      <PageBanner
        art={HISTORY_ART}
        tutorial="historico"
        outlineWord="Registro"
        meta={
          <>
            <Badge tone="primary">
              <Swords className="size-3" />
              Registro
            </Badge>
            {battles.data && (
              <BannerMeta>
                {finished.length} {finished.length === 1 ? 'batalha encerrada' : 'batalhas encerradas'}
              </BannerMeta>
            )}
          </>
        }
        title={
          <>
            Histó
            <span className="text-gradient-primary pr-3">rico</span>
          </>
        }
        description="Suas últimas 50 batalhas contra a máquina: vitórias, derrotas e quem ficou de pé."
      />

      <Page className="pt-10 lg:pt-10">
        {inProgress && <ResumeTile battle={inProgress} />}

        {battles.isPending ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-36 animate-pulse bg-raised" />
              ))}
            </div>
            <div className="h-80 animate-pulse bg-raised" />
          </div>
        ) : battles.isError ? (
          <Empty title="Não foi possível carregar o histórico" detail="Verifique a conexão e recarregue a página." />
        ) : finished.length === 0 ? (
          <Empty
            title="Nenhum combate registrado"
            detail="Sua primeira batalha aparece aqui."
            action={
              <Link to="/batalhar" className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'mt-2' })}>
                Primeira batalha
              </Link>
            }
          />
        ) : (
          <>
            <Summary battles={finished} />

            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por resultado">
                {filters.map((f) => (
                  <FilterChip
                    key={f.value}
                    active={filter === f.value}
                    count={countOf(f.value)}
                    tone={f.value === 'ALL' ? 'var(--color-primary-soft)' : outcomeColor[f.value]}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                  </FilterChip>
                ))}
              </div>
              {difficulties.length > 1 && (
                <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por dificuldade">
                  <span className="mr-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                    <Gauge className="size-3" /> Dificuldade
                  </span>
                  {[null, ...difficulties].map((d) => (
                    <button
                      key={d ?? 'all'}
                      type="button"
                      aria-pressed={difficulty === d}
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        'focus-ring flex items-center gap-1.5 border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-all',
                        difficulty === d ? 'border-primary/50 bg-primary-dim text-fg' : 'border-transparent text-fg-subtle hover:border-line hover:text-fg-muted',
                      )}
                    >
                      {d && <DifficultyPips difficulty={d} />}
                      {d ? difficultyLabels[d] : 'Todas'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-fg-muted">Nenhuma batalha com esse filtro.</p>
            ) : (
              <ul className="space-y-1.5">
                {shown.map((battle, i) => (
                  <BattleRow
                    key={battle.id}
                    battle={battle}
                    index={i + 1}
                    open={open === battle.id}
                    onToggle={() => setOpen(open === battle.id ? null : battle.id)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </Page>
    </div>
  )
}

function ResumeTile({ battle }: { battle: BattleSummary }) {
  return (
    <Link
      to={`/batalha/${battle.id}`}
      className="focus-ring chamfer group relative flex items-center gap-4 overflow-hidden p-4 [--chamfer-bg:rgb(59_40_10/0.85)] [--chamfer-border:rgb(245_165_36/0.45)] [--cut:14px] transition-transform duration-300 ease-out-soft hover:-translate-y-0.5 hover:[--chamfer-border:rgb(245_165_36/0.85)]"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-linear-to-r from-warning/15 to-transparent transition-transform duration-500 ease-out-soft group-hover:translate-x-0" />
      <span className="relative flex size-11 shrink-0 items-center justify-center">
        <span className="absolute inset-1.5 rotate-45 border border-warning/60 bg-warning/10 shadow-[0_0_16px_-6px_var(--color-warning)] transition-transform duration-300 group-hover:rotate-135" />
        <Play className="relative size-4 text-warning" />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warning">
          <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-pill bg-warning align-middle" />
          Batalha em andamento
        </p>
        <p className="truncate font-display text-xl font-bold uppercase tracking-wide text-fg">vs {battle.opponent.name}</p>
        <p className="truncate text-xs text-fg-muted">
          {battle.rounds ? `Rodada ${battle.rounds} · ` : ''}
          {difficultyLabels[battle.opponent.difficulty]}
        </p>
      </div>
      <span className="relative hidden font-display text-sm font-bold uppercase tracking-[0.12em] text-warning sm:block">Retomar</span>
      <ChevronRight className="relative size-4 text-warning transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function Summary({ battles }: { battles: BattleSummary[] }) {
  const wins = battles.filter((b) => battleOutcome(b) === 'WIN').length
  const losses = battles.filter((b) => battleOutcome(b) === 'LOSS').length
  const rate = Math.round((wins / battles.length) * 100)
  // Sequência atual: a lista vem da mais recente para a mais antiga
  const lastOutcome = battleOutcome(battles[0])
  const streak = battles.findIndex((b) => battleOutcome(b) !== lastOutcome)
  const streakCount = streak === -1 ? battles.length : streak
  const recent = battles.slice(0, 10)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Swords} label="Combates" tone="var(--color-silver)" value={battles.length}>
        <p className="font-mono text-[11px] text-fg-muted">
          <span className="text-success">{wins}V</span> · <span className="text-danger">{losses}D</span>
          {battles.length - wins - losses > 0 && <span> · {battles.length - wins - losses} desist.</span>}
        </p>
      </StatCard>

      <StatCard icon={Trophy} label="Vitórias" tone="var(--color-success)" value={wins} valueTone="text-success">
        <p className="font-mono text-[11px] text-fg-muted">{battles.length - wins} sem vitória</p>
      </StatCard>

      <StatCard icon={Percent} label="Aproveitamento" tone="var(--color-success)" value={rate} suffix="%" aside={<RateRing rate={rate} />}>
        <p className="font-mono text-[11px] text-fg-muted">das batalhas terminam em vitória</p>
      </StatCard>

      <StatCard icon={Flame} label="Sequência" tone={outcomeColor[lastOutcome]} value={streakCount} valueTone="text-(--tone)">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] text-fg-muted">
            {streakCount === 1 ? `${outcomeLabels[lastOutcome].toLowerCase()} na última` : streakLabels[lastOutcome]}
          </p>
          {/* últimas 10, da mais antiga à mais nova; a sequência atual acesa */}
          <div className="flex gap-0.5" aria-hidden>
            {[...recent].reverse().map((b, i) => (
              <span
                key={b.id}
                className="h-1.5 flex-1 -skew-x-12 transition-opacity duration-300"
                style={{ background: outcomeColor[battleOutcome(b)], opacity: i >= recent.length - streakCount ? 1 : 0.3 }}
              />
            ))}
          </div>
        </div>
      </StatCard>
    </div>
  )
}

/** Cartão de número do resumo: ícone num losango, número grande que corre, brilho e ícone de fundo no hover. */
function StatCard({ icon: Icon, label, tone, value, suffix, valueTone, aside, children }: {
  icon: LucideIcon
  label: string
  tone: string
  value: number
  suffix?: string
  valueTone?: string
  aside?: ReactNode
  children?: ReactNode
}) {
  const { shown } = useCountUp(value, 600)
  return (
    <div
      style={{ '--tone': tone } as CSSProperties}
      className={cn(
        'chamfer group relative flex flex-col gap-3 overflow-hidden p-4 [--cut:14px]',
        '[--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_22%,var(--color-line))]',
        'transition-transform duration-300 ease-out-soft hover:-translate-y-1 hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_75%,transparent)]',
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_100%_0%,color-mix(in_srgb,var(--tone)_14%,transparent),transparent)] opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
      <Icon className="pointer-events-none absolute -right-4 -bottom-5 size-24 -rotate-12 text-(--tone) opacity-[0.04] transition-all duration-500 ease-out-soft group-hover:-rotate-3 group-hover:opacity-[0.09]" />

      <div className="relative flex items-center gap-2.5">
        <span className="relative flex size-8 shrink-0 items-center justify-center">
          <span className="absolute inset-1 rotate-45 border border-(--tone)/50 bg-(--tone)/10 transition-transform duration-300 ease-out-soft group-hover:rotate-135" />
          <Icon className="relative size-3.5 text-(--tone)" />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">{label}</p>
      </div>

      <div className="relative flex items-end justify-between gap-3">
        <p className={cn('font-display text-5xl leading-none font-extrabold italic tabular-nums', valueTone ?? 'text-silver-bright')}>
          {shown}
          {suffix && <span className="text-3xl">{suffix}</span>}
        </p>
        {aside}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

/** Anel de aproveitamento (SVG): o arco enche até a taxa. */
function RateRing({ rate }: { rate: number }) {
  const r = 18
  const length = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-overlay)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--tone)"
        strokeWidth="4"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - rate / 100)}
        className="transition-[stroke-dashoffset] duration-700 ease-out-soft"
        style={{ filter: 'drop-shadow(0 0 4px var(--tone))' }}
      />
    </svg>
  )
}

/** Dificuldade em 5 traços, acesos até o nível. */
function DifficultyPips({ difficulty }: { difficulty: AiDifficulty }) {
  const level = difficultyOrder.indexOf(difficulty)
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {difficultyOrder.map((d, i) => (
        <span key={d} className={cn('h-2.5 w-1 -skew-x-12', i <= level ? 'bg-primary-soft' : 'bg-overlay')} />
      ))}
    </span>
  )
}

function BattleRow({ battle, index, open, onToggle }: { battle: BattleSummary; index: number; open: boolean; onToggle: () => void }) {
  const outcome = battleOutcome(battle)

  return (
    <li
      style={{ '--tone': outcomeColor[outcome] } as CSSProperties}
      className={cn(
        'chamfer group/row relative overflow-hidden [--cut:12px] transition-all duration-200',
        open
          ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_5%,var(--color-surface))] [--chamfer-border:color-mix(in_srgb,var(--tone)_50%,transparent)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_45%,var(--color-line))]',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'focus-ring group relative grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left',
          'md:grid-cols-[2rem_9rem_1fr_10rem_4rem_8rem_1.5rem]',
        )}
      >
        {/* luz na cor do resultado, que entra pela esquerda no hover */}
        <span
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-(--tone)/12 to-transparent transition-transform duration-500 ease-out-soft',
            open ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0',
          )}
        />
        <span className="relative hidden font-mono text-[10px] text-fg-subtle transition-colors group-hover:text-fg-muted md:block">
          {String(index).padStart(2, '0')}
        </span>
        <span className="relative flex items-center gap-2.5 font-display text-xl font-extrabold uppercase italic text-(--tone)">
          <span className={cn('w-0.75 bg-(--tone) transition-all duration-200', open ? 'h-7 shadow-[0_0_10px_var(--tone)]' : 'h-5 group-hover:h-7 group-hover:shadow-[0_0_10px_var(--tone)]')} />
          {outcomeLabels[outcome]}
        </span>
        <span className="relative order-3 col-span-2 min-w-0 md:order-0 md:col-span-1">
          <span className="block truncate text-sm font-semibold text-fg transition-colors group-hover:text-silver-bright">{battle.opponent.name}</span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
            {profileLabels[battle.opponent.profile]}
            {battle.endReason && ` · ${endReasonLabels[battle.endReason]}`}
          </span>
        </span>
        <span className="relative hidden items-center gap-2 text-sm text-fg-muted md:flex">
          <DifficultyPips difficulty={battle.opponent.difficulty} />
          {difficultyLabels[battle.opponent.difficulty]}
        </span>
        <span className="relative hidden text-right font-mono text-xs text-fg-muted tabular-nums md:block">R{battle.rounds}</span>
        <span className="relative text-right font-mono text-xs text-fg-subtle tabular-nums">
          {battle.finishedAt ? dateFormat.format(new Date(battle.finishedAt)) : '—'}
        </span>
        <span
          className={cn(
            'relative hidden size-6 items-center justify-center border transition-all duration-200 md:flex',
            open ? 'border-(--tone)/50 bg-(--tone)/10' : 'border-transparent group-hover:border-line-strong',
          )}
        >
          <ChevronDown className={cn('size-4 transition-transform duration-300', open ? 'rotate-180 text-(--tone)' : 'text-fg-subtle group-hover:text-fg')} />
        </span>
      </button>
      {open && <BattleDetails battle={battle} />}
    </li>
  )
}

/** Detalhe sob demanda: `GET /battles/:id` traz o estado final das unidades, o XP e o loot. */
function BattleDetails({ battle }: { battle: BattleSummary }) {
  const detail = useBattle(battle.id)
  const squads = useSquads()
  const squadName = squads.data?.find((s) => s.id === battle.squadId)?.name
  const loot = detail.data?.result?.loot

  return (
    <div className="relative space-y-4 border-t border-line/70 bg-bg/40 px-4 py-5 motion-safe:animate-fade-in">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact icon={LayoutGrid} label="Esquadrão" value={squadName ?? 'apagado'} />
        <Fact icon={Gauge} label="Dificuldade" value={difficultyLabels[battle.opponent.difficulty]} />
        <Fact icon={Swords} label="Rodadas" value={String(battle.rounds ?? '—')} />
        <Fact icon={Clock} label="Duração" value={duration(battle)} />
      </div>

      {detail.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-52 animate-pulse bg-raised" />
          <div className="h-52 animate-pulse bg-raised" />
        </div>
      ) : detail.isError ? (
        <p className="text-sm text-danger">Não foi possível carregar os detalhes desta batalha.</p>
      ) : (
        <>
          <AwakenedBanner
            names={(detail.data.result?.rewards ?? [])
              .filter((r) => r.awakened)
              .map((r) => detail.data.units.find((u) => u.characterId === r.characterId)?.name ?? 'Personagem')}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SideCard title="Seu esquadrão" side="PLAYER" battle={detail.data} />
            <SideCard title={battle.opponent.name} side="OPPONENT" battle={detail.data} />
          </div>
          {loot && (
            <div className="chamfer flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--color-coin)_30%,var(--color-line))] [--cut:10px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Ganhou</span>
              <Coins value={loot.coins} signed className="text-base font-bold text-silver-bright" iconClassName="size-4" />
              <FragmentDeltaList fragments={loot.fragments} />
              {loot.chest && (
                <Link
                  to="/baus"
                  className="focus-ring group ml-auto flex items-center gap-2 border border-line-strong px-2 py-1 text-xs text-fg-muted transition-colors hover:text-fg"
                  style={{ borderColor: `color-mix(in srgb, ${rarityTone[loot.chest.tier].color} 50%, transparent)` }}
                >
                  <ChestArt tier={loot.chest.tier} className="h-5 w-6 transition-transform group-hover:-translate-y-0.5" />
                  Baú <span className={cn('font-display font-bold italic', rarityTone[loot.chest.tier].text)}>{loot.chest.tier}</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="group flex items-center gap-2.5 border border-line/60 bg-surface/60 px-3 py-2 transition-colors hover:border-line-strong">
      <Icon className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-primary-soft" />
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle">{label}</p>
        <p className="truncate text-sm font-medium text-fg">{value}</p>
      </div>
    </div>
  )
}

function SideCard({ title, side, battle }: { title: string; side: 'PLAYER' | 'OPPONENT'; battle: BattleDetail }) {
  const characters = useCharacters()
  const units = battle.units.filter((u) => u.side === side)
  const rewards = new Map(battle.result?.rewards.map((r) => [r.characterId, r]))
  const ally = side === 'PLAYER'
  const alive = units.filter((u) => u.alive).length

  return (
    <div
      style={{ '--tone': ally ? 'var(--color-ally)' : 'var(--color-enemy)' } as CSSProperties}
      className="chamfer relative overflow-hidden p-4 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_35%,var(--color-line))] [--cut:14px]"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-(--tone)/10 to-transparent" />
      <div className="relative mb-3 flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--tone)">{title}</p>
        <p className="font-mono text-[10px] text-fg-subtle tabular-nums">
          {alive}/{units.length} de pé
        </p>
      </div>
      <ul className="relative space-y-1.5">
        {units.map((unit) => {
          const Icon = classIcons[unit.characterClass]
          const reward = unit.characterId ? rewards.get(unit.characterId) : undefined
          const hpPercent = unit.maxHp ? Math.max(0, (unit.hp / unit.maxHp) * 100) : 0
          // a ficha só existe para o próprio personagem (e se ele ainda está na conta)
          const linkable = ally && !!unit.characterId && !!characters.data?.some((c) => c.id === unit.characterId)
          const content = (
            <>
              <span className="chamfer relative size-10 shrink-0 overflow-hidden [--chamfer-bg:var(--color-bg)] [--chamfer-border:color-mix(in_srgb,var(--tone)_40%,transparent)] [--cut:6px]">
                <span className="absolute inset-px overflow-hidden [clip-path:var(--chamfer-shape)]">
                  <CharacterPortrait
                    templateKey={unit.templateKey}
                    characterClass={unit.characterClass}
                    zoom={3.2}
                    mirror={!ally}
                    className={cn('size-full transition-all duration-300', !unit.alive && 'opacity-50 grayscale')}
                    iconClassName="size-4 text-silver/50"
                  />
                </span>
                {!unit.alive && (
                  <span className="absolute inset-0 flex items-center justify-center bg-bg/40">
                    <Skull className="size-4 text-fg-muted" />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Icon className="size-3 shrink-0 text-fg-subtle" />
                    <span className={cn('truncate text-sm font-semibold transition-colors', unit.alive ? 'text-fg' : 'text-fg-subtle line-through', linkable && 'group-hover:text-primary-soft')}>
                      {unit.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums">
                    LV {unit.level} · {Math.round(unit.hp)}/{unit.maxHp}
                  </span>
                </div>
                <div className="h-1 -skew-x-12 bg-overlay">
                  <div className="h-full bg-(--tone) transition-[width] duration-700 ease-out-soft" style={{ width: `${hpPercent}%` }} />
                </div>
              </div>
              {ally && (
                <span className="flex w-20 shrink-0 flex-col items-end gap-0.5">
                  {reward ? (
                    <>
                      <span className="font-mono text-xs text-primary-soft tabular-nums">+{reward.xp} XP</span>
                      {reward.levelsGained > 0 && (
                        <Badge tone="primary">
                          LV {reward.level}
                          {reward.newSkillOffers > 0 && <Sparkles className="size-3" />}
                        </Badge>
                      )}
                      {reward.awakened && (
                        <Badge tone="primary">
                          <Flame className="size-3" /> Despertou
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="font-mono text-[11px] text-fg-subtle">sem XP</span>
                  )}
                </span>
              )}
            </>
          )
          const rowClass = 'flex items-center gap-3 border border-transparent p-1.5 transition-colors'
          return (
            <li key={unit.ref}>
              {linkable ? (
                <Link to={`/personagens/${unit.characterId}`} className={cn(rowClass, 'focus-ring group hover:border-line hover:bg-bg/50')}>
                  {content}
                </Link>
              ) : (
                <div className={rowClass}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FilterChip({ active, count, tone, onClick, children }: {
  active: boolean
  count: number
  tone: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{ '--tone': tone } as CSSProperties}
      className={cn(
        'focus-ring chamfer group flex h-9 items-center gap-2 px-3.5 font-display text-sm font-semibold uppercase tracking-widest transition-all [--cut:8px]',
        active
          ? 'text-silver-bright [--chamfer-bg:color-mix(in_srgb,var(--tone)_14%,var(--color-surface))] [--chamfer-border:color-mix(in_srgb,var(--tone)_65%,transparent)]'
          : 'text-fg-muted [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:-translate-y-0.5 hover:text-fg hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_40%,var(--color-line))]',
      )}
    >
      <span className={cn('size-1.5 rotate-45 bg-(--tone) transition-opacity', active ? 'opacity-100 shadow-[0_0_6px_var(--tone)]' : 'opacity-50 group-hover:opacity-100')} />
      {children}
      <span className={cn('font-mono text-[10px] tabular-nums', active ? 'text-(--tone)' : 'text-fg-subtle')}>{count}</span>
    </button>
  )
}

function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-16 text-center">
      <Swords className="size-6 text-fg-subtle" />
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">{title}</p>
      <p className="text-sm text-fg-muted">{detail}</p>
      {action}
    </div>
  )
}

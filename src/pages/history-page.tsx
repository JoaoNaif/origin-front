import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Play, Skull, Sparkles, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page, PageHeader } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button-classes'
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

type Filter = 'ALL' | BattleOutcome

const filters: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'WIN', label: 'Vitórias' },
  { value: 'LOSS', label: 'Derrotas' },
  { value: 'ABANDON', label: 'Desistências' },
]

const outcomeTone: Record<BattleOutcome, { text: string; bar: string }> = {
  WIN: { text: 'text-success', bar: 'bg-success' },
  LOSS: { text: 'text-danger', bar: 'bg-danger' },
  ABANDON: { text: 'text-fg-muted', bar: 'bg-line-strong' },
}

const streakLabels: Record<BattleOutcome, string> = {
  WIN: 'vitórias seguidas',
  LOSS: 'derrotas seguidas',
  ABANDON: 'desistências seguidas',
}

const dateFormat =new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

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
  const difficulties = useMemo(
    () => (Object.keys(difficultyLabels) as AiDifficulty[]).filter((d) => finished.some((b) => b.opponent.difficulty === d)),
    [finished],
  )
  const shown = finished.filter(
    (b) => (filter === 'ALL' || battleOutcome(b) === filter) && (!difficulty || b.opponent.difficulty === difficulty),
  )

  return (
    <Page>
      <PageHeader eyebrow="Registro" title="Histórico" description="Suas últimas 50 batalhas contra a máquina." />

      {inProgress && <ResumeTile battle={inProgress} />}

      {battles.isPending ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse bg-raised" />
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
                <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                  {f.label}
                </Chip>
              ))}
            </div>
            {difficulties.length > 1 && (
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por dificuldade">
                <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Dificuldade</span>
                {[null, ...difficulties].map((d) => (
                  <button
                    key={d ?? 'all'}
                    type="button"
                    aria-pressed={difficulty === d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'focus-ring rounded-control px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors',
                      difficulty === d ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg-muted',
                    )}
                  >
                    {d ? difficultyLabels[d] : 'Todas'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-fg-muted">Nenhuma batalha com esse filtro.</p>
          ) : (
            <ul className="divide-y divide-line/70 border border-line bg-surface/60">
              {shown.map((battle) => (
                <BattleRow
                  key={battle.id}
                  battle={battle}
                  open={open === battle.id}
                  onToggle={() => setOpen(open === battle.id ? null : battle.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  )
}

function ResumeTile({ battle }: { battle: BattleSummary }) {
  return (
    <Link
      to={`/batalha/${battle.id}`}
      className="focus-ring chamfer group flex items-center gap-4 p-4 [--chamfer-bg:rgb(59_40_10/0.85)] [--chamfer-border:rgb(245_165_36/0.45)] [--cut:14px] hover:[--chamfer-border:rgb(245_165_36/0.8)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center border border-warning/40 text-warning">
        <Play className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warning">
          <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-pill bg-warning align-middle" />
          Batalha em andamento
        </p>
        <p className="truncate font-display text-xl font-bold uppercase tracking-wide text-fg">vs {battle.opponent.name}</p>
        <p className="truncate text-xs text-fg-muted">
          {battle.rounds ? `Rodada ${battle.rounds} · ` : ''}{difficultyLabels[battle.opponent.difficulty]}
        </p>
      </div>
      <span className="hidden font-display text-sm font-bold uppercase tracking-[0.12em] text-warning sm:block">Retomar</span>
      <ChevronRight className="size-4 text-warning transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function Summary({ battles }: { battles: BattleSummary[] }) {
  const wins = battles.filter((b) => battleOutcome(b) === 'WIN').length
  const rate = Math.round((wins / battles.length) * 100)
  // Sequência atual: a lista vem da mais recente para a mais antiga
  const lastOutcome = battleOutcome(battles[0])
  const streak = battles.findIndex((b) => battleOutcome(b) !== lastOutcome)
  const streakCount = streak === -1 ? battles.length : streak

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Combates" value={battles.length} />
      <Stat label="Vitórias" value={wins} detail={`${battles.length - wins} sem vitória`} tone="text-success" />
      <Stat label="Aproveitamento" value={`${rate}%`}>
        <div className="mt-3 h-1 bg-overlay">
          <div className="h-full bg-success" style={{ width: `${rate}%` }} />
        </div>
      </Stat>
      <Stat
        label="Sequência"
        value={streakCount}
        detail={streakCount === 1 ? `${outcomeLabels[lastOutcome].toLowerCase()} na última` : streakLabels[lastOutcome]}
        tone={outcomeTone[lastOutcome].text}
      />
    </div>
  )
}

function Stat({ label, value, detail, tone, children }: {
  label: string
  value: ReactNode
  detail?: string
  tone?: string
  children?: ReactNode
}) {
  return (
    <div className="hud-corners border border-line/60 bg-surface/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">{label}</p>
      <p className={cn('font-display text-4xl leading-none font-extrabold italic tabular-nums', tone ?? 'text-silver-bright')}>{value}</p>
      {detail && <p className="mt-1 font-mono text-[11px] text-fg-muted">{detail}</p>}
      {children}
    </div>
  )
}

function BattleRow({ battle, open, onToggle }: { battle: BattleSummary; open: boolean; onToggle: () => void }) {
  const outcome = battleOutcome(battle)
  const tone = outcomeTone[outcome]

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'focus-ring grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-white/2',
          'md:grid-cols-[9rem_1fr_9rem_5rem_8rem_1rem]',
          open && 'bg-white/2',
        )}
      >
        <span className={cn('flex items-center gap-2.5 font-display text-lg font-bold uppercase italic', tone.text)}>
          <span className={cn('h-5 w-0.75', tone.bar)} />
          {outcomeLabels[outcome]}
        </span>
        <span className="order-3 col-span-2 min-w-0 md:order-0 md:col-span-1">
          <span className="block truncate text-sm font-medium text-fg">{battle.opponent.name}</span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
            {profileLabels[battle.opponent.profile]}
            {battle.endReason && ` · ${endReasonLabels[battle.endReason]}`}
          </span>
        </span>
        <span className="hidden text-sm text-fg-muted md:block">{difficultyLabels[battle.opponent.difficulty]}</span>
        <span className="hidden text-right font-mono text-xs text-fg-muted tabular-nums md:block">R{battle.rounds}</span>
        <span className="text-right font-mono text-xs text-fg-subtle tabular-nums">
          {battle.finishedAt ? dateFormat.format(new Date(battle.finishedAt)) : '—'}
        </span>
        <ChevronDown className={cn('hidden size-4 text-fg-subtle transition-transform md:block', open && 'rotate-180 text-primary-soft')} />
      </button>
      {open && <BattleDetails battle={battle} />}
    </li>
  )
}

/** Detalhe sob demanda: `GET /battles/:id` traz o estado final das unidades e o XP. */
function BattleDetails({ battle }: { battle: BattleSummary }) {
  const detail = useBattle(battle.id)
  const squads = useSquads()
  const squadName = squads.data?.find((s) => s.id === battle.squadId)?.name

  return (
    <div className="border-t border-line/70 bg-bg/40 px-4 py-5">
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-fg-muted">
        <span>
          <span className="text-fg-subtle">Esquadrão </span>
          {squadName ?? 'apagado'}
        </span>
        <span>
          <span className="text-fg-subtle">Dificuldade </span>
          {difficultyLabels[battle.opponent.difficulty]}
        </span>
        <span>
          <span className="text-fg-subtle">Rodadas </span>
          {battle.rounds}
        </span>
        <span>
          <span className="text-fg-subtle">Duração </span>
          {duration(battle)}
        </span>
      </div>

      {detail.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse bg-raised" />
          <div className="h-44 animate-pulse bg-raised" />
        </div>
      ) : detail.isError ? (
        <p className="text-sm text-danger">Não foi possível carregar os detalhes desta batalha.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <SideCard title="Seu esquadrão" side="PLAYER" battle={detail.data} />
          <SideCard title={battle.opponent.name} side="OPPONENT" battle={detail.data} />
        </div>
      )}
    </div>
  )
}

function SideCard({ title, side, battle }: { title: string; side: 'PLAYER' | 'OPPONENT'; battle: BattleDetail }) {
  const characters = useCharacters()
  const units = battle.units.filter((u) => u.side === side)
  const rewards = new Map(battle.result?.rewards.map((r) => [r.characterId, r]))
  const ally = side === 'PLAYER'

  return (
    <div className={cn('hud-corners border border-line/60 bg-surface/60 p-4', ally ? '[--hud-color:var(--color-ally)]' : '[--hud-color:var(--color-enemy)]')}>
      <p className={cn('mb-3 font-mono text-[10px] uppercase tracking-[0.18em]', ally ? 'text-primary-soft' : 'text-danger-hover')}>
        {title}
      </p>
      <ul className="space-y-2.5">
        {units.map((unit) => {
          const Icon = classIcons[unit.characterClass]
          const reward = unit.characterId ? rewards.get(unit.characterId) : undefined
          const hpPercent = unit.maxHp ? Math.max(0, (unit.hp / unit.maxHp) * 100) : 0
          // a ficha só existe para o próprio personagem (e se ele ainda está na conta)
          const linkable = ally && unit.characterId && characters.data?.some((c) => c.id === unit.characterId)
          const name = (
            <span className={cn('truncate text-sm font-medium', unit.alive ? 'text-fg' : 'text-fg-subtle line-through')}>{unit.name}</span>
          )
          return (
            <li key={unit.ref} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3">
              {unit.alive ? <Icon className="size-4 text-silver/60" /> : <Skull className="size-4 text-fg-subtle" />}
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  {linkable ? (
                    <Link to={`/personagens/${unit.characterId}`} className="focus-ring min-w-0 truncate hover:text-primary-soft">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  <span className="shrink-0 font-mono text-[10px] text-fg-subtle tabular-nums">
                    LV {unit.level} · {unit.hp}/{unit.maxHp}
                  </span>
                </div>
                <div className="h-0.75 bg-overlay">
                  <div className={cn('h-full', ally ? 'bg-ally' : 'bg-enemy')} style={{ width: `${hpPercent}%` }} />
                </div>
              </div>
              {ally && (
                <span className="flex w-24 flex-col items-end gap-0.5">
                  {reward ? (
                    <>
                      <span className="font-mono text-xs text-primary-soft tabular-nums">+{reward.xp} XP</span>
                      {reward.levelsGained > 0 && (
                        <Badge tone="primary">
                          LV {reward.level}
                          {reward.newSkillOffers > 0 && <Sparkles className="size-3" />}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="font-mono text-[11px] text-fg-subtle">sem XP</span>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
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

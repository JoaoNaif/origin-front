import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Ban,
  Flag,
  Flame,
  Heart,
  History,
  Hourglass,
  Lock,
  Mountain,
  Move,
  ScrollText,
  Shield,
  ShieldOff,
  Skull,
  Sparkle,
  Sparkles,
  Swords,
  Trophy,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import type { Battle, BattleUnit, Side } from '@/features/battle/battle-api'
import { displayHp, toneText, type LogIcon, type LogTurn } from '@/features/battle/battle-events'
import { classIcons } from '@/features/game/class-icons'
import { difficultyLabels, type Stat } from '@/features/game/game-api'
import { endReasonLabels, profileLabels, statLabels, statShort } from '@/features/game/game-labels'
import { CharacterPortrait } from '@/features/game/character-art'
import { cn } from '@/lib/cn'

const MAX_ROUNDS = 30

/** Placar da batalha: sua placa, a rodada no centro, a placa do adversário; o campo e as ações à direita. */
export function TopBar({ battle, units, playerName, onForfeit, forfeiting, onToggleLog }: {
  battle: Battle
  /** As unidades como estão na tela (durante a animação, as de exibição). */
  units: BattleUnit[]
  playerName?: string
  onForfeit: () => void
  forfeiting: boolean
  onToggleLog: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const field = battle.fields.find((f) => f.key === battle.field.key)
  const live = battle.status === 'IN_PROGRESS'

  return (
    <header className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line bg-surface/85 px-4 py-2.5 backdrop-blur-sm lg:gap-6 lg:px-6">
      <Link
        to="/"
        aria-label="Voltar ao lobby"
        className="focus-ring group flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden lg:inline">Lobby</span>
      </Link>

      {/* Placar */}
      <div className="flex min-w-0 items-center justify-center gap-3 lg:gap-6">
        <TeamPlate side="PLAYER" title={playerName ?? 'Você'} subtitle="Seu esquadrão" units={units} />
        <div className="flex shrink-0 flex-col items-center">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-fg-subtle">Rodada</span>
          <span className="font-display text-3xl leading-none font-extrabold italic text-silver-bright tabular-nums">
            {battle.round}
            <span className="text-base text-fg-subtle not-italic">/{MAX_ROUNDS}</span>
          </span>
          <span className="mt-1 h-0.75 w-20 bg-overlay">
            <span className="block h-full bg-silver/60" style={{ width: `${(battle.round / MAX_ROUNDS) * 100}%` }} />
          </span>
        </div>
        <TeamPlate
          side="OPPONENT"
          title={battle.opponent.name}
          subtitle={`${difficultyLabels[battle.opponent.difficulty]} · ${profileLabels[battle.opponent.profile]}`}
          units={units}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Campo em vigor */}
        <div
          className="chamfer hidden items-center gap-2.5 py-1.5 pr-3 pl-2.5 [--chamfer-bg:var(--color-raised)] [--chamfer-border:rgb(245_165_36/0.45)] [--cut:8px] lg:flex"
          title={field ? `Bônus para quem tem os traços do campo${battle.field.untilRound ? ` · até a rodada ${battle.field.untilRound}` : ''}` : undefined}
        >
          <Mountain className="size-4 shrink-0 text-warning" />
          <span className="min-w-0">
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-warning">
              Campo{battle.field.untilRound ? ` · até R${battle.field.untilRound}` : ''}
            </span>
            <span className="block truncate font-display text-sm leading-tight font-bold uppercase tracking-wide text-fg">
              {field?.name ?? 'Sem campo'}
            </span>
          </span>
          {field && (
            <span className="hidden gap-1 xl:flex">
              {[
                [field.primaryPercent, field.primaryStat],
                [field.secondaryPercent, field.secondaryStat],
              ].map(([percent, stat]) => (
                <span key={stat} className="border border-warning/40 px-1 py-px font-mono text-[10px] font-bold text-warning" title={statLabels[stat as Stat]}>
                  +{percent}% {statShort[stat as Stat]}
                </span>
              ))}
            </span>
          )}
        </div>

        <Button variant="ghost" size="sm" className="xl:hidden" onClick={onToggleLog} aria-label="Registro">
          <ScrollText className="size-3.5" />
          <span className="hidden sm:inline">Registro</span>
        </Button>
        {live &&
          (confirming ? (
            <>
              <span className="hidden text-xs text-fg-muted 2xl:inline">A máquina vence e não há XP.</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={forfeiting}>
                Voltar
              </Button>
              <Button variant="danger" size="sm" onClick={onForfeit} disabled={forfeiting}>
                {forfeiting ? 'Desistindo...' : 'Desistir'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label="Desistir">
              <Flag className="size-3.5" />
              <span className="hidden sm:inline">Desistir</span>
            </Button>
          ))}
      </div>
    </header>
  )
}

/** Placa de um lado: nome, subtítulo e a vida de cada um dos 4 (caído = cinza). Virada para o centro. */
function TeamPlate({ side, title, subtitle, units }: { side: Side; title: string; subtitle: string; units: BattleUnit[] }) {
  const ally = side === 'PLAYER'
  const team = units.filter((u) => u.side === side)
  const alive = team.filter((u) => u.alive).length

  return (
    <div
      className={cn(
        'chamfer flex min-w-0 items-center gap-3 px-3 py-1.5 [--cut:10px]',
        // fundo opaco: o chanfro pinta a borda por baixo, e um fundo translúcido deixaria a cor vazar
        ally
          ? 'flex-row-reverse text-right [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(139_92_246/0.5)]'
          : '[--chamfer-bg:var(--color-danger-dim)] [--chamfer-border:rgb(229_72_77/0.5)]',
      )}
    >
      <span className={cn('font-display text-2xl leading-none font-extrabold italic tabular-nums', ally ? 'text-primary-soft' : 'text-danger-hover')} title="Vivos">
        {alive}
        <span className="text-sm text-fg-subtle not-italic">/{team.length}</span>
      </span>
      <span className="min-w-0">
        <span className={cn('block font-mono text-[9px] uppercase tracking-[0.2em]', ally ? 'text-primary-soft' : 'text-danger-hover')}>
          {ally ? 'Você' : 'Adversário'}
        </span>
        <span className="block truncate font-display text-base leading-tight font-bold uppercase tracking-wide text-silver-bright">{title}</span>
        <span className="hidden truncate font-mono text-[10px] text-fg-muted md:block">{subtitle}</span>
        {/* vida de cada um */}
        <span className={cn('mt-1 flex gap-1', ally && 'justify-end')}>
          {team.map((u) => (
            <span key={u.ref} className="h-1 w-6 bg-overlay lg:w-8" title={`${u.name}: ${displayHp(u.hp)}/${displayHp(u.maxHp)}`}>
              <span
                className={cn('block h-full transition-[width] duration-300', !u.alive ? 'bg-transparent' : ally ? 'bg-ally' : 'bg-enemy')}
                style={{ width: `${u.alive ? Math.min(100, (u.hp / u.maxHp) * 100) : 0}%` }}
              />
            </span>
          ))}
        </span>
      </span>
    </div>
  )
}

/** A vez atual e as próximas 8. */
export function Timeline({ battle, units }: { battle: Battle; units: BattleUnit[] }) {
  const byRef = new Map(units.map((u) => [u.ref, u]))
  const entries = [...(battle.turn ? [{ ref: battle.turn.ref, round: battle.round, extra: false, current: true }] : []), ...battle.timeline.map((t) => ({ ...t, current: false }))]
  if (!entries.length) return null

  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Ordem das vezes">
      {entries.map((entry, i) => {
        const unit = byRef.get(entry.ref)
        if (!unit) return null
        const ally = unit.side === 'PLAYER'
        const newRound = i > 0 && entry.round !== entries[i - 1].round
        return (
          <li key={`${entry.ref}-${i}`} className="flex items-center gap-1.5">
            {newRound && <span className="mx-1 font-mono text-[9px] text-fg-subtle">R{entry.round}</span>}
            <span
              title={unit.name}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 border px-2',
                entry.current ? 'h-11 px-3' : 'opacity-80',
                ally ? 'border-primary-soft/40 bg-primary/10' : 'border-enemy/40 bg-enemy/10',
                entry.current && (ally ? 'border-primary-soft shadow-[0_0_16px_rgb(139_92_246/0.5)]' : 'border-enemy shadow-glow-danger'),
              )}
            >
              <CharacterPortrait
                templateKey={unit.templateKey}
                characterClass={unit.characterClass}
                zoom={4.2}
                mirror={!ally}
                className={cn('shrink-0 rounded-pill bg-bg', entry.current ? 'size-7' : 'size-5')}
                iconClassName={cn('size-3.5', ally ? 'text-primary-soft' : 'text-danger-hover')}
              />
              <span className={cn('font-display font-bold uppercase tracking-wide text-fg', entry.current ? 'text-base' : 'text-xs')}>
                {unit.name.split(' ')[0]}
              </span>
              {entry.extra && <span className="font-mono text-[8px] text-warning">+1</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const logIcons: Record<LogIcon, LucideIcon> = {
  skill: Sparkles,
  damage: Swords,
  miss: Wind,
  heal: Heart,
  shield: Shield,
  status: Zap,
  resist: ShieldOff,
  buff: ArrowUp,
  debuff: ArrowDown,
  desgaste: Flame,
  passive: Sparkle,
  move: Move,
  time: Hourglass,
  lock: Lock,
  skip: Ban,
  field: Mountain,
  defeated: Skull,
  end: Trophy,
}

/** Só as últimas vezes vão para a tela (a batalha passa de cem vezes). */
const LOG_LIMIT = 80

/** Registro em blocos: cada vez com quem agiu (na cor do lado) e as ações com ícone e valor; divisória por rodada. */
export function CombatLog({ turns, unit, live }: {
  turns: LogTurn[]
  unit: (ref: string) => BattleUnit | undefined
  /** Batalha valendo: a última vez ainda está sendo jogada. */
  live: boolean
}) {
  const end = useRef<HTMLDivElement>(null)
  const size = turns.reduce((total, t) => total + t.entries.length + 1, 0)
  // com chaves: no Chrome atual o scrollIntoView devolve uma Promise, e o React a trataria como limpeza do efeito
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [size])

  const shown = turns.slice(-LOG_LIMIT)

  return (
    <div className="flex h-full min-h-0 flex-col border border-line/60 bg-surface/70">
      <p className="flex items-center justify-between border-b border-line/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
        <span>{'// '}Registro</span>
        <span>{turns.length} vezes</span>
      </p>
      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5" aria-live="polite">
        {turns.length > LOG_LIMIT && <li className="pb-1 text-center font-mono text-[10px] text-fg-subtle">Vezes mais antigas no histórico</li>}
        {shown.map((turn, i) => (
          <li key={turn.id}>
            {(i === 0 || shown[i - 1].round !== turn.round) && (
              <div className="flex items-center gap-2 py-1.5" aria-label={`Rodada ${turn.round}`}>
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-fg-subtle">Rodada {turn.round}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            )}
            <TurnBlock turn={turn} actor={turn.ref ? unit(turn.ref) : undefined} current={live && i === shown.length - 1} />
          </li>
        ))}
        <div ref={end} />
      </ol>
    </div>
  )
}

function TurnBlock({ turn, actor, current }: { turn: LogTurn; actor?: BattleUnit; current: boolean }) {
  const ally = actor?.side === 'PLAYER'
  const Icon = actor ? classIcons[actor.characterClass] : Mountain
  const color = !actor ? 'text-warning' : ally ? 'text-primary-soft' : 'text-danger-hover'

  return (
    <div className={cn('border-l-2 bg-white/2 py-2 pr-2.5 pl-2.5', !actor ? 'border-warning/70' : ally ? 'border-ally' : 'border-enemy')}>
      <p className="flex items-center gap-2">
        <Icon className={cn('size-3.5 shrink-0', color)} />
        <span className={cn('min-w-0 truncate font-display text-sm leading-none font-bold uppercase tracking-wide', color)}>
          {actor?.name ?? 'Início da batalha'}
        </span>
        {turn.extra && <span className="shrink-0 border border-warning/50 px-1 font-mono text-[8px] font-bold text-warning">AÇÃO EXTRA</span>}
      </p>
      {turn.entries.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {turn.entries.map((entry) => {
            const EntryIcon = logIcons[entry.icon]
            return (
              <li key={entry.id} className="flex items-center gap-2 text-xs">
                <EntryIcon className={cn('size-3.5 shrink-0', toneText[entry.tone])} />
                <span className={cn('min-w-0 flex-1 leading-snug', entry.icon === 'skill' ? 'font-semibold text-fg' : 'text-fg-muted')}>
                  {entry.text}
                </span>
                {entry.value && (
                  <span className={cn('shrink-0 font-mono text-[11px] font-bold tabular-nums', toneText[entry.tone])}>{entry.value}</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={cn('mt-1 text-[11px]', current ? 'animate-pulse text-fg-muted' : 'text-fg-subtle')}>
          {current ? 'Escolhendo a jogada...' : 'Sem ação nesta vez.'}
        </p>
      )}
    </div>
  )
}

/** Fim da batalha: resultado, motivo e o XP de cada um. */
export function ResultOverlay({ battle, onClose }: { battle: Battle; onClose: () => void }) {
  const result = battle.result
  if (!result) return null
  const won = result.winner === 'PLAYER'
  const title = won ? 'Vitória' : result.endReason === 'ABANDON' ? 'Desistência' : 'Derrota'
  const names = new Map(battle.units.filter((u) => u.characterId).map((u) => [u.characterId!, u]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className={cn(
          'chamfer relative w-full max-w-lg p-8 [--cut:24px]',
          won ? '[--chamfer-bg:rgb(18_18_22/0.97)] [--chamfer-border:rgb(61_214_140/0.5)]' : '[--chamfer-bg:rgb(18_18_22/0.97)] [--chamfer-border:rgb(229_72_77/0.5)]',
        )}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-subtle">
          {endReasonLabels[result.endReason]} · {result.rounds} rodadas
        </p>
        <h2 className={cn('mt-1 font-display text-7xl leading-none font-extrabold uppercase italic', won ? 'text-success' : 'text-danger-hover')}>
          {title}
        </h2>

        <div className="mt-6 space-y-2">
          {result.rewards.length === 0 ? (
            <p className="text-sm text-fg-muted">Sem XP nesta batalha.</p>
          ) : (
            result.rewards.map((reward) => {
              const unit = names.get(reward.characterId)
              const Icon = unit ? classIcons[unit.characterClass] : Swords
              return (
                <Link
                  key={reward.characterId}
                  to={`/personagens/${reward.characterId}`}
                  className="focus-ring flex items-center gap-3 border border-line/60 bg-surface/60 px-3 py-2 transition-colors hover:border-line-strong"
                >
                  {unit ? (
                    <CharacterPortrait templateKey={unit.templateKey} characterClass={unit.characterClass} zoom={4} className="size-8 shrink-0 rounded-pill bg-bg" iconClassName="size-4 text-silver/60" />
                  ) : (
                    <Icon className="size-4 text-silver/60" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{unit?.name ?? 'Personagem'}</span>
                  {reward.newSkillOffers > 0 && (
                    <Badge tone="primary">
                      <Sparkles className="size-3" /> {reward.newSkillOffers} bloco{reward.newSkillOffers > 1 && 's'}
                    </Badge>
                  )}
                  {reward.levelsGained > 0 && <Badge tone="success">LV {reward.level}</Badge>}
                  <span className="w-16 text-right font-mono text-xs text-primary-soft tabular-nums">+{reward.xp} XP</span>
                </Link>
              )
            })
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Ver o campo
          </Button>
          <Link to="/historico" className={buttonClasses({ size: 'sm', variant: 'secondary' })}>
            <History className="size-4" /> Histórico
          </Link>
          <Link to="/batalhar" className={buttonClasses({ size: 'sm' })}>
            <Swords className="size-4" /> Batalhar de novo
          </Link>
        </div>
      </div>
    </div>
  )
}

import type { CSSProperties } from 'react'
import { AlertTriangle, ArrowRight, Check, Clock, Coins as CoinsIcon, Crosshair, Inbox, Trophy, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BeastEmblem } from '@/features/beasts/beast-ui'
import { formatCoins, fragmentLabels } from '@/features/economy/economy-labels'
import { ChestArt, Coins, FragmentIcon, RarityTag } from '@/features/economy/economy-ui'
import { useEvents, type EventBattleOutcome, type EventKind, type EventPhase, type EventReward, type EventRewardSource, type GrantedEventReward } from '@/features/events/event-api'
import { useRewardCatalog } from '@/features/events/event-hooks'
import { eventKindColors, eventKindIcons, eventKindLabels, formatDate, phaseLabels, rewardSourceLabels } from '@/features/events/event-labels'
import { CharacterPortrait } from '@/features/game/character-art'
import { GearEmblem } from '@/features/gear/gear-ui'
import { cn } from '@/lib/cn'

// Peças visuais dos eventos: emblema do tipo, fase, contagem, prêmios (com o nome do catálogo) e o que a batalha
// rendeu no evento. Usadas na página Eventos, no fim da batalha, no Histórico, no Guia e no admin.

const emblemSizes = {
  xs: ['size-9 [--cut:6px]', 'size-4'],
  sm: ['size-11 [--cut:8px]', 'size-5'],
  md: ['size-14 [--cut:10px]', 'size-6'],
  lg: ['size-20 [--cut:14px]', 'size-9'],
} as const

const kindTone = (kind: EventKind) => ({ '--tone': eventKindColors[kind] }) as CSSProperties

/** Emblema do evento: losango na cor do tipo com o ícone dele. */
export function EventEmblem({ kind, size = 'md', className }: { kind: EventKind; size?: keyof typeof emblemSizes; className?: string }) {
  const Icon = eventKindIcons[kind]
  const [box, icon] = emblemSizes[size]
  return (
    <span
      style={kindTone(kind)}
      className={cn(
        'chamfer relative flex shrink-0 items-center justify-center [--chamfer-bg:var(--color-bg)] [--chamfer-border:color-mix(in_srgb,var(--tone)_60%,transparent)]',
        box,
        kind === 'UNIQUE_BOSS' && 'shadow-[0_0_22px_-6px_var(--tone)]',
        className,
      )}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-px bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--tone)_30%,transparent),transparent_70%)] [clip-path:var(--chamfer-shape)]" />
      <Icon className={cn('relative text-(--tone)', icon)} />
    </span>
  )
}

/** Etiqueta do tipo, na cor dele. */
export function EventKindTag({ kind, className }: { kind: EventKind; className?: string }) {
  const Icon = eventKindIcons[kind]
  return (
    <span
      style={kindTone(kind)}
      className={cn(
        'inline-flex items-center gap-1 border border-(--tone)/50 bg-(--tone)/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-(--tone)',
        className,
      )}
    >
      <Icon className="size-3" />
      {eventKindLabels[kind]}
    </span>
  )
}

const phaseTone: Record<EventPhase, string> = {
  OPEN: 'border-success/40 bg-success/10 text-success',
  ANNOUNCED: 'border-warning/40 bg-warning/10 text-warning',
  ENDED: 'border-line-strong bg-raised text-fg-subtle',
}

export function PhaseTag({ phase, completed, className }: { phase: EventPhase; completed?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]', completed ? 'border-primary-soft/50 bg-primary-dim text-primary-soft' : phaseTone[phase], className)}>
      {completed ? <Trophy className="size-3" /> : phase === 'OPEN' && <span className="size-1.5 animate-pulse rounded-pill bg-success" />}
      {completed ? 'Concluído' : phaseLabels[phase]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Prêmios
// ---------------------------------------------------------------------------

const chip = 'inline-flex min-h-8 items-center gap-2 border border-line-strong bg-raised/80 py-1 pr-2.5 pl-1.5 text-xs text-fg'

/** Um prêmio: o desenho do item e o nome (moeda, fragmento, baú, personagem, equipamento ou besta). */
export function RewardChip({ reward, className }: { reward: EventReward; className?: string }) {
  const catalog = useRewardCatalog()
  switch (reward.type) {
    case 'COINS':
      return (
        <span className={cn(chip, 'pl-2', className)}>
          <Coins value={reward.amount} className="font-bold text-silver-bright" />
        </span>
      )
    case 'FRAGMENTS':
      return (
        <span className={cn(chip, 'pl-2', className)}>
          <FragmentIcon type={reward.lineage} />
          <span className="font-mono tabular-nums">{reward.amount}</span>
          <span className="text-fg-muted">{fragmentLabels[reward.lineage]}</span>
        </span>
      )
    case 'CHEST':
      return (
        <span className={cn(chip, className)}>
          <ChestArt tier={reward.tier} className="h-5 w-6" />
          Baú <RarityTag rarity={reward.tier} className="min-w-5 text-xs leading-4" />
        </span>
      )
    case 'CHARACTER': {
      const t = catalog.template(reward.templateKey)
      return (
        <span className={cn(chip, className)}>
          {t ? (
            <CharacterPortrait templateKey={t.key} characterClass={t.characterClass} zoom={3.6} className="size-6 rounded-pill bg-bg" iconClassName="size-3.5 text-silver/60" />
          ) : (
            <span className="size-6 rounded-pill bg-bg" />
          )}
          <span className="font-semibold text-silver-bright">{t?.name ?? reward.templateKey}</span>
          {t && <RarityTag rarity={t.rarity} className="min-w-5 text-xs leading-4" />}
        </span>
      )
    }
    case 'GEAR': {
      const g = catalog.gear(reward.gearKey)
      return (
        <span className={cn(chip, className)}>
          {g ? <GearEmblem kind={g.kind} grade={g.grade} size="xs" className="size-6! [--cut:4px]!" /> : <span className="size-6 bg-bg" />}
          <span className="font-semibold text-silver-bright">{g?.name ?? reward.gearKey}</span>
        </span>
      )
    }
    case 'BEAST': {
      const b = catalog.beast(reward.beastKey)
      return (
        <span className={cn(chip, className)}>
          {b ? <BeastEmblem grade={b.grade} contract={b.contract} size="xs" className="size-6! [--cut:4px]!" /> : <span className="size-6 bg-bg" />}
          <span className="font-semibold text-silver-bright">{b?.name ?? reward.beastKey}</span>
        </span>
      )
    }
  }
}

export function RewardList({ rewards, empty, className }: { rewards: EventReward[]; empty?: string; className?: string }) {
  if (rewards.length === 0) return empty ? <p className="text-xs text-fg-subtle">{empty}</p> : null
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {rewards.map((r, i) => (
        <RewardChip key={i} reward={r} />
      ))}
    </span>
  )
}

/** Como o prêmio chegou: entregue, virou moeda, foi para a caixa ou ficou indisponível. */
function GrantedStatus({ granted }: { granted: GrantedEventReward }) {
  switch (granted.status) {
    case 'DELIVERED':
      return (
        <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-success">
          <Check className="size-3" /> Na conta
        </span>
      )
    case 'CONVERTED':
      return (
        <span className="flex items-center gap-1 font-mono text-[10px] text-coin" title="Personagem repetido: virou moeda pela raridade">
          <CoinsIcon className="size-3" /> repetido · +{formatCoins(granted.coins)} M
        </span>
      )
    case 'PENDING':
      return (
        <Link to="/eventos#caixa" className="focus-ring flex items-center gap-1 font-mono text-[10px] text-warning hover:underline" title="Sem espaço no inventário">
          <Inbox className="size-3" /> na caixa até {formatDate(granted.expiresAt)}
        </Link>
      )
    case 'MISSING':
      return (
        <span className="flex items-center gap-1 font-mono text-[10px] text-fg-subtle" title="O item saiu do catálogo">
          <X className="size-3" /> indisponível
        </span>
      )
  }
}

const sourceOrder: EventRewardSource[] = ['COMPLETION', 'CAPTURE', 'STAGE', 'PARTICIPATION']

/**
 * O que a batalha rendeu no evento: a etapa (vencida ou não), a captura na caça, a conclusão e os prêmios por origem.
 * Aparece no fim da batalha e no detalhe do Histórico.
 */
export function EventOutcomePanel({ outcome, className }: { outcome: EventBattleOutcome; className?: string }) {
  const events = useEvents()
  const catalog = useRewardCatalog()
  const event = events.data?.events.find((e) => e.key === outcome.eventKey)
  const stageName = event?.stages[outcome.stage]?.name ?? `Etapa ${outcome.stage + 1}`
  const beastName = outcome.capture ? (catalog.beast(outcome.capture.beastKey)?.name ?? 'a besta') : null
  const kind = event?.kind

  const status = outcome.completed
    ? { text: 'Evento concluído!', tone: 'text-primary-soft', icon: Trophy }
    : outcome.stageCleared
      ? { text: `${stageName} vencida`, tone: 'text-success', icon: Check }
      : outcome.won
        ? { text: `${stageName}: a captura falhou`, tone: 'text-warning', icon: AlertTriangle }
        : { text: `${stageName}: tente de novo`, tone: 'text-fg-muted', icon: Clock }
  const StatusIcon = status.icon

  return (
    <div
      style={kind ? kindTone(kind) : undefined}
      className={cn(
        'chamfer relative space-y-3 p-4 [--chamfer-bg:rgb(18_18_22/0.9)] [--cut:12px]',
        outcome.completed ? '[--chamfer-border:var(--color-primary-soft)]' : '[--chamfer-border:color-mix(in_srgb,var(--tone,var(--color-primary))_45%,transparent)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {kind && <EventEmblem kind={kind} size="xs" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Evento · {event?.name ?? outcome.eventKey}</p>
          <p className={cn('flex items-center gap-1.5 font-display text-lg leading-tight font-bold uppercase tracking-wide', status.tone)}>
            <StatusIcon className="size-4" /> {status.text}
          </p>
        </div>
        <Link
          to={`/eventos?evento=${outcome.eventKey}`}
          className="focus-ring flex items-center gap-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-fg-muted transition-colors hover:text-primary-soft"
        >
          Ver evento <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {outcome.capture && (
        <p className={cn('flex items-center gap-2 border px-3 py-2 text-xs', outcome.capture.captured ? 'border-beast/40 bg-beast/10 text-fg' : 'border-line bg-bg/40 text-fg-muted')}>
          <Crosshair className={cn('size-4 shrink-0', outcome.capture.captured ? 'text-beast' : 'text-fg-subtle')} />
          <span className="flex-1">
            {outcome.capture.captured ? (
              <>
                Capturou <b className="text-silver-bright">{beastName}</b>!
              </>
            ) : (
              <>{beastName} escapou. A próxima tentativa tem mais chance.</>
            )}
          </span>
          <span className="font-mono text-[10px] text-fg-subtle tabular-nums">chance {Math.round(outcome.capture.chance * 100)}%</span>
        </p>
      )}

      {outcome.rewards.length > 0 && (
        <ul className="space-y-1.5">
          {[...outcome.rewards]
            .sort((a, b) => sourceOrder.indexOf(a.source) - sourceOrder.indexOf(b.source))
            .map((g, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-24 shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">{rewardSourceLabels[g.source]}</span>
                <RewardChip reward={g.reward} />
                <GrantedStatus granted={g} />
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

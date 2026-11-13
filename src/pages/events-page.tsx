import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AlertTriangle, CalendarClock, Check, ChevronRight, Crosshair, Gift, Inbox, Loader2, Lock, Play, Swords, Trash2, Trophy, Users } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Page, SectionTitle } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Term } from '@/components/ui/term'
import { toast } from '@/components/ui/toast'
import { useNpcSquads, useStartBattle } from '@/features/battle/battle-api'
import { FieldSection, SquadSection, type SquadAssessment } from '@/features/battle/pre-battle'
import { useBeastRules } from '@/features/beasts/beast-api'
import { useClaimReward, useDiscardReward, useEventDraft, useEvents, useRewardBox, type GameEvent, type PendingReward } from '@/features/events/event-api'
import {
  attemptLimitText,
  eventKindColors,
  eventKindText,
  eventTermText,
  formatDate,
  formatDay,
  formatDuration,
  modifierLabels,
  modifierText,
  requirementMissText,
  requirementText,
  squadModeLabels,
  squadModeText,
} from '@/features/events/event-labels'
import { checkRequirements, matchesLockedSquad } from '@/features/events/event-requirements'
import { phaseClock, useServerNow } from '@/features/events/event-hooks'
import { EventEmblem, EventKindTag, PhaseTag, RewardChip, RewardList } from '@/features/events/event-ui'
import { CharacterPortrait } from '@/features/game/character-art'
import { difficultyLabels, useBattles, useCharacters, useTemplates, useTraits } from '@/features/game/game-api'
import { profileLabels } from '@/features/game/game-labels'
import { useGear } from '@/features/gear/gear-api'
import { apiErrorMessage, httpStatus } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica a grade. */
const EVENTS_ART = '/art/banner-eventos.jpg'

/** Prazo da caixa que já pede atenção (aviso em laranja). */
const BOX_WARNING_MS = 2 * 24 * 60 * 60 * 1000

const phaseOrder = { OPEN: 0, ANNOUNCED: 1, ENDED: 2 } as const

/** O jogador pode entrar agora? Senão, o porquê (botão e cartão). */
function playBlock(event: GameEvent, now: number): string | null {
  if (event.phase === 'ANNOUNCED') return `Abre em ${formatDuration(new Date(event.startsAt).getTime() - now)}`
  if (event.phase === 'ENDED') return 'Encerrado'
  if (event.progress.completed) return 'Concluído'
  if (event.progress.attemptsLeft === 0) return event.attemptLimit?.per === 'DAY' ? 'Sem tentativas hoje' : 'Sem tentativas'
  return null
}

/**
 * Eventos (D155, D156): os abertos, os anunciados ("começa em...") e os encerrados em que a conta jogou, cada um com as
 * etapas, os requisitos, as tentativas e os prêmios; jogar a próxima etapa (a pré-batalha do evento e o esquadrão); e a
 * caixa de recompensas. Quem decide tudo é o servidor.
 */
export function EventsPage() {
  const events = useEvents()
  const box = useRewardBox()
  const battles = useBattles()
  const [params, setParams] = useSearchParams()
  const now = useServerNow(events.data?.clockOffset ?? 0)
  const [playing, setPlaying] = useState<GameEvent | null>(null)

  const list = useMemo(
    () =>
      [...(events.data?.events ?? [])].sort(
        (a, b) =>
          phaseOrder[a.phase] - phaseOrder[b.phase] ||
          Number(a.progress.completed) - Number(b.progress.completed) ||
          (a.phase === 'ANNOUNCED' ? a.startsAt.localeCompare(b.startsAt) : a.endsAt.localeCompare(b.endsAt)),
      ),
    [events.data],
  )
  const selected = list.find((e) => e.key === params.get('evento')) ?? list[0]
  const open = list.filter((e) => e.phase === 'OPEN').length
  const soon = list.filter((e) => e.phase === 'ANNOUNCED').length
  const inProgress = battles.data?.find((b) => b.status === 'IN_PROGRESS')

  // a fase muda pelas datas: passou de um início ou de um fim, pede a lista de novo (o servidor decide a fase)
  const { refetch, isFetching } = events
  const boundaryPassed = list.some(
    (e) => (e.phase === 'ANNOUNCED' && new Date(e.startsAt).getTime() <= now) || (e.phase === 'OPEN' && new Date(e.endsAt).getTime() <= now),
  )
  useEffect(() => {
    if (boundaryPassed && !isFetching) void refetch()
  }, [boundaryPassed, isFetching, refetch])

  // a âncora da caixa (vinda do fim da batalha) só existe depois que ela carrega
  useEffect(() => {
    if (window.location.hash === '#caixa' && box.data?.length) document.getElementById('caixa')?.scrollIntoView({ behavior: 'smooth' })
  }, [box.data?.length])

  return (
    <div className="pb-12">
      <PageBanner
        art={EVENTS_ART}
        tutorial="eventos"
        outlineWord="Eventos"
        meta={
          <>
            <Badge tone="primary">
              <CalendarClock className="size-3" />
              Por tempo limitado
            </Badge>
            {events.data && (
              <BannerMeta>
                {open} {open === 1 ? 'aberto' : 'abertos'} · {soon} em breve
              </BannerMeta>
            )}
          </>
        }
        title={
          <>
            Even
            <span className="text-gradient-primary pr-3">tos</span>
          </>
        }
        description="Momentos raros que sempre acabam: torres, caçadas, chefes e personagens novos. Cada etapa é uma batalha; os prêmios vêm por etapa, por concluir e por participar."
      />

      <Page className="space-y-10 pt-10 lg:pt-10">
        {inProgress && (
          <Link
            to={`/batalha/${inProgress.id}`}
            className="focus-ring chamfer group flex items-center gap-3 p-3 [--chamfer-bg:rgb(59_40_10/0.85)] [--chamfer-border:rgb(245_165_36/0.45)] [--cut:12px] transition-all hover:[--chamfer-border:rgb(245_165_36/0.85)]"
          >
            <Play className="size-4 text-warning" />
            <span className="min-w-0 flex-1 truncate text-sm text-fg">
              Batalha em andamento <span className="text-fg-muted">vs {inProgress.opponent.name}</span>
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-warning">Retomar</span>
            <ChevronRight className="size-4 text-warning transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        {!!box.data?.length && <RewardBox rewards={box.data} now={now} />}

        {events.isPending ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_34rem]">
            <div className="h-72 animate-pulse bg-raised" />
            <div className="h-96 animate-pulse bg-raised" />
          </div>
        ) : events.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar os eventos. Recarregue a página.</p>
        ) : !selected ? (
          <EmptyEvents />
        ) : (
          <section className="space-y-5">
            <SectionTitle index="01">Eventos</SectionTitle>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_34rem]">
              <div className="space-y-6">
                {(['OPEN', 'ANNOUNCED', 'ENDED'] as const).map((phase) => {
                  const group = list.filter((e) => e.phase === phase)
                  if (!group.length) return null
                  return (
                    <div key={phase} className="space-y-2.5">
                      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                        <span className="text-primary-soft/70">//</span>
                        {phase === 'OPEN' ? 'Abertos' : phase === 'ANNOUNCED' ? 'Em breve' : 'Encerrados'}
                        <span className="h-px flex-1 bg-linear-to-r from-line to-transparent" />
                      </p>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {group.map((e) => (
                          <li key={e.key}>
                            <EventCard event={e} now={now} active={e.key === selected.key} onClick={() => setParams({ evento: e.key }, { replace: true })} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
              <EventDetail key={selected.key} event={selected} now={now} onPlay={() => setPlaying(selected)} />
            </div>
          </section>
        )}

        {playing && <EventDraftDialog event={playing} onClose={() => setPlaying(null)} />}
      </Page>
    </div>
  )
}

function EmptyEvents() {
  return (
    <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-16 text-center">
      <CalendarClock className="size-7 text-fg-subtle" />
      <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">Nenhum evento por agora</p>
      <p className="max-w-md text-sm text-fg-muted">Eventos são raros e sempre têm fim. Quando um for anunciado, ele aparece aqui com a contagem até abrir.</p>
    </div>
  )
}

/** Cartão do evento: tipo, fase, contagem, etapas vencidas e tentativas. */
function EventCard({ event, now, active, onClick }: { event: GameEvent; now: number; active: boolean; onClick: () => void }) {
  const clock = phaseClock(event, now)
  const { clearedStages, totalStages, attemptsLeft, completed } = event.progress
  const ended = event.phase === 'ENDED'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ '--tone': eventKindColors[event.kind] } as CSSProperties}
      className={cn(
        'focus-ring chamfer group relative flex h-full w-full flex-col gap-3 overflow-hidden p-4 text-left [--cut:14px] transition-all duration-150 ease-out-soft',
        active
          ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_8%,var(--color-raised))] [--chamfer-border:var(--tone)] drop-shadow-[0_0_12px_color-mix(in_srgb,var(--tone)_30%,transparent)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_50%,transparent)]',
        ended && !active && 'opacity-70',
      )}
    >
      <span className="flex items-start gap-3">
        <EventEmblem kind={event.kind} size="sm" />
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="block truncate font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{event.name}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <EventKindTag kind={event.kind} />
            <PhaseTag phase={event.phase} completed={completed} />
          </span>
        </span>
      </span>

      {/* etapas: um traço por etapa, aceso nas vencidas */}
      <span className="flex gap-0.5" aria-label={`${clearedStages} de ${totalStages} etapas`}>
        {Array.from({ length: totalStages }, (_, i) => (
          <span key={i} className={cn('h-1.5 flex-1 -skew-x-12', i < clearedStages ? 'bg-(--tone)' : 'bg-overlay')} />
        ))}
      </span>

      <span className="flex items-center justify-between gap-2 font-mono text-[10px] text-fg-subtle">
        <span>
          {clock.label} <b className="font-bold text-fg">{clock.value}</b>
        </span>
        <span>
          {clearedStages}/{totalStages} etapas
          {event.phase === 'OPEN' && !completed && attemptsLeft !== null && ` · ${attemptsLeft} tent.`}
        </span>
      </span>
    </button>
  )
}

function Block({ label, term, children }: { label: string; term?: string; children: ReactNode }) {
  return (
    <div className="relative space-y-3 border-t border-line/70 pt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">
        {term ? (
          <Term title={term} info={eventTermText(term)} className="uppercase">
            {label}
          </Term>
        ) : (
          label
        )}
      </p>
      {children}
    </div>
  )
}

/** O evento escolhido: como funciona, datas, regras de entrada, etapas e prêmios, e o botão de jogar. */
function EventDetail({ event, now, onPlay }: { event: GameEvent; now: number; onPlay: () => void }) {
  const traits = useTraits()
  const characters = useCharacters()
  const traitName = (key: string) => traits.data?.find((t) => t.key === key)?.name ?? key
  const { progress } = event
  const block = playBlock(event, now)
  const next = progress.nextStage !== null ? event.stages[progress.nextStage] : null
  const locked = progress.lockedCharacterIds?.map((id) => characters.data?.find((c) => c.id === id)).filter((c) => !!c) ?? []

  return (
    <div
      style={{ '--tone': eventKindColors[event.kind] } as CSSProperties}
      className="chamfer space-y-6 p-5 [--chamfer-bg:var(--color-bg)] [--chamfer-border:color-mix(in_srgb,var(--tone)_35%,transparent)] [--cut:18px] xl:sticky xl:top-6"
    >
      <span className="pointer-events-none absolute inset-px bg-[radial-gradient(70%_50%_at_100%_0%,color-mix(in_srgb,var(--tone)_12%,transparent),transparent)] [clip-path:var(--chamfer-shape)]" />

      <div className="relative flex items-start gap-4">
        <EventEmblem kind={event.kind} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <span className="flex flex-wrap gap-1.5">
            <EventKindTag kind={event.kind} />
            <PhaseTag phase={event.phase} completed={progress.completed} />
          </span>
          <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">{event.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
            {formatDay(event.startsAt)} → {formatDay(event.endsAt)}
          </p>
        </div>
      </div>
      {event.description && <p className="relative text-sm leading-relaxed text-fg-muted">{event.description}</p>}

      <EventClock event={event} now={now} />

      <Block label="Como funciona">
        <p className="text-sm leading-relaxed text-fg-muted">{eventKindText[event.kind]}</p>
        <dl className="grid grid-cols-2 gap-px border border-line/60 bg-line/60">
          <Fact label="Tentativas" term="Tentativa">
            {event.attemptLimit ? (
              <>
                {attemptLimitText(event.attemptLimit)}
                {event.phase === 'OPEN' && progress.attemptsLeft !== null && <span className="text-fg-subtle"> · restam {progress.attemptsLeft}</span>}
              </>
            ) : (
              'À vontade'
            )}
          </Fact>
          <Fact label="Esquadrão" term="Squad fixo" info={squadModeText[event.squadMode]}>
            {squadModeLabels[event.squadMode]}
          </Fact>
          <Fact label="Campo">{event.fieldKey ? 'Fixo do evento' : 'Sorteado'}</Fact>
          <Fact label="Etapas" term="Etapa">
            {progress.clearedStages}/{progress.totalStages} vencidas
          </Fact>
        </dl>
        {event.kind === 'UNIQUE_BOSS' && !progress.completed && event.phase !== 'ENDED' && (
          <p className="flex items-start gap-2 border border-danger/40 bg-danger-dim px-3 py-2 text-xs text-danger-hover">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            Uma tentativa só. Perdeu ou desistiu, acabou para esta conta.
          </p>
        )}
        {locked.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
              <Lock className="size-3" /> Travados neste evento
            </p>
            <div className="flex flex-wrap gap-2">
              {locked.map((c) => (
                <Link key={c.id} to={`/personagens/${c.id}`} title={c.name} className="focus-ring flex items-center gap-1.5 border border-line/60 bg-surface/60 py-1 pr-2 pl-1 text-xs text-fg hover:border-line-strong">
                  <CharacterPortrait templateKey={c.templateKey} characterClass={c.characterClass} zoom={3.6} className="size-6 rounded-pill bg-bg" iconClassName="size-3.5 text-silver/60" />
                  {c.name.split(' ')[0]}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Block>

      {event.requirements.length > 0 && (
        <Block label="Requisitos do esquadrão" term="Requisitos">
          <ul className="space-y-1.5">
            {event.requirements.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-fg">
                <span className="size-1.5 shrink-0 rotate-45 bg-(--tone)" />
                {requirementText(r, traitName)}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {event.modifiers.length > 0 && (
        <Block label="Regras da batalha" term="Modificadores">
          <ul className="space-y-2">
            {event.modifiers.map((m) => (
              <li key={m.type} className="border border-line/60 bg-surface/50 px-3 py-2">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-silver-bright">{modifierLabels[m.type]}</p>
                <p className="text-xs leading-snug text-fg-muted">{modifierText(m)}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block label="Etapas" term="Etapa">
        <StageTrack event={event} />
      </Block>

      {(event.completionRewards.length > 0 || event.participationRewards.length > 0) && (
        <Block label="Prêmios" term="Prêmios">
          {event.completionRewards.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                <Trophy className="size-3 text-primary-soft" /> Ao concluir
                {progress.completed && <span className="text-success">· recebido</span>}
              </p>
              <RewardList rewards={event.completionRewards} />
            </div>
          )}
          {event.participationRewards.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                <Gift className="size-3 text-primary-soft" /> Por participar (a primeira batalha terminada)
                {progress.participated && <span className="text-success">· recebido</span>}
              </p>
              <RewardList rewards={event.participationRewards} />
            </div>
          )}
        </Block>
      )}

      <div className="relative border-t border-line/70 pt-5">
        {block ? (
          <p className="flex items-center justify-center gap-2 border border-line bg-surface/60 px-3 py-3 font-display text-base font-bold uppercase tracking-[0.1em] text-fg-muted">
            {progress.completed ? <Trophy className="size-4 text-primary-soft" /> : <Lock className="size-4" />}
            {block}
          </p>
        ) : (
          <Button size="lg" className="group w-full" onClick={onPlay}>
            <Swords className="size-5" />
            Jogar {next?.name ?? 'etapa'}
            <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Button>
        )}
        {event.phase === 'OPEN' && progress.attemptsLeft === 0 && event.attemptLimit?.per === 'DAY' && (
          <p className="mt-2 text-center font-mono text-[10px] text-fg-subtle">As tentativas voltam à meia-noite UTC.</p>
        )}
      </div>
    </div>
  )
}

function Fact({ label, term, info, children }: { label: string; term?: string; info?: string; children: ReactNode }) {
  return (
    <div className="bg-bg px-3 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">
        {term ? (
          <Term title={label} info={info ?? eventTermText(term)} className="uppercase">
            {label}
          </Term>
        ) : (
          label
        )}
      </dt>
      <dd className="text-xs text-fg">{children}</dd>
    </div>
  )
}

/** Contagem grande: "Termina em 3d 4h", com o dia e a hora exatos. */
function EventClock({ event, now }: { event: GameEvent; now: number }) {
  const clock = phaseClock(event, now)
  const at = event.phase === 'ANNOUNCED' ? event.startsAt : event.endsAt
  return (
    <div className="relative flex items-end justify-between gap-3 border border-line/60 bg-surface/50 px-4 py-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">{clock.label}</p>
        <p className={cn('font-display text-3xl leading-none font-extrabold italic tabular-nums', event.phase === 'OPEN' ? 'text-(--tone)' : event.phase === 'ANNOUNCED' ? 'text-warning' : 'text-fg-muted')}>
          {clock.value}
        </p>
      </div>
      {event.phase !== 'ENDED' && <p className="font-mono text-[10px] text-fg-subtle">{formatDate(at)}</p>}
    </div>
  )
}

/** As etapas em sequência: vencida, a atual (com o adversário e, na caça, a chance de captura) e as travadas. */
function StageTrack({ event }: { event: GameEvent }) {
  const npcSquads = useNpcSquads()
  const beasts = useBeastRules()
  const { progress } = event

  return (
    <ol className="space-y-2">
      {event.stages.map((stage, i) => {
        const current = progress.nextStage === i
        const npc = npcSquads.data?.find((n) => n.key === stage.npcSquadKey)
        const beast = stage.captureBeastKey ? beasts.data?.beasts.find((b) => b.key === stage.captureBeastKey) : undefined
        return (
          <li
            key={i}
            className={cn(
              'relative flex gap-3 border px-3 py-2.5',
              current ? 'border-(--tone)/60 bg-(--tone)/8' : stage.cleared ? 'border-line/60 bg-surface/40' : 'border-line/40 bg-bg/40',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center border font-mono text-[10px] font-bold',
                stage.cleared ? 'border-success/50 bg-success/10 text-success' : current ? 'border-(--tone) bg-(--tone)/15 text-(--tone)' : 'border-line text-fg-subtle',
              )}
            >
              {stage.cleared ? <Check className="size-3.5" /> : String(i + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn('font-display text-base leading-tight font-bold uppercase tracking-wide', stage.cleared || current ? 'text-silver-bright' : 'text-fg-muted')}>{stage.name}</p>
                <p className="font-mono text-[10px] text-fg-subtle">
                  vs {stage.npcSquadName ?? '—'}
                  {npc && ` · ${difficultyLabels[npc.difficulty]} · ${profileLabels[npc.profile]} · LV ${npc.level}`}
                </p>
              </div>
              {stage.captureBeastKey && (
                <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <Crosshair className="size-3.5 text-beast" />
                  Captura: <b className="text-fg">{beast?.name ?? stage.captureBeastKey}</b>
                  {current && progress.captureChance !== null && (
                    <span className="ml-auto font-mono text-[10px] text-beast tabular-nums">chance {Math.round(progress.captureChance * 100)}%</span>
                  )}
                </p>
              )}
              <RewardList rewards={stage.rewards} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * A pré-batalha do evento: pede ao servidor a da próxima etapa (adversário e campo), mostra as regras e o esquadrão
 * com os avisos dos requisitos e do squad fixo, e começa a batalha (que gasta a tentativa).
 */
function EventDraftDialog({ event, onClose }: { event: GameEvent; onClose: () => void }) {
  const navigate = useNavigate()
  const createDraft = useEventDraft()
  const start = useStartBattle()
  const templates = useTemplates()
  const traits = useTraits()
  const [squadId, setSquadId] = useState<string | null>(null)
  const draft = createDraft.data

  // a pré-batalha sai ao abrir (uma vez, mesmo com o efeito dobrado do StrictMode); reabrir pede uma nova
  const { mutate } = createDraft
  const requested = useRef(false)
  useEffect(() => {
    if (requested.current) return
    requested.current = true
    mutate(event.key)
  }, [mutate, event.key])

  const templateMap = useMemo(() => new Map(templates.data?.map((t) => [t.key, t])), [templates.data])
  const traitName = (key: string) => traits.data?.find((t) => t.key === key)?.name ?? key
  const locked = event.progress.lockedCharacterIds

  const assess: SquadAssessment = (squad, members) => {
    const issues: string[] = []
    if (!matchesLockedSquad(squad.members.map((m) => m.characterId), locked)) issues.push('não é o squad travado')
    for (const { requirement, met } of checkRequirements(event.requirements, members, templateMap)) {
      if (met === false) issues.push(requirementMissText(requirement, traitName))
    }
    return issues
  }

  function close() {
    if (start.isPending) return
    onClose()
  }

  function begin() {
    if (!draft || !squadId) return
    start.mutate({ draftId: draft.id, squadId }, { onSuccess: (step) => navigate(`/batalha/${step.battle.id}`) })
  }

  const startError = start.isError
    ? httpStatus(start.error) === 404
      ? 'A pré-batalha expirou ou já foi usada. Feche e jogue de novo.'
      : apiErrorMessage(start.error)
    : null

  return (
    <Dialog
      open
      onClose={close}
      eyebrow={draft ? `${event.name} · ${draft.event.stageName}` : event.name}
      title={draft ? `vs ${draft.opponent.name}` : 'Pré-batalha'}
      footer={
        draft && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {startError && <p className="mr-auto text-sm text-danger">{startError}</p>}
            {!startError && !squadId && <p className="mr-auto font-mono text-[11px] text-fg-muted">Escolha um esquadrão para entrar.</p>}
            <p className="font-mono text-[11px] text-fg-subtle">{event.attemptLimit ? 'Entrar gasta 1 tentativa.' : 'A pré-batalha vale 30 minutos.'}</p>
            <Button size="lg" onClick={begin} disabled={!squadId || start.isPending} className="group">
              <Swords className="size-5" />
              {start.isPending ? 'Entrando...' : `Enfrentar ${draft.opponent.name}`}
              <ChevronRight className="size-5 transition-transform group-enabled:group-hover:translate-x-1" />
            </Button>
          </div>
        )
      }
    >
      {createDraft.isError ? (
        <div className="space-y-4 py-6 text-center">
          <p className="text-sm text-danger">{apiErrorMessage(createDraft.error)}</p>
          <Button variant="secondary" size="sm" onClick={() => mutate(event.key)}>
            Tentar de novo
          </Button>
        </div>
      ) : !draft ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <Loader2 className="size-6 animate-spin text-primary-soft" />
          <p className="animate-pulse font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">Preparando a etapa...</p>
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-center gap-3 border border-line/60 bg-surface/50 px-4 py-3">
            <EventEmblem kind={event.kind} size="xs" />
            <p className="min-w-0 flex-1 text-sm text-fg-muted">
              <b className="text-fg">{draft.opponent.name}</b> · {difficultyLabels[draft.opponent.difficulty]} · {profileLabels[draft.opponent.profile]}
            </p>
            {draft.event.modifiers.map((m) => (
              <Badge key={m.type} tone="warning">
                <span title={modifierText(m)}>{modifierLabels[m.type]}</span>
              </Badge>
            ))}
          </section>
          <FieldSection draft={draft} title={event.fieldKey ? 'Campo do evento' : 'Campo sorteado'} />
          <SquadSection
            draft={draft}
            squadId={squadId}
            onSelect={setSquadId}
            assess={assess}
            intro={
              (event.squadMode === 'FIXED' || event.requirements.length > 0) && (
                <p className="flex items-start gap-2 text-xs text-fg-muted">
                  <Users className="mt-px size-3.5 shrink-0 text-primary-soft" />
                  {locked
                    ? 'Squad fixo: só entram os 4 personagens da primeira batalha (a posição pode mudar).'
                    : event.squadMode === 'FIXED'
                      ? 'Squad fixo: os 4 personagens desta batalha ficam travados até o fim do evento.'
                      : null}{' '}
                  {event.requirements.length > 0 && 'Os avisos em vermelho são os requisitos que o esquadrão não cumpre.'}
                </p>
              )
            }
          />
        </>
      )}
    </Dialog>
  )
}

/**
 * Caixa de recompensas: equipamento e besta que não couberam no inventário. Retirar pede espaço; descartar some sem
 * moeda; depois do prazo, some sozinho.
 */
function RewardBox({ rewards, now }: { rewards: PendingReward[]; now: number }) {
  const gear = useGear()
  const inventory = gear.data?.inventory
  const full = !!inventory && inventory.used >= inventory.slots
  const sorted = [...rewards].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))

  return (
    <section id="caixa" className="scroll-mt-6 space-y-4">
      <SectionTitle
        actions={
          inventory && (
            <span className={cn('font-mono text-[10px] uppercase tracking-[0.16em]', full ? 'text-warning' : 'text-fg-subtle')}>
              Inventário {inventory.used}/{inventory.slots}
            </span>
          )
        }
      >
        <Term title="Caixa de recompensas" info={eventTermText('Caixa de recompensas')}>
          Caixa de recompensas
        </Term>
      </SectionTitle>
      <div className="chamfer space-y-3 p-4 [--chamfer-bg:color-mix(in_srgb,var(--color-warning)_5%,var(--color-surface))] [--chamfer-border:color-mix(in_srgb,var(--color-warning)_40%,transparent)] [--cut:14px]">
        <p className="flex items-start gap-2 text-sm text-fg-muted">
          <Inbox className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            Não couberam no inventário. {full ? 'Abra espaço vendendo no ' : 'Retire antes do prazo, ou abra espaço no '}
            <Link to="/arsenal" className="text-fg underline-offset-2 hover:underline">
              Arsenal
            </Link>{' '}
            ou em{' '}
            <Link to="/bestas" className="text-fg underline-offset-2 hover:underline">
              Bestas
            </Link>
            .
          </span>
        </p>
        <ul className="space-y-2">
          {sorted.map((r) => (
            <RewardBoxRow key={r.id} reward={r} now={now} full={full} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function RewardBoxRow({ reward, now, full }: { reward: PendingReward; now: number; full: boolean }) {
  const claim = useClaimReward()
  const discard = useDiscardReward()
  const [confirming, setConfirming] = useState(false)
  const left = new Date(reward.expiresAt).getTime() - now
  const busy = claim.isPending || discard.isPending

  return (
    <li className="flex flex-wrap items-center gap-3 border border-line/60 bg-bg/60 px-3 py-2.5">
      <RewardChip reward={reward.reward} />
      <span className={cn('font-mono text-[10px]', left < BOX_WARNING_MS ? 'text-warning' : 'text-fg-subtle')} title={formatDate(reward.expiresAt)}>
        some em {formatDuration(left)}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-xs text-danger-hover">Descartar de vez?</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
              Não
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() =>
                discard.mutate(reward.id, {
                  onSuccess: () => toast.success('Descartado'),
                  onError: (e) => toast.error('Não foi possível descartar', apiErrorMessage(e)),
                })
              }
            >
              <Trash2 className="size-4" /> Descartar
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} disabled={busy} aria-label="Descartar">
              <Trash2 className="size-4" />
            </Button>
            <Button
              size="sm"
              disabled={busy || full}
              title={full ? 'Inventário cheio' : undefined}
              onClick={() =>
                claim.mutate(reward.id, {
                  onSuccess: () => toast.success('Retirado', 'Já está no inventário.'),
                  onError: (e) => toast.error('Não foi possível retirar', apiErrorMessage(e)),
                })
              }
            >
              {claim.isPending ? <Loader2 className="size-4 animate-spin" /> : <Inbox className="size-4" />} Retirar
            </Button>
          </>
        )}
      </span>
    </li>
  )
}

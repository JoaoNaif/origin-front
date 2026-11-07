import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { AlertTriangle, Check, ChevronRight, Crosshair, Flame, Mountain, Play, Scale, Shield, Swords, Users, type LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Page, SectionTitle } from '@/components/layout/page'
import { BannerMeta, PageBanner } from '@/components/layout/page-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { Dialog } from '@/components/ui/dialog'
import { useCreateDraft, useNpcSquads, useStartBattle, type BattleDraft, type NpcSquad } from '@/features/battle/battle-api'
import { classIcons } from '@/features/game/class-icons'
import {
  difficultyLabels,
  useBattles,
  useCharacters,
  useSquads,
  useTraits,
  type AiDifficulty,
  type AiProfile,
  type Character,
  type Squad,
} from '@/features/game/game-api'
import { profileLabels, statLabels } from '@/features/game/game-labels'
import { statInfo } from '@/features/game/glossary'
import { Term } from '@/components/ui/term'
import { apiErrorMessage, httpStatus } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Arte do topo (public/art). Sem o arquivo, fica só o fundo. */
const PLAY_ART = '/art/banner-explosao.jpg'

const difficultyOrder: AiDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER', 'GRANDMASTER']

/** Ícone do estilo da IA (o perfil do adversário). */
const profileIcons: Record<AiProfile, LucideIcon> = {
  AGGRESSIVE: Flame,
  CAUTIOUS: Shield,
  FINISHER: Crosshair,
  BALANCED: Scale,
}

const hasFullBuild = (c: Character) => c.skills.filter((s) => s.buildSlot).length === 4

/** O vermelho esquenta com a dificuldade: mais forte e mais brilhante a cada nível. */
const heat = (level: number) => `color-mix(in srgb, var(--color-danger) ${40 + level * 15}%, var(--color-line-strong))`

/**
 * Batalhar contra a máquina (api.md, "Fluxo de uma partida"): escolhe o adversário, o servidor sorteia o campo
 * (D28) e mostra antes da escolha do esquadrão; depois começa a batalha.
 */
export function PlayPage() {
  const navigate = useNavigate()
  const npcSquads = useNpcSquads()
  const battles = useBattles()
  const createDraft = useCreateDraft()
  const start = useStartBattle()
  const [squadId, setSquadId] = useState<string | null>(null)

  const draft = createDraft.data
  const inProgress = battles.data?.find((b) => b.status === 'IN_PROGRESS')

  function chooseOpponent(npc: NpcSquad) {
    start.reset()
    createDraft.mutate(npc.key)
  }

  function closeDraft() {
    if (start.isPending) return
    createDraft.reset()
    start.reset()
  }

  function begin() {
    if (!draft || !squadId) return
    start.mutate({ draftId: draft.id, squadId }, { onSuccess: (step) => navigate(`/batalha/${step.battle.id}`) })
  }

  const startError = start.isError
    ? httpStatus(start.error) === 404
      ? 'A pré-batalha expirou ou já foi usada. Escolha o adversário de novo.'
      : apiErrorMessage(start.error)
    : null

  return (
    <div className="pb-12">
      <PageBanner
        art={PLAY_ART}
        tutorial="batalhar"
        outlineWord="Combate"
        meta={
          <>
            <Badge tone="primary">
              <Swords className="size-3" />
              Contra a máquina
            </Badge>
            <BannerMeta>PvE · campo sorteado</BannerMeta>
          </>
        }
        title={
          <>
            Bata
            <span className="text-gradient-primary pr-3">lhar</span>
          </>
        }
        description="Escolha o adversário, veja o campo sorteado e entre com o esquadrão certo."
      />

      <Page className="pt-10 lg:pt-10">
        {inProgress && (
          <Link
            to={`/batalha/${inProgress.id}`}
            className="focus-ring chamfer group relative flex items-center gap-4 overflow-hidden p-4 [--chamfer-bg:rgb(59_40_10/0.85)] [--chamfer-border:rgb(245_165_36/0.45)] [--cut:14px] transition-transform duration-300 ease-out-soft hover:-translate-y-0.5 hover:[--chamfer-border:rgb(245_165_36/0.85)]"
          >
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-linear-to-r from-warning/15 to-transparent transition-transform duration-500 ease-out-soft group-hover:translate-x-0" />
            <span className="relative flex size-11 shrink-0 items-center justify-center">
              <span className="absolute inset-1.5 rotate-45 border border-warning/60 bg-warning/10 transition-transform duration-300 group-hover:rotate-135" />
              <Play className="relative size-4 text-warning" />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warning">
                <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-pill bg-warning align-middle" />
                Batalha em andamento
              </p>
              <p className="truncate font-display text-xl font-bold uppercase tracking-wide text-fg">vs {inProgress.opponent.name}</p>
            </div>
            <span className="relative font-display text-sm font-bold uppercase tracking-[0.12em] text-warning">Retomar</span>
            <ChevronRight className="relative size-4 text-warning transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        {/* 01 Adversário */}
        <section className="space-y-5">
          <SectionTitle
            index="01"
            actions={<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Clique para sortear o campo</span>}
          >
            Adversário
          </SectionTitle>
          {npcSquads.isPending ? (
            <div className="h-64 animate-pulse bg-raised" />
          ) : npcSquads.isError ? (
            <p className="text-sm text-danger">Não foi possível carregar os adversários.</p>
          ) : (
            <div className="space-y-3">
              {difficultyOrder.map((difficulty, level) => {
                const squads = npcSquads.data.filter((n) => n.difficulty === difficulty)
                if (!squads.length) return null
                return (
                  <TierRow key={difficulty} difficulty={difficulty} level={level} maxLevel={Math.max(...squads.map((s) => s.level))}>
                    {squads.map((npc) => (
                      <li key={npc.key}>
                        <OpponentCard
                          npc={npc}
                          level={level}
                          loading={createDraft.isPending && createDraft.variables === npc.key}
                          active={createDraft.variables === npc.key && !createDraft.isError && !!draft}
                          disabled={createDraft.isPending}
                          onClick={() => chooseOpponent(npc)}
                        />
                      </li>
                    ))}
                  </TierRow>
                )
              })}
              {createDraft.isError && <p className="text-sm text-danger">{apiErrorMessage(createDraft.error)}</p>}
            </div>
          )}
        </section>

        {/* Campo + Esquadrão: modal depois do sorteio */}
        <Dialog
          open={createDraft.isPending || !!draft}
          onClose={closeDraft}
          eyebrow={draft ? `${difficultyLabels[draft.opponent.difficulty]} · ${profileLabels[draft.opponent.profile]}` : 'Sorteando o campo...'}
          title={draft ? `vs ${draft.opponent.name}` : 'Pré-batalha'}
          footer={
            draft && (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {startError && <p className="mr-auto text-sm text-danger">{startError}</p>}
                {!startError && !squadId && <p className="mr-auto font-mono text-[11px] text-fg-muted">Escolha um esquadrão para entrar.</p>}
                <p className="font-mono text-[11px] text-fg-subtle">A pré-batalha vale 30 minutos.</p>
                <Button size="lg" onClick={begin} disabled={!squadId || start.isPending} className="group">
                  <Swords className="size-5" />
                  {start.isPending ? 'Entrando...' : `Enfrentar ${draft.opponent.name}`}
                  <ChevronRight className="size-5 transition-transform group-enabled:group-hover:translate-x-1" />
                </Button>
              </div>
            )
          }
        >
          {draft && !createDraft.isPending ? (
            <>
              <FieldSection draft={draft} />
              <SquadSection draft={draft} squadId={squadId} onSelect={setSquadId} />
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-10">
              <span className="relative flex size-16 items-center justify-center">
                <span className="absolute inset-2 rotate-45 border border-warning/60 motion-safe:animate-spin [animation-duration:2.5s]" />
                <Mountain className="relative size-6 text-warning" />
              </span>
              <p className="animate-pulse font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">Sorteando o campo...</p>
            </div>
          )}
        </Dialog>
      </Page>
    </div>
  )
}

/** Faixa de uma dificuldade: a placa à esquerda (traços, nome, nível e o número vazado) e os adversários. */
function TierRow({ difficulty, level, maxLevel, children }: { difficulty: AiDifficulty; level: number; maxLevel: number; children: ReactNode }) {
  return (
    <div style={{ '--heat': heat(level) } as CSSProperties} className="group/tier grid gap-3 lg:grid-cols-[11rem_1fr]">
      <div className="chamfer relative flex items-center gap-3 overflow-hidden px-4 py-3 [--cut:12px] [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--heat)_35%,var(--color-line))] transition-all duration-300 group-hover/tier:[--chamfer-border:var(--heat)] lg:flex-col lg:items-start lg:justify-center lg:gap-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 w-0.75 bg-(--heat) opacity-60 transition-opacity group-hover/tier:opacity-100 group-hover/tier:shadow-[0_0_10px_var(--heat)]" />
        <span className="pointer-events-none absolute -right-1 -bottom-5 font-display text-7xl leading-none font-extrabold italic text-outline opacity-70 select-none">
          {String(level + 1).padStart(2, '0')}
        </span>
        <span className="relative flex gap-0.5" aria-hidden>
          {difficultyOrder.map((_, j) => (
            <span key={j} className={cn('h-3 w-1 -skew-x-12 transition-all duration-300', j <= level ? 'bg-(--heat)' : 'bg-overlay')} style={j <= level ? { transitionDelay: `${j * 40}ms` } : undefined} />
          ))}
        </span>
        <p className="relative font-display text-xl leading-tight font-extrabold uppercase italic text-fg transition-colors group-hover/tier:text-silver-bright">
          {difficultyLabels[difficulty]}
        </p>
        <p className="relative font-mono text-[10px] text-fg-subtle">LV {maxLevel}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">{children}</ul>
    </div>
  )
}

/** Cartão de adversário: no hover, a mira vermelha fecha sobre ele e o "Enfrentar" aparece. */
function OpponentCard({ npc, level, loading, active, disabled, onClick }: {
  npc: NpcSquad
  level: number
  loading: boolean
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  const ProfileIcon = profileIcons[npc.profile]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={npc.description}
      style={{ '--heat': heat(level) } as CSSProperties}
      className={cn(
        'focus-ring chamfer group relative flex h-24 w-full flex-col justify-between overflow-hidden p-3 text-left [--cut:12px]',
        'transition-all duration-200 ease-out-soft enabled:hover:-translate-y-1',
        active || loading
          ? '[--chamfer-bg:rgb(59_21_23/0.9)] [--chamfer-border:var(--color-danger-hover)] drop-shadow-[0_0_14px_rgb(229_72_77/0.35)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] enabled:hover:[--chamfer-bg:color-mix(in_srgb,var(--color-danger)_6%,var(--color-surface))] enabled:hover:[--chamfer-border:color-mix(in_srgb,var(--heat)_80%,transparent)]',
        'disabled:opacity-60',
      )}
    >
      {/* luz vermelha que entra pela direita (o lado do inimigo) e o ícone grande ao fundo */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-2/3 translate-x-full bg-linear-to-l from-danger/15 to-transparent transition-transform duration-500 ease-out-soft group-hover:translate-x-0" />
      <ProfileIcon className="pointer-events-none absolute -right-3 -bottom-4 size-20 -rotate-12 text-danger opacity-[0.04] transition-all duration-500 ease-out-soft group-hover:-rotate-3 group-hover:opacity-[0.1]" />
      {/* mira: os 4 cantos fecham sobre o cartão */}
      <span
        className={cn(
          'hud-corners pointer-events-none absolute inset-2 [--hud-color:var(--color-danger-hover)] [--hud-size:10px] transition-all duration-300 ease-out-soft',
          loading ? 'inset-1.5 opacity-100 motion-safe:animate-pulse' : 'scale-110 opacity-0 group-hover:scale-100 group-hover:opacity-100',
        )}
      />

      <span className="relative flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-fg-subtle transition-colors group-hover:text-danger-hover">
          <ProfileIcon className="size-3.5 shrink-0" />
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em]">{profileLabels[npc.profile]}</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] text-fg-muted">LV {npc.level}</span>
      </span>

      <span className="relative flex items-end justify-between gap-2">
        <span className="truncate font-display text-xl leading-none font-extrabold uppercase italic text-fg transition-colors group-hover:text-silver-bright">
          {npc.name}
        </span>
        <span
          className={cn(
            'flex shrink-0 items-center gap-0.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-danger-hover transition-all duration-200',
            loading ? 'opacity-100' : 'translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
          )}
        >
          {loading ? 'Sorteando' : 'Enfrentar'}
          <ChevronRight className="size-3.5" />
        </span>
      </span>
    </button>
  )
}

function FieldSection({ draft }: { draft: BattleDraft }) {
  const traits = useTraits()
  const characters = useCharacters()
  const field = draft.field
  const traitName = (key: string) => traits.data?.find((t) => t.key === key)?.name ?? key
  const withBonus = field ? (characters.data ?? []).filter((c) => c.traitKeys.some((k) => field.requiredTraitKeys.includes(k))) : []

  return (
    <section className="space-y-5">
      <SectionTitle index="01">Campo sorteado</SectionTitle>
      <div className="chamfer relative overflow-hidden p-5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--color-warning)_40%,var(--color-line))] [--cut:18px]">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_0%_0%,color-mix(in_srgb,var(--color-warning)_14%,transparent),transparent)]" />
        <span className="pointer-events-none absolute inset-0 scanlines" />
        <Mountain className="pointer-events-none absolute -right-6 -bottom-8 size-40 text-warning opacity-[0.05]" />

        <div className="relative flex flex-wrap items-center gap-5">
          <span className="relative flex size-14 shrink-0 items-center justify-center">
            <span className="absolute inset-2 rotate-45 border border-warning/60 bg-warning/10 shadow-[0_0_18px_-4px_var(--color-warning)]" />
            <Mountain className="relative size-5 text-warning" />
          </span>

          {field ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warning">Campo</p>
                <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">{field.name}</p>
              </div>
              {/* os dois bônus em destaque */}
              <div className="flex gap-2">
                {[
                  { percent: field.primaryPercent, stat: field.primaryStat },
                  { percent: field.secondaryPercent, stat: field.secondaryStat },
                ].map(({ percent, stat }) => (
                  <div key={stat} className="border border-warning/30 bg-bg/60 px-3 py-2 text-center">
                    <p className="font-display text-2xl leading-none font-extrabold italic text-warning tabular-nums">+{percent}%</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
                      <Term title={statLabels[stat]} info={statInfo[stat]}>
                        {statLabels[stat]}
                      </Term>
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">Sem campo</p>
              <p className="mt-1 text-sm text-fg-muted">Nenhum bônus de campo nesta batalha.</p>
            </div>
          )}
        </div>

        {field && (
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Ganha o bônus quem tem um destes traços</p>
              <div className="flex flex-wrap gap-1.5">
                {field.requiredTraitKeys.map((key) => (
                  <Badge key={key} tone="warning">
                    {traitName(key)}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="flex items-center gap-2 font-mono text-[11px] text-fg-muted" title={withBonus.map((c) => c.name).join(', ')}>
              <Users className="size-3.5 text-warning" />
              <span className="font-display text-lg font-extrabold italic text-warning">{withBonus.length}</span>
              {withBonus.length === 1 ? 'do seu elenco ganha' : 'do seu elenco ganham'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function SquadSection({ draft, squadId, onSelect }: { draft: BattleDraft; squadId: string | null; onSelect: (id: string) => void }) {
  const squads = useSquads()
  const characters = useCharacters()
  const byId = useMemo(() => new Map(characters.data?.map((c) => [c.id, c])), [characters.data])
  const required = new Set(draft.field?.requiredTraitKeys ?? [])

  return (
    <section className="space-y-5">
      <SectionTitle index="02">Esquadrão</SectionTitle>
      {squads.isPending || characters.isPending ? (
        <div className="h-40 animate-pulse bg-raised" />
      ) : !squads.data?.length ? (
        <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-12 text-center">
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-fg">Nenhum esquadrão</p>
          <p className="text-sm text-fg-muted">Monte uma formação antes de batalhar.</p>
          <Link to="/esquadroes?id=novo" className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'mt-2' })}>
            Montar esquadrão
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {squads.data.map((squad) => (
            <li key={squad.id}>
              <SquadOption squad={squad} byId={byId} required={required} active={squad.id === squadId} onSelect={() => onSelect(squad.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SquadOption({ squad, byId, required, active, onSelect }: {
  squad: Squad
  byId: Map<string, Character>
  required: Set<string>
  active: boolean
  onSelect: () => void
}) {
  const members = squad.members.map((m) => ({ ...m, character: byId.get(m.characterId) }))
  const incomplete = members.filter((m) => m.character && !hasFullBuild(m.character))
  const gainsBonus = (c?: Character) => !!c?.traitKeys.some((k) => required.has(k))
  const bonus = members.filter((m) => gainsBonus(m.character))
  const cells = new Map(members.map((m) => [`${m.row}:${m.column}`, m.character]))

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'focus-ring chamfer group relative flex w-full gap-4 overflow-hidden p-4 text-left [--cut:14px] transition-all duration-200 ease-out-soft',
        active
          ? '-translate-y-0.5 [--chamfer-bg:rgb(34_26_61/0.9)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_0_16px_rgb(139_92_246/0.4)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:-translate-y-0.5 hover:[--chamfer-bg:var(--color-raised)] hover:[--chamfer-border:rgb(167_139_250/0.45)]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-linear-to-r from-primary/12 to-transparent transition-transform duration-500 ease-out-soft',
          active ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0',
        )}
      />

      {/* Formação (frente à direita); quem ganha o bônus do campo fica em laranja */}
      <span className="relative grid shrink-0 grid-cols-3 gap-1 self-center" aria-hidden>
        {[0, 1, 2].flatMap((row) =>
          [2, 1, 0].map((column) => {
            const character = cells.get(`${row}:${column}`)
            const Icon = character ? classIcons[character.characterClass] : null
            const lit = gainsBonus(character)
            return (
              <span
                key={`${row}:${column}`}
                className={cn(
                  'flex size-8 items-center justify-center border transition-all duration-200',
                  character
                    ? lit
                      ? 'border-warning/70 bg-warning/15 shadow-[0_0_10px_-3px_var(--color-warning)]'
                      : cn('border-primary-soft/50 bg-primary/15', active ? 'bg-primary/25' : 'group-hover:bg-primary/25')
                    : 'border-silver/10 bg-bg/30',
                )}
              >
                {Icon && <Icon className={cn('size-4', lit ? 'text-warning' : 'text-silver-bright')} />}
              </span>
            )
          }),
        )}
      </span>

      <span className="relative min-w-0 flex-1 space-y-1.5">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate font-display text-2xl leading-tight font-extrabold uppercase italic text-silver-bright">{squad.name}</span>
          {/* indicador de escolha */}
          <span
            className={cn(
              'mt-1 flex size-5 shrink-0 items-center justify-center border transition-all duration-200',
              active ? 'border-primary-soft bg-primary text-on-primary' : 'border-line-strong text-transparent group-hover:border-primary-soft/60',
            )}
          >
            <Check className="size-3.5" />
          </span>
        </span>
        <span className="block truncate text-xs text-fg-muted">{members.map((m) => m.character?.name.split(' ')[0] ?? '?').join(' · ')}</span>
        <span className="flex flex-wrap gap-1.5">
          {bonus.length > 0 && <Badge tone="warning">{bonus.length} com bônus do campo</Badge>}
          {incomplete.length > 0 && (
            <Badge tone="danger">
              <AlertTriangle className="size-3" /> {incomplete.length} sem build completa
            </Badge>
          )}
          {bonus.length === 0 && incomplete.length === 0 && <span className="font-mono text-[10px] text-fg-subtle">Sem bônus do campo</span>}
        </span>
      </span>
    </button>
  )
}

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, Mountain, Play, Swords } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Page, PageHeader, SectionTitle } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { useCreateDraft, useNpcSquads, useStartBattle, type BattleDraft, type NpcSquad } from '@/features/battle/battle-api'
import { classIcons } from '@/features/game/class-icons'
import {
  difficultyLabels,
  useBattles,
  useCharacters,
  useSquads,
  useTraits,
  type AiDifficulty,
  type Character,
  type Squad,
} from '@/features/game/game-api'
import { profileLabels, statLabels } from '@/features/game/game-labels'
import { apiErrorMessage, httpStatus } from '@/lib/api'
import { cn } from '@/lib/cn'

const difficultyOrder: AiDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MASTER', 'GRANDMASTER']

const hasFullBuild = (c: Character) => c.skills.filter((s) => s.buildSlot).length === 4

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
    <Page>
      <PageHeader eyebrow="Contra a máquina" title="Batalhar" description="Escolha o adversário, veja o campo sorteado e entre com o esquadrão certo." />

      {inProgress && (
        <Link
          to={`/batalha/${inProgress.id}`}
          className="focus-ring chamfer group flex items-center gap-4 p-4 [--chamfer-bg:rgb(59_40_10/0.85)] [--chamfer-border:rgb(245_165_36/0.45)] [--cut:14px] hover:[--chamfer-border:rgb(245_165_36/0.8)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center border border-warning/40 text-warning">
            <Play className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warning">Batalha em andamento</p>
            <p className="truncate font-display text-xl font-bold uppercase tracking-wide text-fg">vs {inProgress.opponent.name}</p>
          </div>
          <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-warning">Retomar</span>
          <ChevronRight className="size-4 text-warning transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* 01 Adversário */}
      <section className="space-y-5">
        <SectionTitle index="01">Adversário</SectionTitle>
        {npcSquads.isPending ? (
          <div className="h-64 animate-pulse bg-raised" />
        ) : npcSquads.isError ? (
          <p className="text-sm text-danger">Não foi possível carregar os adversários.</p>
        ) : (
          <div className="space-y-5">
            {difficultyOrder.map((difficulty, i) => {
              const squads = npcSquads.data.filter((n) => n.difficulty === difficulty)
              if (!squads.length) return null
              return (
                <div key={difficulty} className="grid gap-3 lg:grid-cols-[10rem_1fr]">
                  <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-1">
                    <span className="flex gap-0.5" aria-hidden>
                      {difficultyOrder.map((_, j) => (
                        <span key={j} className={cn('h-3 w-1 -skew-x-12', j <= i ? 'bg-danger-hover' : 'bg-overlay')} />
                      ))}
                    </span>
                    <p className="font-display text-lg font-bold uppercase tracking-wide text-fg">{difficultyLabels[difficulty]}</p>
                    <p className="font-mono text-[10px] text-fg-subtle">LV {Math.max(...squads.map((s) => s.level))}</p>
                  </div>
                  <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {squads.map((npc) => {
                      const active = createDraft.variables === npc.key && !createDraft.isError
                      return (
                        <li key={npc.key}>
                          <button
                            type="button"
                            onClick={() => chooseOpponent(npc)}
                            disabled={createDraft.isPending}
                            aria-pressed={active}
                            className={cn(
                              'focus-ring chamfer flex h-20 w-full flex-col justify-between p-3 text-left [--cut:10px] transition-all duration-150 ease-out-soft',
                              active
                                ? '[--chamfer-bg:rgb(59_21_23/0.9)] [--chamfer-border:var(--color-danger-hover)] drop-shadow-[0_0_14px_rgb(229_72_77/0.35)]'
                                : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:rgb(229_72_77/0.5)]',
                              'disabled:opacity-60',
                            )}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                                {profileLabels[npc.profile]}
                              </span>
                              <span className="shrink-0 font-mono text-[10px] text-fg-muted">LV {npc.level}</span>
                            </span>
                            <span className="truncate font-display text-lg leading-none font-bold uppercase tracking-wide text-fg">{npc.name}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
            {createDraft.isError && <p className="text-sm text-danger">{apiErrorMessage(createDraft.error)}</p>}
          </div>
        )}
      </section>

      {/* 02 Campo + 03 Esquadrão: depois do sorteio */}
      {createDraft.isPending && <div className="h-40 animate-pulse bg-raised" />}
      {draft && !createDraft.isPending && (
        <>
          <FieldSection draft={draft} />
          <SquadSection draft={draft} squadId={squadId} onSelect={setSquadId} />

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
            {startError && <p className="mr-auto text-sm text-danger">{startError}</p>}
            <p className="font-mono text-[11px] text-fg-subtle">A pré-batalha vale 30 minutos.</p>
            <Button size="lg" onClick={begin} disabled={!squadId || start.isPending}>
              <Swords className="size-5" />
              {start.isPending ? 'Entrando...' : `Enfrentar ${draft.opponent.name}`}
            </Button>
          </div>
        </>
      )}
    </Page>
  )
}

function FieldSection({ draft }: { draft: BattleDraft }) {
  const traits = useTraits()
  const field = draft.field
  const traitName = (key: string) => traits.data?.find((t) => t.key === key)?.name ?? key

  return (
    <section className="space-y-5">
      <SectionTitle index="02">Campo sorteado</SectionTitle>
      <div className="hud-corners flex flex-wrap items-center gap-6 border border-line/60 bg-surface/60 p-5 [--hud-color:var(--color-warning)]">
        <span className="flex size-12 items-center justify-center border border-warning/40 text-warning">
          <Mountain className="size-6" />
        </span>
        {field ? (
          <>
            <div className="min-w-0">
              <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">{field.name}</p>
              <p className="mt-1 font-mono text-xs text-fg-muted">
                +{field.primaryPercent}% {statLabels[field.primaryStat]} · +{field.secondaryPercent}% {statLabels[field.secondaryStat]}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Ganha o bônus quem tem um destes traços</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {field.requiredTraitKeys.map((key) => (
                  <Badge key={key} tone="warning">
                    {traitName(key)}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <p className="font-display text-3xl leading-none font-extrabold uppercase italic text-silver-bright">Sem campo</p>
            <p className="mt-1 text-sm text-fg-muted">Nenhum bônus de campo nesta batalha.</p>
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
      <SectionTitle index="03">Esquadrão</SectionTitle>
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
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
  const bonus = members.filter((m) => m.character?.traitKeys.some((k) => required.has(k)))
  const cells = new Map(members.map((m) => [`${m.row}:${m.column}`, m.character]))

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'focus-ring chamfer flex w-full gap-4 p-4 text-left [--cut:14px] transition-all duration-150 ease-out-soft',
        active
          ? '[--chamfer-bg:rgb(34_26_61/0.9)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_0_16px_rgb(139_92_246/0.35)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:var(--color-line-strong)]',
      )}
    >
      {/* Formação (frente à direita) */}
      <span className="grid shrink-0 grid-cols-3 gap-1 self-center" aria-hidden>
        {[0, 1, 2].flatMap((row) =>
          [2, 1, 0].map((column) => {
            const character = cells.get(`${row}:${column}`)
            const Icon = character ? classIcons[character.characterClass] : null
            return (
              <span key={`${row}:${column}`} className={cn('flex size-7 items-center justify-center border', character ? 'border-primary-soft/50 bg-primary/15' : 'border-silver/10')}>
                {Icon && <Icon className="size-3.5 text-silver-bright" />}
              </span>
            )
          }),
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block truncate font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{squad.name}</span>
        <span className="block truncate text-xs text-fg-muted">{members.map((m) => m.character?.name.split(' ')[0] ?? '?').join(' · ')}</span>
        <span className="flex flex-wrap gap-1.5">
          {bonus.length > 0 && <Badge tone="warning">{bonus.length} com bônus do campo</Badge>}
          {incomplete.length > 0 && (
            <Badge tone="danger">
              <AlertTriangle className="size-3" /> {incomplete.length} sem build completa
            </Badge>
          )}
        </span>
      </span>
    </button>
  )
}

import { useMemo, type ReactNode } from 'react'
import { AlertTriangle, Check, Mountain, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionTitle } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { buttonClasses } from '@/components/ui/button-classes'
import { Term } from '@/components/ui/term'
import type { BattleDraft } from '@/features/battle/battle-api'
import { classIcons } from '@/features/game/class-icons'
import { useCharacters, useSquads, useTraits, type Character, type Squad } from '@/features/game/game-api'
import { statLabels } from '@/features/game/game-labels'
import { statInfo } from '@/features/game/glossary'
import { cn } from '@/lib/cn'

// O miolo da pré-batalha (modal de Batalhar e de Eventos): o campo da batalha e a escolha do esquadrão.

const hasFullBuild = (c: Character) => c.skills.filter((s) => s.buildSlot).length === 4

/** O campo da batalha: o nome, os dois bônus e quem do elenco ganha. */
export function FieldSection({ draft, index = '01', title = 'Campo sorteado' }: { draft: BattleDraft; index?: string; title?: string }) {
  const traits = useTraits()
  const characters = useCharacters()
  const field = draft.field
  const traitName = (key: string) => traits.data?.find((t) => t.key === key)?.name ?? key
  const withBonus = field ? (characters.data ?? []).filter((c) => c.traitKeys.some((k) => field.requiredTraitKeys.includes(k))) : []

  return (
    <section className="space-y-5">
      <SectionTitle index={index}>{title}</SectionTitle>
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

/** O que impede (ou pode impedir) um esquadrão de entrar: texto curto para a etiqueta. Vazio = livre. */
export type SquadAssessment = (squad: Squad, members: Character[]) => string[]

/**
 * A escolha do esquadrão: a formação com quem ganha o bônus do campo e os avisos (build incompleta e, no evento, os
 * requisitos e o squad fixo via `assess`, só para orientar: quem confere é o servidor).
 */
export function SquadSection({ draft, squadId, onSelect, assess, index = '02', intro }: {
  draft: BattleDraft
  squadId: string | null
  onSelect: (id: string) => void
  assess?: SquadAssessment
  index?: string
  intro?: ReactNode
}) {
  const squads = useSquads()
  const characters = useCharacters()
  const byId = useMemo(() => new Map(characters.data?.map((c) => [c.id, c])), [characters.data])
  const required = new Set(draft.field?.requiredTraitKeys ?? [])

  return (
    <section className="space-y-5">
      <SectionTitle index={index}>Esquadrão</SectionTitle>
      {intro}
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
              <SquadOption squad={squad} byId={byId} required={required} assess={assess} active={squad.id === squadId} onSelect={() => onSelect(squad.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SquadOption({ squad, byId, required, assess, active, onSelect }: {
  squad: Squad
  byId: Map<string, Character>
  required: Set<string>
  assess?: SquadAssessment
  active: boolean
  onSelect: () => void
}) {
  const members = squad.members.map((m) => ({ ...m, character: byId.get(m.characterId) }))
  const incomplete = members.filter((m) => m.character && !hasFullBuild(m.character))
  const gainsBonus = (c?: Character) => !!c?.traitKeys.some((k) => required.has(k))
  const bonus = members.filter((m) => gainsBonus(m.character))
  const cells = new Map(members.map((m) => [`${m.row}:${m.column}`, m.character]))
  const issues = assess ? assess(squad, members.flatMap((m) => (m.character ? [m.character] : []))) : []

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
          {issues.map((issue) => (
            <Badge key={issue} tone="danger">
              <AlertTriangle className="size-3" /> {issue}
            </Badge>
          ))}
          {bonus.length === 0 && incomplete.length === 0 && issues.length === 0 && <span className="font-mono text-[10px] text-fg-subtle">Sem bônus do campo</span>}
        </span>
      </span>
    </button>
  )
}

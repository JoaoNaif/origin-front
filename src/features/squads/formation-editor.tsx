import { useState, type DragEvent, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeftRight, Check, ChevronsRight, CircleDot, Hand, MousePointerClick, Plus, RotateCcw, Sparkles, Swords, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { Input } from '@/components/ui/input'
import { classIcons } from '@/features/game/class-icons'
import {
  classLabels,
  useCreateSquad,
  useFormationBonuses,
  useUpdateFormation,
  type Character,
  type FormationBonusValues,
  type Squad,
  type SquadMember,
} from '@/features/game/game-api'
import { apiErrorMessage } from '@/lib/api'
import { CharacterPortrait } from '@/features/game/character-art'
import { BonusChips } from '@/features/squads/bonus-chips'
import {
  bonusKey,
  bonusSource,
  bonusValuesMessage,
  cellBonuses,
  classAuraText,
  formationReports,
  visualColumns,
  type FormationBonus,
  type FormationReport,
} from '@/features/squads/formation-bonus'
import { TutorialButton } from '@/features/tutorial/tutorial-button'
import { cn } from '@/lib/cn'

const SQUAD_SIZE = 4
const NAME_MAX = 30

/** Célula da grade: `row:column` (column 0 = frente, D35). */
type CellKey = `${number}:${number}`
type Placement = Partial<Record<CellKey, string>>

const cellKey = (row: number, column: number): CellKey => `${row}:${column}`
const columnLabel = (column: number) => visualColumns.find((c) => c.column === column)?.label ?? ''

function placementOf(squad?: Squad): Placement {
  return Object.fromEntries(squad?.members.map((m) => [cellKey(m.row, m.column), m.characterId]) ?? [])
}

function membersOf(placement: Placement): SquadMember[] {
  return Object.entries(placement).flatMap(([key, characterId]) => {
    if (!characterId) return []
    const [row, column] = key.split(':').map(Number)
    return [{ characterId, row, column }]
  })
}

const hasFullBuild = (c: Character) => c.skills.filter((s) => s.buildSlot).length === 4

/**
 * Monta a formação: 4 personagens na grade 3x3. Clique num personagem e depois numa célula (ou arraste).
 * Clicar numa célula ocupada seleciona quem está nela; a próxima célula move ou troca.
 * `squad` ausente = esquadrão novo (o nome só é definido na criação).
 */
export function FormationEditor({ squad, characters, onCreated }: {
  squad?: Squad
  characters: Character[]
  onCreated: (squad: Squad) => void
}) {
  const saved = placementOf(squad)
  const [placement, setPlacement] = useState<Placement>(saved)
  const [selected, setSelected] = useState<string | null>(null)
  // personagem em destaque (mouse no painel de bônus ou no elenco): a célula dele acende
  const [highlight, setHighlight] = useState<string | null>(null)
  const [name, setName] = useState('')
  const create = useCreateSquad()
  const update = useUpdateFormation(squad?.id ?? '')
  const save = squad ? update : create

  const byId = new Map(characters.map((c) => [c.id, c]))
  const members = membersOf(placement)
  const placedIds = new Set(members.map((m) => m.characterId))
  const cellOf = (id: string) => (Object.keys(placement) as CellKey[]).find((k) => placement[k] === id)
  const full = members.length === SQUAD_SIZE
  const dirty = squad ? members.length !== squad.members.length || members.some((m) => saved[cellKey(m.row, m.column)] !== m.characterId) : members.length > 0
  const withoutBuild = members.map((m) => byId.get(m.characterId)).filter((c): c is Character => !!c && !hasFullBuild(c))
  const selectedCharacter = selected ? byId.get(selected) : undefined
  const bench = [...characters].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
  const bonusValues = useFormationBonuses()
  const placedUnits = members.flatMap((m) => {
    const character = byId.get(m.characterId)
    return character ? [{ character, row: m.row, column: m.column }] : []
  })
  // sem os valores da API, nenhum percentual na tela
  const reports = bonusValues.data ? formationReports(placedUnits, bonusValues.data) : []
  const reportOf = (id?: string) => reports.find((r) => r.character.id === id)

  function edit(next: (p: Placement) => Placement) {
    save.reset()
    setPlacement(next)
  }

  /** Põe o personagem na célula: move ou troca se ele já está na grade; se a célula tem alguém, esse volta ao banco. */
  function placeAt(id: string, key: CellKey) {
    const from = cellOf(id)
    const occupant = placement[key]
    if (!from && !occupant && members.length >= SQUAD_SIZE) return
    edit((p) => {
      const next: Placement = { ...p, [key]: id }
      if (from && from !== key) next[from] = occupant
      return next
    })
    setSelected(null)
  }

  function remove(id: string) {
    const from = cellOf(id)
    if (from) edit((p) => ({ ...p, [from]: undefined }))
    if (selected === id) setSelected(null)
  }

  function clickCell(key: CellKey) {
    const occupant = placement[key]
    if (selected && selected !== occupant) return placeAt(selected, key)
    setSelected(occupant && occupant !== selected ? occupant : null)
  }

  function submit() {
    if (squad) update.mutate(members)
    else create.mutate({ name: name.trim(), members }, { onSuccess: onCreated })
  }

  const dragProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData('text/plain', id)
      e.dataTransfer.effectAllowed = 'move'
      setSelected(id)
    },
    onDragEnd: () => setSelected(null),
  })
  const dropProps = (onDrop: (id: string) => void) => ({
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      const id = e.dataTransfer.getData('text/plain')
      if (byId.has(id)) onDrop(id)
    },
  })

  return (
    <div className="space-y-8">
      {!squad && (
        <div className="max-w-sm">
          <Input label="Nome do esquadrão" placeholder="Ex.: Muralha" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[auto_1fr]">
        {/* Tabuleiro */}
        <div className="chamfer relative overflow-hidden p-4 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:18px] sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 mask-[radial-gradient(70%_70%_at_50%_50%,black,transparent)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_60%_50%,rgb(139_92_246/0.1),transparent)]" />

          <div className="relative flex items-center justify-between gap-3 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
              <span className="text-primary-soft">//</span> Formação
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
                {Array.from({ length: SQUAD_SIZE }, (_, i) => (
                  <span key={i} className={cn('h-2 w-3 -skew-x-12 transition-colors duration-300', i < members.length ? 'bg-primary shadow-[0_0_6px_var(--color-primary)]' : 'bg-overlay')} />
                ))}
                <span className={cn('ml-1', full ? 'text-primary-soft' : 'text-fg-muted')}>
                  {members.length}/{SQUAD_SIZE}
                </span>
              </span>
              <TutorialButton id="formacao" label="Como funciona a formação" iconOnly />
            </div>
          </div>

          <div className="relative flex items-stretch gap-2 sm:gap-3">
            {/* rótulos das linhas */}
            <div className="flex flex-col pt-6">
              {[0, 1, 2].map((row) => (
                <span key={row} className="flex flex-1 items-center font-mono text-[9px] text-fg-subtle [writing-mode:vertical-rl] rotate-180">
                  L{row + 1}
                </span>
              ))}
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-3 gap-2 pb-2 sm:gap-2.5">
                {visualColumns.map(({ column, label }) => (
                  <span
                    key={column}
                    className={cn('text-center font-mono text-[10px] uppercase tracking-[0.18em]', column === 0 ? 'text-primary-soft' : 'text-fg-subtle')}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5" aria-label="Formação">
                {[0, 1, 2].map((row) =>
                  visualColumns.map(({ column, label }) => {
                    const key = cellKey(row, column)
                    const character = placement[key] ? byId.get(placement[key]) : undefined
                    return (
                      <FormationCell
                        key={key}
                        label={`Linha ${row + 1}, ${label}`}
                        coord={`L${row + 1} · ${label}`}
                        character={character}
                        bonuses={
                          character
                            ? (reportOf(character.id)?.bonuses ?? [])
                            : bonusValues.data
                              ? cellBonuses(placedUnits, { row, column }, bonusValues.data)
                              : []
                        }
                        front={column === 0}
                        selected={!!character && character.id === selected}
                        highlighted={!!character && character.id === highlight}
                        target={!!selected && selected !== character?.id && (!!character || placedIds.has(selected) || !full)}
                        onClick={() => clickCell(key)}
                        onRemove={character ? () => remove(character.id) : undefined}
                        dragProps={character ? dragProps(character.id) : undefined}
                        {...dropProps((id) => placeAt(id, key))}
                      />
                    )
                  }),
                )}
              </div>
            </div>

            {/* lado do inimigo */}
            <div className="mt-6 flex w-7 flex-col items-center justify-center gap-2 border-l border-enemy/30 bg-linear-to-r from-enemy/10 to-transparent">
              <ChevronsRight className="size-5 text-enemy/70 motion-safe:animate-pulse" aria-hidden />
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-enemy/70 [writing-mode:vertical-rl]">Inimigo</span>
              <ChevronsRight className="size-5 text-enemy/70 motion-safe:animate-pulse" aria-hidden />
            </div>
          </div>
        </div>

        {/* Selecionado: aura da classe. Sem seleção: bônus da formação atual */}
        <div className="chamfer relative h-fit overflow-hidden p-5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:18px] xl:max-w-lg">
          <div className="pointer-events-none absolute inset-0 scanlines" />
          <div className="relative">
            {selectedCharacter ? (
              <SelectedInfo character={selectedCharacter} report={reportOf(selectedCharacter.id)} values={bonusValues.data} failed={bonusValues.isError} />
            ) : reports.length > 0 ? (
              <FormationBonuses reports={reports} highlight={highlight} onHighlight={setHighlight} />
            ) : members.length > 0 ? (
              <p className="text-sm text-fg-subtle">{bonusValuesMessage(bonusValues.isError)}</p>
            ) : (
              <HowTo />
            )}
          </div>
        </div>
      </div>

      {/* Barra de salvar */}
      <div className="chamfer flex flex-wrap items-center justify-end gap-2 px-4 py-3 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:12px]">
        <SaveStatus
          tone={save.isError ? 'danger' : withoutBuild.length > 0 ? 'warning' : !full ? 'idle' : dirty ? 'dirty' : 'saved'}
        >
          {save.isError
            ? apiErrorMessage(save.error)
            : withoutBuild.length > 0
              ? `${withoutBuild.map((c) => c.name).join(', ')} sem as 4 skills na build: complete antes de batalhar.`
              : !full
                ? `Faltam ${SQUAD_SIZE - members.length} na grade.`
                : dirty
                  ? 'Formação alterada: salve para usar na batalha.'
                  : 'Formação salva.'}
        </SaveStatus>
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            disabled={save.isPending}
            onClick={() => {
              edit(() => saved)
              setSelected(null)
            }}
          >
            <RotateCcw className="size-3.5" />
            {squad ? 'Desfazer' : 'Limpar'}
          </Button>
        )}
        {squad && !dirty ? (
          <Link to="/batalhar" className={buttonClasses({ size: 'sm', className: 'group' })}>
            <Swords className="size-4" />
            Batalhar
            <ChevronsRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Button size="sm" disabled={!full || !dirty || (!squad && !name.trim()) || save.isPending} onClick={submit}>
            {save.isPending ? 'Salvando...' : squad ? 'Salvar formação' : 'Criar esquadrão'}
          </Button>
        )}
      </div>

      {/* Elenco (banco) */}
      <section className="space-y-3" {...dropProps(remove)}>
        <p className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          <span>
            <span className="text-primary-soft">//</span> Elenco
          </span>
          <span className="flex items-center gap-1.5">
            <Hand className="size-3" /> Arraste para cá para tirar da grade
          </span>
        </p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {bench.map((character) => {
            const cell = cellOf(character.id)
            const [row, column] = cell ? cell.split(':').map(Number) : []
            return (
              <li key={character.id} onMouseEnter={() => setHighlight(character.id)} onMouseLeave={() => setHighlight(null)}>
                <BenchCard
                  character={character}
                  position={cell ? `L${row + 1} · ${columnLabel(column)}` : null}
                  selected={selected === character.id}
                  onClick={() => setSelected(selected === character.id ? null : character.id)}
                  dragProps={dragProps(character.id)}
                />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function FormationCell({ label, coord, character, bonuses, front, selected, highlighted, target, onClick, onRemove, dragProps, onDrop, onDragOver }: {
  label: string
  /** "L1 · Frente", na célula vazia. */
  coord: string
  character?: Character
  /** Com personagem: o que ele recebe. Vazia: o que muda se alguém vier para cá. */
  bonuses: FormationBonus[]
  front: boolean
  selected: boolean
  /** Em destaque pelo painel de bônus ou pelo elenco. */
  highlighted: boolean
  /** Há alguém selecionado que pode vir para esta célula. */
  target: boolean
  onClick: () => void
  onRemove?: () => void
  dragProps?: { draggable: boolean; onDragStart: (e: DragEvent) => void; onDragEnd: () => void }
  onDragOver: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [first] = character?.name.split(' ') ?? []
  const ClassIcon = character ? classIcons[character.characterClass] : null
  const onlyLoss = bonuses.length > 0 && bonuses.every((b) => b.loss)

  return (
    <div
      className="group relative"
      onDragOver={onDragOver}
      onDragEnter={() => setDragOver(true)}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false)
        onDrop(e)
      }}
    >
      <button
        type="button"
        aria-label={`${label}: ${[character?.name ?? 'vazia', ...bonuses.map((b) => b.text)].join(', ')}`}
        aria-pressed={selected}
        onClick={onClick}
        {...dragProps}
        className={cn(
          'focus-ring chamfer relative flex aspect-square w-full flex-col items-center justify-center p-2 [--cut:12px] sm:w-32',
          'transition-all duration-200 ease-out-soft',
          character && 'cursor-grab active:cursor-grabbing',
          dragOver
            ? 'scale-[1.03] [--chamfer-bg:rgb(139_92_246/0.22)] [--chamfer-border:var(--color-primary-soft)]'
            : character
              ? selected
                ? '-translate-y-1 [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_0_16px_rgb(139_92_246/0.6)]'
                : highlighted
                  ? '-translate-y-0.5 [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_0_12px_rgb(139_92_246/0.45)]'
                  : '[--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(167_139_250/0.45)] hover:-translate-y-0.5 hover:[--chamfer-border:var(--color-primary-soft)] hover:drop-shadow-[0_0_12px_rgb(139_92_246/0.4)]'
              : target
                ? '[--chamfer-bg:rgb(139_92_246/0.08)] [--chamfer-border:rgb(167_139_250/0.6)] hover:[--chamfer-bg:rgb(139_92_246/0.16)]'
                : bonuses.length > 0
                  ? onlyLoss
                    ? '[--chamfer-bg:rgb(245_165_36/0.05)] [--chamfer-border:rgb(245_165_36/0.35)] hover:[--chamfer-border:rgb(245_165_36/0.7)]'
                    : '[--chamfer-bg:rgb(139_92_246/0.06)] [--chamfer-border:rgb(167_139_250/0.3)] hover:[--chamfer-border:rgb(167_139_250/0.65)]'
                  : cn(
                      '[--chamfer-bg:rgb(255_255_255/0.015)] hover:[--chamfer-bg:rgb(255_255_255/0.04)]',
                      front ? '[--chamfer-border:rgb(201_202_211/0.22)]' : '[--chamfer-border:rgb(201_202_211/0.12)]',
                      'hover:[--chamfer-border:rgb(201_202_211/0.35)]',
                    ),
        )}
      >
        {character ? (
          <>
            {/* retrato recortado no chanfro */}
            <span className="pointer-events-none absolute inset-px overflow-hidden [clip-path:var(--chamfer-shape)]">
              <span className="absolute inset-x-4 top-4 bottom-8 rounded-pill bg-primary/20 blur-xl" />
              <CharacterPortrait
                templateKey={character.templateKey}
                characterClass={character.characterClass}
                className="size-full transition-transform duration-300 ease-out-soft group-hover:scale-105"
                iconClassName="size-8 text-silver-bright"
              />
              <span className="absolute inset-0 bg-linear-to-t from-bg via-bg/30 via-40% to-transparent" />
            </span>

            {/* topo: classe e bônus */}
            <span className="absolute inset-x-1.5 top-1.5 flex items-center justify-between">
              {ClassIcon && (
                <span className="flex size-5 items-center justify-center border border-line-strong bg-bg/80 backdrop-blur-sm">
                  <ClassIcon className="size-3 text-fg-muted" />
                </span>
              )}
              {!hasFullBuild(character) && <AlertTriangle className="size-3.5 text-warning" aria-label="Build incompleta" />}
            </span>

            {/* base: nome, nível e quantos bônus */}
            <span className="absolute inset-x-0 bottom-0 px-2 pb-1.5 text-center transition-opacity duration-200 group-hover:opacity-0">
              <span className="block truncate font-display text-[15px] leading-none font-extrabold uppercase italic text-silver-bright">{first}</span>
              <span className="mt-0.5 flex items-center justify-center gap-1.5 font-mono text-[9px] tabular-nums">
                <span className="text-primary-soft">LV {character.level}</span>
                {bonuses.length > 0 && (
                  <span className="flex items-center gap-0.5 text-primary-soft">
                    <Sparkles className="size-2.5" />
                    {bonuses.length}
                  </span>
                )}
              </span>
            </span>

            {/* no hover: os bônus por extenso */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-[50%] flex-col justify-end bg-linear-to-t from-bg via-bg/95 to-transparent px-1.5 pt-4 pb-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {bonuses.length > 0 ? (
                <BonusChips bonuses={bonuses} wrap />
              ) : (
                <span className="text-center font-mono text-[9px] text-fg-subtle">Sem bônus aqui</span>
              )}
            </span>
          </>
        ) : target || dragOver ? (
          <span className="flex flex-col items-center gap-1 text-primary-soft">
            <span className="flex size-8 items-center justify-center border border-dashed border-primary-soft/70 motion-safe:animate-pulse">
              <Plus className="size-4" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em]">Colocar</span>
            {bonuses.length > 0 && <BonusChips bonuses={bonuses} wrap className="mt-1" />}
          </span>
        ) : bonuses.length > 0 ? (
          <span className="flex flex-col items-center gap-1.5">
            <span className={cn('font-mono text-[8px] uppercase tracking-[0.18em]', onlyLoss ? 'text-warning/80' : 'text-primary-soft/80')}>Se vier aqui</span>
            <BonusChips bonuses={bonuses} wrap />
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <span className="size-1 rounded-pill bg-silver/25 transition-all group-hover:size-1.5 group-hover:bg-silver/50" />
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100">{coord}</span>
          </span>
        )}

        {/* ocupada e há alguém selecionado: troca */}
        {character && target && !dragOver && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/15">
            <span className="flex items-center gap-1 border border-primary-soft/60 bg-bg/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-primary-soft">
              <ArrowLeftRight className="size-3" /> Trocar
            </span>
          </span>
        )}
      </button>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Tirar ${character?.name} da grade`}
          className="focus-ring absolute top-1.5 right-1.5 flex size-5 items-center justify-center border border-line-strong bg-bg/85 text-fg-subtle opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:border-danger/60 hover:bg-danger-dim hover:text-danger-hover focus-visible:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function BenchCard({ character, position, selected, onClick, dragProps }: {
  character: Character
  /** Onde está na grade ("L2 · Frente"); nulo = no banco. */
  position: string | null
  selected: boolean
  onClick: () => void
  dragProps: { draggable: boolean; onDragStart: (e: DragEvent) => void; onDragEnd: () => void }
}) {
  const Icon = classIcons[character.characterClass]
  const placed = !!position

  return (
    <button
      type="button"
      {...dragProps}
      onClick={onClick}
      aria-pressed={selected}
      title={character.name}
      className={cn(
        // altura fixa e textos de uma linha só: todos os cards com a mesma proporção
        'focus-ring chamfer group flex h-22 w-full cursor-grab flex-col justify-between overflow-hidden p-3 text-left [--cut:10px] active:cursor-grabbing',
        'transition-all duration-200 ease-out-soft hover:-translate-y-0.5',
        selected
          ? '-translate-y-0.5 [--chamfer-bg:rgb(139_92_246/0.16)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_0_12px_rgb(139_92_246/0.45)]'
          : placed
            ? '[--chamfer-bg:rgb(139_92_246/0.05)] [--chamfer-border:rgb(167_139_250/0.25)] hover:[--chamfer-border:rgb(167_139_250/0.6)]'
            : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-bg:var(--color-raised)] hover:[--chamfer-border:var(--color-line-strong)]',
      )}
    >
      {/* retrato no canto direito: acende e cresce no hover */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-24 opacity-45 mask-[linear-gradient(to_left,black_30%,transparent)] transition-all duration-300 ease-out-soft group-hover:scale-110 group-hover:opacity-90">
        <CharacterPortrait templateKey={character.templateKey} characterClass={character.characterClass} zoom={2} className="size-full" iconClassName="hidden" />
      </span>

      {/* classe e nível */}
      <span className="relative flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-fg-subtle transition-colors group-hover:text-fg-muted">
          <Icon className={cn('size-3.5 shrink-0', (selected || placed) && 'text-primary-soft')} strokeWidth={1.75} />
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em]">{classLabels[character.characterClass]}</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] text-fg-muted tabular-nums">LV {character.level}</span>
      </span>

      {/* nome e onde está */}
      <span className="relative space-y-1">
        <span className="flex items-center gap-2">
          <span className={cn('h-4 w-0.75 shrink-0 transition-all group-hover:h-5', placed || selected ? 'bg-primary shadow-[0_0_6px_var(--color-primary)]' : 'bg-line-strong')} />
          <span className="min-w-0 flex-1 truncate font-display text-lg leading-none font-bold uppercase tracking-wide text-fg transition-colors group-hover:text-silver-bright">
            {character.name}
          </span>
          {!hasFullBuild(character) && <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-label="Build incompleta" />}
        </span>
        <span className={cn('block h-3 pl-2.75 font-mono text-[9px] uppercase tracking-[0.14em]', placed ? 'text-primary-soft' : 'text-transparent')}>
          {position ?? '—'}
        </span>
      </span>
    </button>
  )
}

function SaveStatus({ tone, children }: { tone: 'danger' | 'warning' | 'idle' | 'dirty' | 'saved'; children: ReactNode }) {
  const Icon = tone === 'danger' || tone === 'warning' ? AlertTriangle : tone === 'saved' ? Check : CircleDot
  return (
    <p
      className={cn(
        'mr-auto flex items-center gap-2 text-xs',
        tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : tone === 'saved' ? 'text-success' : tone === 'dirty' ? 'text-primary-soft' : 'text-fg-muted',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center border',
          tone === 'danger' ? 'border-danger/40' : tone === 'warning' ? 'border-warning/40' : tone === 'saved' ? 'border-success/40' : tone === 'dirty' ? 'border-primary/40' : 'border-line-strong',
        )}
      >
        <Icon className={cn('size-3.5', tone === 'dirty' && 'motion-safe:animate-pulse')} />
      </span>
      <span>{children}</span>
    </p>
  )
}

function HowTo() {
  const steps: { icon: typeof Plus; text: string }[] = [
    { icon: MousePointerClick, text: 'Escolha um personagem no elenco e clique numa célula, ou arraste.' },
    { icon: ArrowLeftRight, text: 'Clique em quem já está na grade para mover ou trocar de lugar.' },
    { icon: Sparkles, text: 'Cada classe dá uma aura aos vizinhos. Agrupar pega mais aura, mas leva mais dano de área.' },
  ]
  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Como montar</p>
      <ol className="space-y-3">
        {steps.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center border border-line-strong bg-bg/60 text-primary-soft">
              <Icon className="size-4" />
            </span>
            <span className="pt-1 text-sm leading-relaxed text-fg-muted">
              <span className="mr-1.5 font-mono text-[10px] text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
              {text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** O que a posição dá ao personagem: bônus ativos e, se for o caso, por que o da própria classe não vale. */
function ReportLines({ report }: { report: FormationReport }) {
  if (report.bonuses.length === 0 && !report.idle) return <p className="text-xs text-fg-subtle">Nenhum bônus nesta posição.</p>
  return (
    <ul className="space-y-1">
      {report.bonuses.map((bonus) => (
        <li key={bonusKey(bonus)} className="flex flex-wrap items-baseline gap-x-1.5 text-xs leading-relaxed">
          <span className="border border-primary-soft/40 bg-primary/10 px-1.5 py-px text-primary-soft">{bonus.text}</span>
          <span className="font-mono text-[10px] text-fg-subtle">de {bonusSource(bonus)}</span>
        </li>
      ))}
      {report.idle && (
        <li className="flex items-start gap-1.5 text-xs leading-relaxed text-fg-subtle">
          <CircleDot className="mt-0.5 size-3 shrink-0" />
          {report.idle}
        </li>
      )}
    </ul>
  )
}

function FormationBonuses({ reports, highlight, onHighlight }: {
  reports: FormationReport[]
  highlight: string | null
  onHighlight: (id: string | null) => void
}) {
  const total = reports.reduce((sum, r) => sum + r.bonuses.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Bônus da formação</p>
        <p className="font-mono text-[10px] text-fg-subtle tabular-nums">
          <span className="font-display text-xl font-extrabold italic text-silver-bright">{total}</span> ativos
        </p>
      </div>

      <ul className="space-y-1.5" onMouseLeave={() => onHighlight(null)}>
        {reports.map((report) => {
          const character = report.character as Character
          const Icon = classIcons[character.characterClass]
          const lit = highlight === character.id
          return (
            <li
              key={character.id}
              onMouseEnter={() => onHighlight(character.id)}
              className={cn(
                'chamfer flex gap-3 p-2.5 [--cut:8px] transition-all duration-150',
                lit ? '[--chamfer-bg:rgb(139_92_246/0.1)] [--chamfer-border:rgb(167_139_250/0.5)]' : '[--chamfer-bg:rgb(10_10_12/0.5)] [--chamfer-border:var(--color-line)]',
              )}
            >
              <span className="chamfer relative size-11 shrink-0 overflow-hidden [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(167_139_250/0.4)] [--cut:6px]">
                <span className="absolute inset-px overflow-hidden [clip-path:var(--chamfer-shape)]">
                  <CharacterPortrait templateKey={character.templateKey} characterClass={character.characterClass} zoom={3.2} className="size-full" iconClassName="size-5 text-silver/60" />
                </span>
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-center gap-2">
                  <span className={cn('truncate font-display text-base leading-tight font-bold uppercase tracking-wide transition-colors', lit ? 'text-silver-bright' : 'text-fg')}>
                    {character.name}
                  </span>
                  <Icon className="size-3 shrink-0 text-fg-subtle" />
                </p>
                <ReportLines report={report} />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/60 pt-3 font-mono text-[10px] text-fg-subtle">
        <span className="flex items-center gap-1.5">
          <span className="size-2 border border-primary-soft/60 bg-primary/20" /> ganha
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 border border-warning/60 bg-warning/20" /> aliado perde
        </span>
        <span>Auras iguais não somam · passe o mouse na grade para ver cada célula</span>
      </div>
    </div>
  )
}

function SelectedInfo({ character, report, values, failed }: {
  character: Character
  report?: FormationReport
  values?: FormationBonusValues
  failed: boolean
}) {
  const Icon = classIcons[character.characterClass]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="chamfer relative size-14 shrink-0 overflow-hidden [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:var(--color-primary-soft)] [--cut:8px]">
          <span className="absolute inset-px overflow-hidden [clip-path:var(--chamfer-shape)]">
            <CharacterPortrait templateKey={character.templateKey} characterClass={character.characterClass} zoom={3} className="size-full" iconClassName="size-6 text-silver/60" />
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl leading-tight font-extrabold uppercase italic text-silver-bright">{character.name}</p>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
            <Icon className="size-3 text-primary-soft" />
            {classLabels[character.characterClass]} · LV {character.level}
          </p>
        </div>
      </div>

      <div className="border-l-2 border-primary/60 bg-primary/5 py-2 pr-3 pl-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Aura da classe</p>
        <p className="text-sm leading-relaxed text-fg">{values ? classAuraText(character.characterClass, values) : bonusValuesMessage(failed)}</p>
      </div>

      {report && (
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Nesta posição</p>
          <ReportLines report={report} />
        </div>
      )}

      {!hasFullBuild(character) && (
        <p className="flex items-center gap-2 border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          <AlertTriangle className="size-3.5" />
          Build incompleta: escolha as 4 skills na ficha antes de batalhar.
        </p>
      )}

      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">
        <span className="size-1.5 animate-pulse rounded-pill bg-primary shadow-[0_0_6px_var(--color-primary)]" />
        Agora clique numa célula da grade
      </p>
    </div>
  )
}

import { useState, type DragEvent } from 'react'
import { AlertTriangle, ChevronsRight, RotateCcw, Swords, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { Input } from '@/components/ui/input'
import { classIcons } from '@/features/game/class-icons'
import {
  classLabels,
  useCreateSquad,
  useUpdateFormation,
  type Character,
  type Squad,
  type SquadMember,
} from '@/features/game/game-api'
import { classAuras } from '@/features/game/game-labels'
import { apiErrorMessage } from '@/lib/api'
import { CharacterPortrait } from '@/features/game/character-art'
import { cn } from '@/lib/cn'

const SQUAD_SIZE = 4
const NAME_MAX = 30

/** Célula da grade: `row:column` (column 0 = frente, D35). */
type CellKey = `${number}:${number}`
type Placement = Partial<Record<CellKey, string>>

const cellKey = (row: number, column: number): CellKey => `${row}:${column}`

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

/** Colunas da esquerda para a direita: fundo, meio, frente (a frente olha para o inimigo, à direita). */
const visualColumns = [
  { column: 2, label: 'Fundo' },
  { column: 1, label: 'Meio' },
  { column: 0, label: 'Frente' },
]

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
    },
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

      <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
        {/* Grade */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-3 gap-2.5">
              {visualColumns.map(({ column, label }) => (
                <span key={column} className={cn('text-center font-mono text-[10px] uppercase tracking-[0.18em]', column === 0 ? 'text-primary-soft' : 'text-fg-subtle')}>
                  {label}
                </span>
              ))}
            </div>
            <span className="w-6" />
          </div>
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-3 gap-2.5" aria-label="Formação">
              {[0, 1, 2].map((row) =>
                visualColumns.map(({ column, label }) => {
                  const key = cellKey(row, column)
                  const character = placement[key] ? byId.get(placement[key]) : undefined
                  return (
                    <FormationCell
                      key={key}
                      label={`Linha ${row + 1}, ${label}`}
                      character={character}
                      front={column === 0}
                      selected={!!character && character.id === selected}
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
            <ChevronsRight className="size-6 shrink-0 text-enemy/60" aria-label="Inimigo" />
          </div>
          <p className="flex items-center justify-between font-mono text-[11px] text-fg-subtle tabular-nums">
            <span>Linha = da frente ao fundo · Coluna 1 = frente</span>
            <span className={cn(full ? 'text-primary-soft' : 'text-fg-muted')}>
              {members.length}/{SQUAD_SIZE}
            </span>
          </p>
        </div>

        {/* Selecionado: aura da classe */}
        <div className="hud-corners flex flex-col justify-center border border-line/60 bg-surface/60 p-5 lg:max-w-md">
          {selectedCharacter ? (
            <SelectedInfo character={selectedCharacter} />
          ) : (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Como montar</p>
              <p className="text-sm leading-relaxed text-fg-muted">
                Escolha um personagem no elenco e clique numa célula, ou arraste. Clique em quem já está na grade para mover ou
                trocar de lugar.
              </p>
              <p className="text-sm leading-relaxed text-fg-muted">
                Cada classe dá uma aura aos aliados adjacentes. Agrupar pega mais aura, mas leva mais dano de área.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Barra de salvar */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-y border-line py-3">
        <p className={cn('mr-auto flex items-center gap-2 text-xs', save.isError ? 'text-danger' : 'text-fg-subtle')}>
          {save.isError ? (
            apiErrorMessage(save.error)
          ) : withoutBuild.length > 0 ? (
            <>
              <AlertTriangle className="size-3.5 text-warning" />
              <span>
                {withoutBuild.map((c) => c.name).join(', ')} sem as 4 skills na build: complete antes de batalhar.
              </span>
            </>
          ) : !full ? (
            `Faltam ${SQUAD_SIZE - members.length} na grade.`
          ) : dirty ? (
            'Formação alterada.'
          ) : (
            'Formação salva.'
          )}
        </p>
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
          <Link to="/batalhar" className={buttonClasses({ size: 'sm' })}>
            <Swords className="size-4" />
            Batalhar
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
          <span>{'// '}Elenco</span>
          <span>Arraste para cá para tirar da grade</span>
        </p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {bench.map((character) => {
            const Icon = classIcons[character.characterClass]
            const placed = placedIds.has(character.id)
            const isSelected = selected === character.id
            return (
              <li key={character.id}>
                <button
                  type="button"
                  {...dragProps(character.id)}
                  onClick={() => setSelected(isSelected ? null : character.id)}
                  aria-pressed={isSelected}
                  title={character.name}
                  className={cn(
                    // altura fixa e textos de uma linha só: todos os cards com a mesma proporção
                    'focus-ring chamfer group flex h-20 w-full flex-col justify-between overflow-hidden p-3 text-left [--cut:10px] transition-all duration-150 ease-out-soft',
                    isSelected
                      ? '[--chamfer-bg:rgb(139_92_246/0.16)] [--chamfer-border:var(--color-primary-soft)]'
                      : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:var(--color-line-strong)]',
                    placed && !isSelected && 'opacity-45',
                  )}
                >
                  {/* retrato de leve no canto direito */}
                  <span className="pointer-events-none absolute inset-y-0 right-0 w-20 opacity-50 mask-[linear-gradient(to_left,black_30%,transparent)] transition-opacity group-hover:opacity-80">
                    <CharacterPortrait templateKey={character.templateKey} characterClass={character.characterClass} zoom={2} className="size-full" iconClassName="hidden" />
                  </span>
                  {/* Classe (ou "na grade") e nível */}
                  <span className="relative flex items-center justify-between gap-2">
                    <span className={cn('flex min-w-0 items-center gap-1.5', placed ? 'text-primary-soft' : 'text-fg-subtle')}>
                      <Icon className={cn('size-3.5 shrink-0', isSelected && 'text-primary-soft')} strokeWidth={1.75} />
                      <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em]">
                        {placed ? 'Na grade' : classLabels[character.characterClass]}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-fg-muted tabular-nums">LV {character.level}</span>
                  </span>

                  {/* Nome, com o marcador de lado à esquerda */}
                  <span className="relative flex items-center gap-2">
                    <span className={cn('h-4 w-0.75 shrink-0', placed || isSelected ? 'bg-primary' : 'bg-line-strong')} />
                    <span className="min-w-0 flex-1 truncate font-display text-lg leading-none font-bold uppercase tracking-wide text-fg group-hover:text-silver-bright">
                      {character.name}
                    </span>
                    {!hasFullBuild(character) && <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-label="Build incompleta" />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function FormationCell({ label, character, front, selected, target, onClick, onRemove, dragProps, ...drop }: {
  label: string
  character?: Character
  front: boolean
  selected: boolean
  /** Há alguém selecionado que pode vir para esta célula. */
  target: boolean
  onClick: () => void
  onRemove?: () => void
  dragProps?: { draggable: boolean; onDragStart: (e: DragEvent) => void }
  onDragOver: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
}) {
  const [first] = character?.name.split(' ') ?? []

  return (
    <div className="group relative" {...drop}>
      <button
        type="button"
        aria-label={character ? `${label}: ${character.name}` : `${label}: vazia`}
        aria-pressed={selected}
        onClick={onClick}
        {...dragProps}
        className={cn(
          'focus-ring relative flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-control border p-2 transition-all duration-150 ease-out-soft sm:w-28',
          character
            ? selected
              ? 'border-primary-soft bg-primary/25 shadow-[0_0_28px_rgb(139_92_246/0.55)]'
              : 'border-primary-soft/50 bg-primary/12 shadow-[0_0_18px_rgb(139_92_246/0.25)] hover:border-primary-soft'
            : target
              ? 'border-dashed border-primary-soft/60 bg-primary/5'
              : cn('border-silver/15 bg-white/[0.02] hover:border-silver/30', front && 'border-silver/25'),
        )}
      >
        {character ? (
          <>
            <span className="absolute inset-0 overflow-hidden rounded-control">
              <CharacterPortrait
                templateKey={character.templateKey}
                characterClass={character.characterClass}
                className="size-full"
                iconClassName="size-8 text-silver-bright"
              />
            </span>
            <span className="absolute inset-x-0 bottom-0 rounded-b-control bg-linear-to-t from-bg via-bg/80 to-transparent px-1.5 pt-5 pb-1 text-center">
              <span className="block truncate font-display text-sm leading-none font-bold uppercase tracking-wide text-silver-bright">{first}</span>
              <span className="font-mono text-[9px] text-primary-soft">LV {character.level}</span>
            </span>
            {!hasFullBuild(character) && <AlertTriangle className="absolute top-1.5 left-1.5 size-3 text-warning" aria-label="Build incompleta" />}
          </>
        ) : (
          <span className="size-1 rounded-pill bg-silver/20" />
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Tirar ${character?.name} da grade`}
          className="focus-ring absolute top-1 right-1 flex size-5 items-center justify-center rounded-control text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-dim hover:text-danger-hover focus-visible:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function SelectedInfo({ character }: { character: Character }) {
  const Icon = classIcons[character.characterClass]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center border border-primary/40 text-primary-soft">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{character.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
            {classLabels[character.characterClass]} · LV {character.level}
          </p>
        </div>
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Aura</p>
        <p className="text-sm leading-relaxed text-fg-muted">{classAuras[character.characterClass]}</p>
      </div>
      {!hasFullBuild(character) && (
        <Badge tone="warning">
          <AlertTriangle className="size-3" />
          Build incompleta
        </Badge>
      )}
      <p className="text-xs text-fg-subtle">Agora clique numa célula da grade.</p>
    </div>
  )
}

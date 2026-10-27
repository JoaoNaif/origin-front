import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FastForward, Swords, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { ActionBar, ActionDetail, type Mode } from '@/features/battle/action-panel'
import {
  battleScreenKey,
  useBattleScreen,
  useForfeit,
  useRefreshAfterBattle,
  useSubmitAction,
  useTurnOptions,
  type BattleEvent,
  type BattleState,
  type BattleStep,
  type BattleUnit,
  type Cell,
  type TurnOption,
} from '@/features/battle/battle-api'
import { BattleBoard, type CellMark, type Grave } from '@/features/battle/battle-board'
import { buildLog, cellId, eventContext, newEvents, stepDelay, stepUnits, type Float } from '@/features/battle/battle-events'
import { CombatLog, ResultOverlay, Timeline, TopBar } from '@/features/battle/battle-hud'
import { useMe } from '@/features/auth/auth-api'
import { useCharacters } from '@/features/game/game-api'
import { classIcons } from '@/features/game/class-icons'
import { apiErrorMessage, httpStatus } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Reprodução de uma jogada: os eventos que chegaram, aplicados um a um numa cópia só para exibir. */
type Playback = {
  queue: BattleEvent[]
  index: number
  units: BattleUnit[]
  activeRef: string | null
  floats: Float[]
  impacted: Set<string>
  /** Sobe a cada dano: reinicia a animação de golpe mesmo no mesmo alvo. */
  hitId: number
  /** Faixa "X usa Y" da skill desta vez (some no próximo TURN). */
  cast: { id: number; ref: string; skillKey: string } | null
  /** Estado antes da jogada (topo e fila continuam nele até o fim). */
  before: BattleState
  /** Estado do servidor depois da jogada: entra quando a reprodução acaba. */
  after: BattleState
}

type Selection = { turnKey: string | null; mode: Mode; chosen: TurnOption | null }

let floatId = 0

const columnNames = ['frente', 'meio', 'fundo']
const cellLabel = (cell: Cell) => `linha ${cell.row + 1}, ${columnNames[cell.column]}`

/** Tela cheia da batalha (fora do AppShell). O servidor decide tudo; aqui só mostra, escolhe e envia. */
export function BattlePage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const screen = useBattleScreen(id)
  const submit = useSubmitAction(id)
  const forfeit = useForfeit(id)
  const refreshAfterBattle = useRefreshAfterBattle()
  const me = useMe()

  const [playback, setPlayback] = useState<Playback | null>(null)
  const [selection, setSelection] = useState<Selection>({ turnKey: null, mode: null, chosen: null })
  const [hoverCell, setHoverCell] = useState<string | null>(null)
  // skill sob o mouse na barra de baixo: o painel da esquerda explica ela
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultClosed, setResultClosed] = useState(false)
  // abaixo de 1280px o registro vira gaveta, para não roubar a largura das skills
  const [logOpen, setLogOpen] = useState(false)
  const [graves, setGraves] = useState(new Map<string, Grave>())

  const state = screen.data
  const battle = playback?.before.battle ?? state?.battle
  const units = useMemo(() => playback?.units ?? state?.battle.units ?? [], [playback, state])
  const activeRef = playback ? playback.activeRef : (state?.battle.turn?.ref ?? null)

  // Vez do jogador: só fora da reprodução, com a batalha valendo
  const playerTurn = !playback && state?.battle.status === 'IN_PROGRESS' && state.battle.turn?.side === 'PLAYER'
  const turnKey = playerTurn && state ? `${state.battle.turn!.ref}:${state.events.length}` : null
  const turnOptions = useTurnOptions(id, turnKey)
  const options = useMemo(() => turnOptions.data ?? [], [turnOptions.data])

  // a seleção vale só para a vez em que foi feita
  const mode = selection.turnKey === turnKey ? selection.mode : null
  const chosen = selection.turnKey === turnKey ? selection.chosen : null
  const select = useCallback((next: Partial<Omit<Selection, 'turnKey'>>) => {
    setError(null)
    setSelection((s) => ({ ...(s.turnKey === turnKey ? s : { mode: null, chosen: null }), ...next, turnKey }))
  }, [turnKey])

  // Reprodução: um evento por vez; no fim, o estado do servidor
  const finish = useCallback(
    (p: Playback) => {
      queryClient.setQueryData(battleScreenKey(id), p.after)
      // quem caiu na jogada deixa a marca na última célula (o servidor manda a posição nula)
      const fallen = p.units.filter((u) => !u.alive && u.position)
      if (fallen.length)
        setGraves((g) => new Map([...g, ...fallen.map((u) => [u.ref, { side: u.side, cell: u.position!, name: u.name, templateKey: u.templateKey, characterClass: u.characterClass }] as const)]))
      setPlayback(null)
      if (p.after.battle.status === 'FINISHED') refreshAfterBattle()
    },
    [id, queryClient, refreshAfterBattle],
  )

  useEffect(() => {
    if (!playback) return
    const previous = playback.queue[playback.index - 1]
    const delay = previous ? stepDelay(previous) : 150
    const timer = setTimeout(() => {
      if (playback.index >= playback.queue.length) return finish(playback)
      setPlayback((p) => {
        if (!p) return p
        const event = p.queue[p.index]
        const step = stepUnits(p.units, event)
        return {
          ...p,
          index: p.index + 1,
          units: step.units,
          activeRef: event.type === 'TURN' ? event.ref : p.activeRef,
          floats: [...p.floats.slice(-10), ...step.floats.map((f) => ({ ...f, id: ++floatId }))],
          impacted: new Set(event.type === 'DAMAGE' ? [event.targetRef] : event.type === 'DOT' ? [event.ref] : []),
          hitId: event.type === 'DAMAGE' || event.type === 'DOT' ? p.hitId + 1 : p.hitId,
          cast: event.type === 'SKILL' ? { id: ++floatId, ref: event.ref, skillKey: event.skillKey } : event.type === 'TURN' ? null : p.cast,
        }
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [playback, finish])

  function play(step: BattleStep) {
    if (!state) return
    const incoming = newEvents(state.events, step.events)
    setSelection({ turnKey: null, mode: null, chosen: null })
    setPlayback({
      queue: incoming,
      index: 0,
      units: state.battle.units,
      activeRef: state.battle.turn?.ref ?? null,
      floats: [],
      impacted: new Set(),
      hitId: 0,
      cast: null,
      before: state,
      after: { battle: step.battle, events: [...state.events, ...incoming] },
    })
  }

  function execute() {
    if (!chosen || submit.isPending) return
    submit.mutate(chosen.payload, {
      onSuccess: play,
      onError: (e) => {
        if (httpStatus(e) === 409) {
          // outra jogada entrou antes (clique duplo, outra aba): recarrega do servidor
          setError('A batalha mudou em outro lugar. Estado recarregado.')
          queryClient.invalidateQueries({ queryKey: battleScreenKey(id) })
        } else setError(apiErrorMessage(e))
      },
    })
  }

  function doForfeit() {
    forfeit.mutate(undefined, {
      onSuccess: (finished) => {
        if (state) queryClient.setQueryData<BattleState>(battleScreenKey(id), { battle: finished, events: state.events })
        refreshAfterBattle()
      },
      onError: () => queryClient.invalidateQueries({ queryKey: battleScreenKey(id) }),
    })
  }

  // Onde cada opção é clicada: o primeiro atingido (skill), a célula (mover) ou o aliado (trocar)
  const positions = useMemo(() => new Map(units.filter((u) => u.position).map((u) => [u.ref, cellId(u.side, u.position!)])), [units])
  const anchorOf = useCallback(
    (option: TurnOption): string | null => {
      const p = option.payload
      if (p.type === 'SKILL') return positions.get(option.preview?.hits[0]?.ref ?? '') ?? cellId(p.targetSide, p.target)
      if (p.type === 'MOVE') return cellId('PLAYER', p.to)
      if (p.type === 'SWAP') return positions.get(p.withRef) ?? null
      return null
    },
    [positions],
  )

  const groups = useMemo(() => {
    const map = new Map<string, TurnOption[]>()
    if (!mode) return map
    for (const option of options) {
      const p = option.payload
      const fits = mode.kind === 'SKILL' ? p.type === 'SKILL' && p.skillKey === mode.skillKey : p.type === mode.kind
      const anchor = fits && anchorOf(option)
      if (anchor) map.set(anchor, [...(map.get(anchor) ?? []), option])
    }
    return map
  }, [options, mode, anchorOf])

  const focused = chosen ?? (hoverCell ? (groups.get(hoverCell)?.[0] ?? null) : null)
  const chosenGroup = chosen ? (groups.get(anchorOf(chosen) ?? '') ?? [chosen]) : []

  const marks = useMemo(() => {
    const map = new Map<string, CellMark>()
    for (const [cell, group] of groups) map.set(cell, { clickable: true, selected: !!chosen && group.includes(chosen) })
    if (focused?.preview) {
      for (const hit of focused.preview.hits) {
        const cell = positions.get(hit.ref)
        if (!cell) continue
        const effects = hit.effects
          .map((e) => (e.type === 'DAMAGE' ? `-${Math.round(e.amount)}` : e.type === 'HEAL' || e.type === 'SHIELD' ? `+${Math.round(e.amount)}` : null))
          .filter(Boolean)
        const chance = hit.hitChance < 1 ? `${Math.round(hit.hitChance * 100)}%` : null
        map.set(cell, { ...map.get(cell), hit: true, preview: [...effects, chance].filter(Boolean).join(' · ') || undefined })
      }
    }
    return map
  }, [groups, chosen, focused, positions])

  // Registro: os eventos do servidor (ou os já reproduzidos)
  const context = useMemo(() => eventContext((playback?.after ?? state)?.battle), [playback, state])
  const logEvents = useMemo(
    () => (playback ? [...playback.before.events, ...playback.queue.slice(0, playback.index)] : (state?.events ?? [])),
    [playback, state],
  )
  const log = useMemo(() => buildLog(logEvents, context), [logEvents, context])

  const actor = playerTurn ? units.find((u) => u.ref === state?.battle.turn?.ref) : undefined

  // Stats fora da batalha: o painel da unidade compara com os atuais
  const characters = useCharacters()
  const baseStats = useMemo(() => new Map(characters.data?.map((c) => [c.id, c.stats])), [characters.data])

  // Teclado: 1 a 4 escolhem a skill, Enter executa, Esc cancela. useEffectEvent: lê sempre a escolha mais recente
  // (um Enter logo depois do clique não pode pegar o estado de antes)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!playerTurn || !actor || e.target instanceof HTMLInputElement) return
    const skill = actor.skills[Number(e.key) - 1]
    if (skill?.ready) select({ mode: { kind: 'SKILL', skillKey: skill.key }, chosen: null })
    else if (e.key === 'Escape') select({ mode: null, chosen: null })
    else if (e.key === 'Enter' && chosen) {
      e.preventDefault() // o Enter não "clica" de novo no botão em foco
      execute()
    }
  })
  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (screen.isError) {
    const status = httpStatus(screen.error)
    return (
      <FullScreenMessage
        title="Batalha indisponível"
        detail={
          status === 403 || status === 404 || status === 400
            ? 'Essa batalha não existe ou não é sua.'
            : status === 409
              ? // o servidor refaz a batalha pelas ações salvas; se o motor mudou depois, o replay não bate mais
                'O servidor não conseguiu reconstruir essa batalha (o replay não bate mais com as ações salvas).'
              : 'Não foi possível carregar a batalha.'
        }
      />
    )
  }
  if (!state || !battle) return <FullScreenMessage title="Entrando em campo" detail="Carregando a batalha..." loading />

  const finished = state.battle.status === 'FINISHED' && !playback

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-bg">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid [--grid-size:56px] mask-[radial-gradient(70%_60%_at_50%_45%,black,transparent)]" />
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(60%_50%_at_30%_45%,rgb(139_92_246/0.12),transparent_70%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(60%_50%_at_70%_45%,rgb(229_72_77/0.1),transparent_70%)]" />
        <div className="absolute inset-0 scanlines" />
      </div>

      <TopBar
        battle={battle}
        units={units}
        playerName={me.data?.displayName}
        onForfeit={doForfeit}
        forfeiting={forfeit.isPending}
        onToggleLog={() => setLogOpen((o) => !o)}
      />

      <main className="flex flex-1 flex-col gap-3 p-4 lg:px-6">
        <Timeline battle={battle} units={units} />

        {/* Meio: detalhe da skill | grade | registro (a mesma altura, a grade no centro) */}
        <div className="grid flex-1 items-center gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_15rem] 2xl:grid-cols-[21rem_minmax(0,1fr)_19rem]">
          <div className="order-2 h-full max-h-104 min-h-0 lg:order-1 lg:h-96 2xl:h-104">
            {playerTurn && actor ? (
              <ActionDetail
                actor={actor}
                mode={mode}
                chosen={chosen}
                focused={focused}
                group={chosenGroup}
                busy={submit.isPending}
                error={error ?? (turnOptions.isError ? apiErrorMessage(turnOptions.error) : null)}
                hoveredSkill={hoveredSkill}
                unitName={context.name}
                cellLabel={cellLabel}
                fieldName={(key) => context.field(key)}
                onChoose={(option) => select({ chosen: option })}
                onExecute={execute}
                onCancel={() => select({ mode: null, chosen: null })}
              />
            ) : (
              <div className="hud-corners flex h-full flex-col items-center justify-center gap-2 border border-line/60 bg-surface/60 p-4 text-center">
                <Swords className={cn('size-5', playback ? 'animate-pulse text-primary-soft' : 'text-fg-subtle')} />
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
                  {playback ? 'Resolvendo a jogada' : finished ? 'Batalha encerrada' : 'Aguardando'}
                </p>
              </div>
            )}
          </div>

          <div className="relative order-1 flex min-w-0 justify-center pt-10 pb-2 lg:order-2">
            {playback?.cast && <CastBanner key={playback.cast.id} unit={units.find((u) => u.ref === playback.cast!.ref)} skill={context.skill(playback.cast.skillKey)} />}
            <BattleBoard
              units={units}
              ghosts={graves}
              activeRef={activeRef}
              marks={marks}
              floats={playback?.floats ?? []}
              impacted={playback?.impacted ?? new Set()}
              hitId={playback?.hitId ?? 0}
              // quem age avança: a faixa "X usa Y" marca quem e muda a cada skill
              acting={playback?.cast ?? null}
              // o painel da unidade cobriria a animação
              inspect={!playback}
              onCellClick={(side, cell) => {
                const group = groups.get(cellId(side, cell))
                if (group) select({ chosen: group[0] })
              }}
              onCellHover={(side, cell) => setHoverCell(cell ? cellId(side, cell) : null)}
              unitName={context.name}
              baseStats={baseStats}
            />
          </div>

          {/* Registro com altura limitada (rola por dentro); abaixo de 1280px vira gaveta */}
          <aside className="order-3 hidden h-96 min-h-0 xl:block 2xl:h-104">
            <CombatLog turns={log} unit={context.unit} live={state.battle.status === 'IN_PROGRESS'} />
          </aside>
        </div>

        {/* Embaixo: a barra de skills (ou a reprodução, ou o fim) */}
        {playback ? (
          <div className="flex items-center justify-between gap-3 border border-line/60 bg-surface/80 px-4 py-3">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
              <span className="size-1.5 animate-pulse rounded-pill bg-primary-soft" />
              Resolvendo · {playback.index}/{playback.queue.length}
            </p>
            <Button variant="ghost" size="sm" onClick={() => finish(playback)}>
              <FastForward className="size-3.5" /> Pular
            </Button>
          </div>
        ) : playerTurn && actor ? (
          <ActionBar
            actor={actor}
            options={options}
            loading={turnOptions.isPending}
            mode={mode}
            chosen={chosen}
            busy={submit.isPending}
            onMode={(next) => select({ mode: next, chosen: null })}
            onChoose={(option) => select({ chosen: option })}
            onHoverSkill={setHoveredSkill}
          />
        ) : finished ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-line/60 bg-surface/80 px-4 py-3">
            <p className="font-display text-xl font-bold uppercase tracking-wide text-fg">Batalha encerrada</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setResultClosed(false)}>
                Ver resultado
              </Button>
              <Link to="/batalhar" className={buttonClasses({ size: 'sm' })}>
                <Swords className="size-4" /> Batalhar de novo
              </Link>
            </div>
          </div>
        ) : null}
      </main>

      {/* Registro em gaveta (telas menores) */}
      {logOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLogOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[85vw] flex-col bg-bg p-3 shadow-panel">
            <Button variant="ghost" size="sm" className="mb-2 self-end" onClick={() => setLogOpen(false)}>
              <X className="size-3.5" /> Fechar
            </Button>
            <div className="min-h-0 flex-1">
              <CombatLog turns={log} unit={context.unit} live={state.battle.status === 'IN_PROGRESS'} />
            </div>
          </div>
        </div>
      )}

      {finished && !resultClosed && <ResultOverlay battle={state.battle} onClose={() => setResultClosed(true)} />}
    </div>
  )
}

function FullScreenMessage({ title, detail, loading }: { title: string; detail: string; loading?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <Swords className={loading ? 'size-6 animate-pulse text-primary-soft' : 'size-6 text-fg-subtle'} />
      <p className="font-display text-3xl font-bold uppercase tracking-wide text-fg">{title}</p>
      <p className="text-sm text-fg-muted">{detail}</p>
      {!loading && (
        <Link to="/" className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'mt-2' })}>
          Voltar ao lobby
        </Link>
      )}
    </div>
  )
}

/** "SUNNA usa CONGELAR": entra no topo do campo a cada skill, na cor do lado. */
function CastBanner({ unit, skill }: { unit?: BattleUnit; skill: string }) {
  if (!unit) return null
  const Icon = classIcons[unit.characterClass]
  const ally = unit.side === 'PLAYER'
  return (
    <div className="pointer-events-none absolute top-0 left-1/2 z-40 -translate-x-1/2">
      <div
        className={cn(
          'flex animate-cast-in items-center gap-3 border-y px-6 py-2 whitespace-nowrap shadow-panel',
          ally ? 'border-primary-soft/60 bg-primary-dim' : 'border-enemy/60 bg-danger-dim',
        )}
      >
        <Icon className={cn('size-5', ally ? 'text-primary-soft' : 'text-danger-hover')} />
        <span className="font-display text-lg font-bold uppercase tracking-wide text-fg">{unit.name.split(' ')[0]}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">usa</span>
        <span className={cn('font-display text-2xl font-extrabold uppercase italic', ally ? 'text-primary-soft' : 'text-danger-hover')}>{skill}</span>
      </div>
    </div>
  )
}

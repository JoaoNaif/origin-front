import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Skull } from 'lucide-react'
import type { BattleUnit, Cell, Side } from '@/features/battle/battle-api'
import { cellId, displayHp, toneText, type Float } from '@/features/battle/battle-events'
import { CharacterSprite } from '@/features/game/character-art'
import { scaleOf } from '@/features/game/character-images'
import { classLabels, type CharacterClass, type StatBlock, type StatusType } from '@/features/game/game-api'
import { statLabels, statOrder, statShort, statusLabels } from '@/features/game/game-labels'
import { statusEffects } from '@/features/game/skill-text'
import { cn } from '@/lib/cn'

/** O que a célula mostra na hora de escolher a jogada. */
export type CellMark = {
  /** Dá para clicar (alvo, destino ou aliado para trocar). */
  clickable?: boolean
  /** Atingido pela opção em foco. */
  hit?: boolean
  /** Opção escolhida. */
  selected?: boolean
  /** Prévia curta (ex.: "-13 · 99%"). */
  preview?: string
}

const statusShort: Record<StatusType, string> = {
  STUN: 'ATR',
  LOCK: 'TRV',
  ROOT: 'PRE',
  EXPOSE: 'EXP',
  MARK: 'MAR',
  DOT: 'DOT',
  TAUNT: 'PRV',
}

/** Cor da etiqueta: controle em laranja, o que aumenta o dano recebido em vermelho, Provocado em roxo. */
const statusTone: Record<StatusType, string> = {
  STUN: 'bg-warning text-bg',
  LOCK: 'bg-warning text-bg',
  ROOT: 'bg-warning text-bg',
  EXPOSE: 'bg-danger text-white',
  MARK: 'bg-danger text-white',
  DOT: 'bg-danger text-white',
  TAUNT: 'bg-primary text-on-primary',
}

/** Segundos de atraso na respiração: cada uma das 8 unidades num ponto diferente do ciclo. */
function breathDelay(ref: string) {
  const [side, index] = ref.split(':')
  return Number(index) * 0.85 + (side === 'OPPONENT' ? 0.4 : 0)
}

/** Quem caiu: a última célula e a arte, para o boneco ficar cinza no lugar. */
export type Grave = { side: Side; cell: Cell; name: string; templateKey: string; characterClass: CharacterClass }

/*
 * Campo em perspectiva, nas unidades do viewBox (1000 x 440). As linhas da formação vão do fundo da tela (linha 1) para
 * perto (linha 3): mais baixas, mais altas e maiores. As colunas saem do centro (frente) para as bordas (fundo).
 * O chão e as casas são SVG; os bonecos ficam por cima, em %, com os pés no meio da casa.
 */
const VIEW_W = 1000
const VIEW_H = 440
/** Bordas das linhas no chão (y), do fundo para perto. */
const ROW_Y = [176, 244, 320, 406]
/** Escala do chão em cada borda de linha: o que está perto é maior. */
const ROW_SCALE = [0.84, 0.92, 1, 1.1]
/** Bordas das colunas, medidas do centro (frente, meio, fundo), na escala 1. */
const COLUMN_X = [46, 150, 254, 358]
/** Altura do boneco na escala 1. */
const FIGURE_H = 170
/** Chão inteiro: um trapézio um pouco maior que as casas. */
const FLOOR = { top: 146, topHalf: 360, bottomHalf: 500 }

const SIDES: Side[] = ['PLAYER', 'OPPONENT']
const direction = (side: Side) => (side === 'PLAYER' ? -1 : 1)
const edgeX = (side: Side, columnEdge: number, rowEdge: number) => VIEW_W / 2 + direction(side) * COLUMN_X[columnEdge] * ROW_SCALE[rowEdge]

function tilePoints(side: Side, { row, column }: Cell) {
  return [
    [edgeX(side, column, row), ROW_Y[row]],
    [edgeX(side, column + 1, row), ROW_Y[row]],
    [edgeX(side, column + 1, row + 1), ROW_Y[row + 1]],
    [edgeX(side, column, row + 1), ROW_Y[row + 1]],
  ]
    .map((p) => p.join(','))
    .join(' ')
}

/** Ponto dos pés (meio da casa) e a escala ali. */
function feetOf(side: Side, { row, column }: Cell) {
  const scale = (ROW_SCALE[row] + ROW_SCALE[row + 1]) / 2
  return {
    x: VIEW_W / 2 + direction(side) * ((COLUMN_X[column] + COLUMN_X[column + 1]) / 2) * scale,
    y: (ROW_Y[row] + ROW_Y[row + 1]) / 2 + 4,
    scale,
  }
}

/**
 * Cor da casa: um só fill e um só stroke, pela prioridade (o `cn` não resolve classes em conflito). O alvo escolhido
 * (ataque, buff, debuff ou cura) fica aceso e brilhando; os outros atingidos pela mesma skill, um pouco menos.
 */
function tileTone(t: { ally: boolean; occupied: boolean; active: boolean; clickable: boolean; hovered: boolean; hit: boolean; selected: boolean }) {
  const { ally } = t
  if (t.selected)
    return ally
      ? 'fill-primary-soft/50 stroke-silver-bright drop-shadow-[0_0_10px_var(--color-ally)]'
      : 'fill-danger/55 stroke-silver-bright drop-shadow-[0_0_10px_var(--color-enemy)]'
  if (t.hit) return ally ? 'fill-primary-soft/30 stroke-primary-soft' : 'fill-danger/35 stroke-danger-hover'
  if (t.clickable && t.hovered) return ally ? 'fill-ally/30 stroke-primary-soft' : 'fill-enemy/30 stroke-danger-hover'
  if (t.clickable) return ally ? 'fill-ally/14 stroke-primary-soft/80' : 'fill-enemy/14 stroke-danger-hover/80'
  if (t.active) return ally ? 'fill-ally/20 stroke-ally/50' : 'fill-enemy/20 stroke-enemy/50'
  if (t.occupied) return ally ? 'fill-ally/6 stroke-ally/30' : 'fill-enemy/6 stroke-enemy/30'
  return 'fill-transparent stroke-silver/10'
}

/** x da borda do chão na altura y (lado esquerdo; o direito é o espelho). */
const floorLeftX = (y: number) =>
  VIEW_W / 2 - (FLOOR.topHalf + ((FLOOR.bottomHalf - FLOOR.topHalf) * (y - FLOOR.top)) / (VIEW_H - FLOOR.top))

type BoardProps = {
  units: BattleUnit[]
  /** Última célula de quem caiu (das jogadas já reproduzidas): fica uma marca no lugar. */
  ghosts: Map<string, Grave>
  activeRef: string | null
  marks: Map<string, CellMark>
  floats: Float[]
  /** Quem acabou de levar golpe (treme e pisca). */
  impacted: Set<string>
  hitId: number
  /** Quem está agindo agora (avança na direção do inimigo). */
  acting: { ref: string; id: number } | null
  onCellClick: (side: Side, cell: Cell) => void
  onCellHover: (side: Side, cell: Cell | null) => void
  unitName: (ref: string) => string
  /** Mostra o painel da unidade ao passar o mouse (desligado durante a animação). */
  inspect: boolean
  /** Stats fora da batalha dos seus personagens (por characterId), para comparar com os atuais. */
  baseStats: Map<string, StatBlock>
}

/**
 * O campo de batalha: um chão só, com as duas formações frente a frente (o jogador à esquerda, o inimigo à direita,
 * as frentes viradas para o centro). As casas são o alvo do clique e do teclado; os bonecos também respondem ao mouse.
 */
export function BattleBoard({ units, ghosts, activeRef, marks, floats, impacted, hitId, acting, onCellClick, onCellHover, unitName, inspect, baseStats }: BoardProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const hover = (side: Side, cell: Cell | null) => {
    setHovered(cell ? cellId(side, cell) : null)
    onCellHover(side, cell)
  }

  const cells = SIDES.flatMap((side) =>
    [0, 1, 2].flatMap((row) =>
      [0, 1, 2].map((column) => {
        const cell = { row, column }
        const unit = units.find((u) => u.side === side && u.alive && u.position?.row === row && u.position.column === column)
        // quem caiu nesta jogada ainda tem a posição na cópia de exibição; os de antes vêm de ghosts
        const fallen = units.find((u) => u.side === side && !u.alive && u.position?.row === row && u.position.column === column)
        const ghost = unit ? undefined : (fallen ?? [...ghosts.values()].find((g) => g.side === side && g.cell.row === row && g.cell.column === column))
        return { side, cell, id: cellId(side, cell), unit, ghost }
      }),
    ),
  )

  return (
    // largura limitada pela altura da tela: o campo inteiro (e as barras acima das cabeças) cabe sem rolar
    <div
      className="relative mx-auto aspect-[1000/440] w-[min(100%,76rem,calc((100dvh_-_18rem)*2.27))]"
      aria-label="Campo de batalha"
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id="battle-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-silver)" stopOpacity="0" />
            <stop offset="0.25" stopColor="var(--color-silver)" stopOpacity="0.05" />
            <stop offset="1" stopColor="var(--color-silver)" stopOpacity="0.015" />
          </linearGradient>
          <radialGradient id="battle-floor-ally" cx="0.25" cy="0.6" r="0.45">
            <stop offset="0" stopColor="var(--color-ally)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--color-ally)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="battle-floor-enemy" cx="0.75" cy="0.6" r="0.45">
            <stop offset="0" stopColor="var(--color-enemy)" stopOpacity="0.13" />
            <stop offset="1" stopColor="var(--color-enemy)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* chão: o trapézio, a luz de cada lado e as emendas das linhas de ponta a ponta */}
        {['url(#battle-floor)', 'url(#battle-floor-ally)', 'url(#battle-floor-enemy)'].map((fill) => (
          <polygon
            key={fill}
            points={`${floorLeftX(FLOOR.top)},${FLOOR.top} ${VIEW_W - floorLeftX(FLOOR.top)},${FLOOR.top} ${VIEW_W},${VIEW_H} 0,${VIEW_H}`}
            fill={fill}
          />
        ))}
        {ROW_Y.map((y) => (
          <line key={y} x1={floorLeftX(y)} x2={VIEW_W - floorLeftX(y)} y1={y} y2={y} className="stroke-silver/6" />
        ))}
        <line x1={VIEW_W / 2} x2={VIEW_W / 2} y1={FLOOR.top} y2={VIEW_H} strokeDasharray="4 8" className="stroke-silver/20" />

        {cells.map(({ side, cell, id, unit, ghost }) => {
          const ally = side === 'PLAYER'
          const mark = marks.get(id)
          const clickable = !!mark?.clickable
          const active = !!unit && unit.ref === activeRef
          return (
            <polygon
              key={id}
              points={tilePoints(side, cell)}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : -1}
              aria-label={unit ? `${unit.name}, ${displayHp(unit.hp)} de ${displayHp(unit.maxHp)} HP` : ghost ? `${ghost.name}, caído` : 'Célula vazia'}
              strokeWidth={mark?.selected ? 3 : mark?.hit ? 2 : 1.2}
              strokeDasharray={clickable && !mark?.hit && !mark?.selected ? '7 5' : undefined}
              strokeLinejoin="round"
              className={cn(
                'outline-none transition-[fill,stroke] duration-150 focus-visible:stroke-ring',
                clickable && 'cursor-pointer',
                tileTone({ ally, occupied: !!unit, active, clickable, hovered: hovered === id, hit: !!mark?.hit, selected: !!mark?.selected }),
              )}
              onClick={clickable ? () => onCellClick(side, cell) : undefined}
              onKeyDown={(e) => {
                if (!clickable || (e.key !== 'Enter' && e.key !== ' ')) return
                // o Enter da página executaria a escolha anterior
                e.preventDefault()
                e.stopPropagation()
                onCellClick(side, cell)
              }}
              onMouseEnter={() => hover(side, cell)}
              onMouseLeave={() => hover(side, null)}
              onFocus={() => hover(side, cell)}
              onBlur={() => hover(side, null)}
            />
          )
        })}

        {/* nome das colunas na beira do chão, embaixo de cada uma */}
        {SIDES.flatMap((side) =>
          [0, 1, 2].map((column) => (
            <text
              key={`${side}-${column}`}
              x={VIEW_W / 2 + direction(side) * ((COLUMN_X[column] + COLUMN_X[column + 1]) / 2) * ROW_SCALE[3]}
              y={ROW_Y[3] + 20}
              textAnchor="middle"
              fontSize={11}
              letterSpacing={3}
              className={cn(
                'pointer-events-none font-mono uppercase',
                column === 0 ? (side === 'PLAYER' ? 'fill-primary-soft' : 'fill-danger-hover') : 'fill-fg-subtle',
              )}
            >
              {column === 0 ? 'Frente' : column === 1 ? 'Meio' : 'Fundo'}
            </text>
          )),
        )}
      </svg>

      {cells.map(({ side, cell, id, unit, ghost }) =>
        unit || ghost ? (
          <UnitFigure
            key={id}
            side={side}
            cell={cell}
            unit={unit}
            ghost={ghost}
            active={!!unit && unit.ref === activeRef}
            mark={marks.get(id)}
            floats={unit ? floats.filter((f) => f.ref === unit.ref) : []}
            hitKey={unit && impacted.has(unit.ref) ? hitId : null}
            attackKey={unit && acting?.ref === unit.ref ? acting.id : null}
            onClick={() => onCellClick(side, cell)}
            onHover={(on) => hover(side, on ? cell : null)}
            inspector={
              unit &&
              inspect && (
                <UnitInspector unit={unit} unitName={unitName} base={unit.characterId ? baseStats.get(unit.characterId) : undefined} />
              )
            }
          />
        ) : null,
      )}
    </div>
  )
}

/**
 * O boneco em pé na casa, sem moldura: a barra de vida e o nome flutuam acima da cabeça, os status logo abaixo dela.
 * Os de perto ficam na frente dos de trás. Só o corpo responde ao mouse (o teclado vai pelas casas).
 */
function UnitFigure({ side, cell, unit, ghost, active, mark, floats, hitKey, attackKey, onClick, onHover, inspector }: {
  side: Side
  cell: Cell
  unit?: BattleUnit
  ghost?: Pick<Grave, 'name' | 'templateKey' | 'characterClass'>
  active: boolean
  mark?: CellMark
  floats: Float[]
  hitKey: number | null
  attackKey: number | null
  onClick: () => void
  onHover: (on: boolean) => void
  /** Painel com tudo da unidade, ao passar o mouse. */
  inspector?: ReactNode
}) {
  const ally = side === 'PLAYER'
  const art = (unit ?? ghost)!
  const feet = feetOf(side, cell)
  const height = FIGURE_H * feet.scale * scaleOf(art.templateKey)
  const hpPercent = unit ? Math.min(100, (unit.hp / unit.maxHp) * 100) : 0
  const shieldPercent = unit ? Math.min(100, (unit.shield / unit.maxHp) * 100) : 0
  const clickable = !!mark?.clickable
  // posição do corpo na tela para o painel da unidade (nulo = fechado)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const enter = (e: { currentTarget: HTMLElement }) => {
    onHover(true)
    const el = e.currentTarget
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAnchor(el.getBoundingClientRect()), 150)
  }
  const leave = () => {
    onHover(false)
    clearTimeout(timer.current)
    setAnchor(null)
  }

  const style: CSSProperties = {
    left: `${(feet.x / VIEW_W) * 100}%`,
    top: `${(feet.y / VIEW_H) * 100}%`,
    width: `${(height / VIEW_W) * 100}%`,
    height: `${(height / VIEW_H) * 100}%`,
    // linhas de perto na frente; quem leva golpe passa por cima dos vizinhos
    zIndex: 10 + cell.row * 10 + (hitKey != null ? 5 : 0),
  }

  return (
    <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full" style={style}>
      <CharacterSprite
        templateKey={art.templateKey}
        characterClass={art.characterClass}
        side={side}
        dead={!unit}
        active={active}
        attackKey={attackKey}
        hitKey={hitKey}
        breathDelay={unit ? breathDelay(unit.ref) : 0}
      />

      {unit ? (
        <>
          {/* o corpo (a imagem é quadrada, o personagem ocupa o meio) */}
          <div
            aria-hidden
            className={cn('pointer-events-auto absolute inset-x-[28%] top-[4%] bottom-0', clickable ? 'cursor-pointer' : 'cursor-default')}
            onClick={clickable ? onClick : undefined}
            onMouseEnter={enter}
            onMouseLeave={leave}
          />

          {/* apagada fora da vez dele, para não pesar no campo; acesa na vez ou com prévia de alvo */}
          <div
            className={cn(
              'absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 flex-col items-center gap-1 transition-opacity duration-300',
              active || mark?.preview ? 'opacity-100' : 'opacity-45',
            )}
          >
            {mark?.preview && (
              <span className="border border-line-strong bg-bg/90 px-1.5 py-px font-mono text-[10px] font-semibold whitespace-nowrap text-silver-bright">
                {mark.preview}
              </span>
            )}
            {/* plaquinha acima da cabeça: nome, HP e escudo */}
            <span className={cn('block w-22 border-l-2 bg-bg/75 px-1.5 pt-1 pb-1.5 backdrop-blur-sm', ally ? 'border-ally' : 'border-enemy')}>
              <span className="flex items-baseline justify-between gap-1">
                <span className="truncate font-display text-[13px] leading-none font-bold uppercase tracking-wide text-silver-bright">
                  {unit.name.split(' ')[0]}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-fg-subtle">{unit.level}</span>
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden bg-overlay">
                <span
                  className={cn('block h-full transition-[width] duration-300 ease-out-soft', ally ? 'bg-ally' : 'bg-enemy')}
                  style={{ width: `${hpPercent}%` }}
                />
              </span>
              {shieldPercent > 0 && (
                <span className="mt-px block h-0.5 bg-info transition-[width] duration-300" style={{ width: `${shieldPercent}%` }} />
              )}
              <span className="mt-0.5 block font-mono text-[9px] leading-none text-fg-muted tabular-nums">
                {displayHp(unit.hp)}
                {unit.shield > 0 && <span className="text-info"> +{displayHp(unit.shield)}</span>}
              </span>
            </span>
            {/* status e condições (o detalhe fica no painel) */}
            {(unit.statuses.length > 0 || unit.protectedBy || unit.engaged) && (
              <span className="flex flex-wrap justify-center gap-0.5">
                {unit.statuses.map((s) => (
                  <span key={s} className={cn('px-1 font-mono text-[9px] leading-tight font-bold', statusTone[s])}>
                    {statusShort[s]}
                  </span>
                ))}
                {unit.protectedBy && <span className="bg-info px-1 font-mono text-[9px] leading-tight font-bold text-bg">PROT</span>}
                {unit.engaged && (
                  <span className="border border-line-strong bg-bg px-1 font-mono text-[9px] leading-tight font-bold text-fg-muted">ENG</span>
                )}
              </span>
            )}
          </div>

          {inspector && anchor && <FloatingPanel anchor={anchor}>{inspector}</FloatingPanel>}
        </>
      ) : (
        // caído: o boneco cinza fica no lugar, com o nome nos pés
        <span className="absolute top-full left-1/2 mt-1 flex -translate-x-1/2 items-center gap-1 font-mono text-[9px] whitespace-nowrap uppercase text-fg-subtle">
          <Skull className="size-3" />
          {art.name.split(' ')[0]}
        </span>
      )}

      {floats.map((f) =>
        f.big ? (
          // palavra de impacto: maior, com fundo e o estouro
          <span key={f.id} className="pointer-events-none absolute top-1/4 left-1/2 z-30 -translate-x-1/2">
            <span
              className={cn(
                'block animate-pop-up border border-current/40 bg-bg/90 px-2 py-0.5 font-display text-xl leading-none font-extrabold whitespace-nowrap uppercase italic shadow-panel',
                toneText[f.tone],
              )}
            >
              {f.text}
            </span>
          </span>
        ) : (
          <span
            key={f.id}
            className={cn(
              'pointer-events-none absolute -inset-x-full top-1/4 z-30 animate-float-up text-center font-display text-3xl font-extrabold whitespace-nowrap italic drop-shadow-[0_2px_4px_rgb(0_0_0/0.9)]',
              toneText[f.tone],
            )}
          >
            {f.text}
          </span>
        ),
      )}
    </div>
  )
}

type Condition = { label: string; short: string; text: string; tone: string }

/** Tudo o que a API mostra da unidade: HP, escudo, status e o que fazem, condições e, nas suas, os stats atuais. */
function UnitInspector({ unit, unitName, base }: {
  unit: BattleUnit
  unitName: (ref: string) => string
  base?: StatBlock
}) {
  const ally = unit.side === 'PLAYER'
  const conditions: Condition[] = []
  if (unit.tauntedBy)
    conditions.push({ label: 'Provocado', short: 'PRV', tone: statusTone.TAUNT, text: `por ${unitName(unit.tauntedBy)}: golpes de alvo único só podem mirar quem provocou.` })
  if (unit.protectedBy)
    conditions.push({ label: 'Protegido', short: 'PROT', tone: 'bg-info text-bg', text: `por ${unitName(unit.protectedBy)}: golpes de alvo único nele caem no protetor até o próximo turno dele.` })
  if (unit.engaged)
    conditions.push({ label: 'Engajado', short: 'ENG', tone: 'border border-line-strong text-fg-muted', text: 'na frente, encarando um Vanguarda, Guardião ou Executor: mover ou trocar custa o turno inteiro.' })
  // Provocado já aparece como condição (com quem provocou)
  const statuses = unit.statuses.filter((s) => !(s === 'TAUNT' && unit.tauntedBy))

  return (
    <span
      role="tooltip"
      className={cn('block w-72 border bg-surface p-3 text-left shadow-panel', ally ? 'border-primary-soft/50' : 'border-enemy/50')}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{unit.name}</span>
        <span className={cn('font-mono text-[10px] uppercase tracking-[0.14em]', ally ? 'text-primary-soft' : 'text-danger-hover')}>
          {ally ? 'Aliado' : 'Inimigo'}
        </span>
      </span>
      <span className="block font-mono text-[10px] text-fg-muted">
        {classLabels[unit.characterClass]} · LV {unit.level} · {displayHp(unit.hp)}/{displayHp(unit.maxHp)} HP
        {unit.shield > 0 && <span className="text-info"> · escudo {displayHp(unit.shield)}</span>}
      </span>

      <span className="mt-2.5 block space-y-1.5 border-t border-line/70 pt-2">
        {statuses.length === 0 && conditions.length === 0 && <span className="block text-xs text-fg-subtle">Nenhum status ativo.</span>}
        {statuses.map((s) => (
          <span key={s} className="flex gap-2 text-xs leading-snug">
            <span className={cn('h-fit shrink-0 px-1 font-mono text-[9px] font-bold', statusTone[s])}>{statusShort[s]}</span>
            <span className="text-fg-muted">
              <span className="font-semibold text-fg">{statusLabels[s]}</span>: {statusEffects[s]}.
            </span>
          </span>
        ))}
        {conditions.map((c) => (
          <span key={c.label} className="flex gap-2 text-xs leading-snug">
            <span className={cn('h-fit shrink-0 px-1 font-mono text-[9px] font-bold', c.tone)}>{c.short}</span>
            <span className="text-fg-muted">
              <span className="font-semibold text-fg">{c.label}</span> {c.text}
            </span>
          </span>
        ))}
      </span>

      {ally && unit.stats ? (
        <span className="mt-2.5 block border-t border-line/70 pt-2">
          <span className="grid grid-cols-4 gap-x-2 gap-y-1">
            {statOrder.map((stat) => {
              const now = Math.round(unit.stats![stat])
              const diff = base ? now - base[stat] : 0
              return (
                <span key={stat} className="font-mono text-[10px]" title={statLabels[stat]}>
                  <span className="text-fg-subtle">{statShort[stat]} </span>
                  <span className="text-fg tabular-nums">{now}</span>
                  {diff !== 0 && (
                    <span className={diff > 0 ? 'text-success' : 'text-danger-hover'}>
                      {' '}
                      {diff > 0 ? '+' : ''}
                      {diff}
                    </span>
                  )}
                </span>
              )
            })}
          </span>
          {base && (
            <span className="mt-1.5 block text-[10px] leading-snug text-fg-subtle">
              Comparado com fora da batalha: inclui campo, auras, buffs, debuffs e Desgaste.
            </span>
          )}
        </span>
      ) : (
        !ally && (
          <span className="mt-2.5 block border-t border-line/70 pt-2 text-[10px] leading-snug text-fg-subtle">
            {unit.skills.length > 0 && `Skills vistas: ${unit.skills.map((sk) => sk.name).join(', ')}. `}
            Os stats do inimigo ficam ocultos.
          </span>
        )
      )}
    </span>
  )
}

const PANEL_WIDTH = 288 // w-72
const GAP = 10
const MARGIN = 8

/**
 * Painel preso à célula, fora da árvore da grade (portal no body, posição fixa): abre do lado com mais espaço,
 * acima ou abaixo, e fica dentro da tela na horizontal.
 */
function FloatingPanel({ anchor, children }: { anchor: DOMRect; children: ReactNode }) {
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight
  const above = anchor.top >= viewportH - anchor.bottom
  const left = Math.min(Math.max(anchor.left + anchor.width / 2 - PANEL_WIDTH / 2, MARGIN), viewportW - PANEL_WIDTH - MARGIN)
  const style = above
    ? { left, bottom: viewportH - anchor.top + GAP, maxHeight: anchor.top - GAP - MARGIN }
    : { left, top: anchor.bottom + GAP, maxHeight: viewportH - anchor.bottom - GAP - MARGIN }

  return createPortal(
    <span className="pointer-events-none fixed z-60 block animate-fade-in overflow-y-auto" style={style}>
      {children}
    </span>,
    document.body,
  )
}

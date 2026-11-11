import type { Battle, BattleEvent, BattleState, BattleUnit, Cell, Side } from '@/features/battle/battle-api'
import { statLabels, statusLabels } from '@/features/game/game-labels'

// Leitura dos eventos que o servidor mandou: texto do registro e o passo visual da animação.
// Nada aqui decide regra: o estado final de cada jogada vem sempre do servidor.

export type Tone = 'neutral' | 'ally' | 'enemy' | 'damage' | 'heal' | 'shield' | 'status' | 'muted' | 'warning'

/** Chave de uma célula das duas grades. */
export const cellId = (side: Side, cell: Cell) => `${side}:${cell.row}:${cell.column}`

/** Cor do texto de cada tom (registro e números que sobem). */
export const toneText: Record<Tone, string> = {
  neutral: 'text-fg',
  ally: 'text-primary-soft',
  enemy: 'text-danger-hover',
  damage: 'text-danger-hover',
  heal: 'text-success',
  shield: 'text-info',
  status: 'text-warning',
  muted: 'text-fg-subtle',
  warning: 'text-warning',
}

/** Ícone de cada ação do registro (o desenho fica no componente). */
export type LogIcon =
  | 'skill' | 'damage' | 'miss' | 'heal' | 'shield' | 'status' | 'resist' | 'buff' | 'debuff' | 'desgaste' | 'passive'
  | 'move' | 'time' | 'lock' | 'skip' | 'field' | 'defeated' | 'end'

/** Uma ação dentro da vez: ícone, texto e o número à direita (dano, cura, %). */
export type LogEntry = { id: number; icon: LogIcon; text: string; value?: string; tone: Tone }

/** Uma vez no registro: quem agiu e o que aconteceu. `ref` nulo = antes da primeira vez (campo inicial). */
export type LogTurn = { id: number; ref: string | null; round: number; extra: boolean; entries: LogEntry[] }

/** HP para exibir: o servidor pode mandar fração (Desgaste); vivo com 0,4 de HP aparece como 1. */
export const displayHp = (hp: number) => Math.ceil(Math.max(0, hp))

const humanize = (key: string) => {
  const name = key.split(':').pop() ?? key
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
}

/** Nomes de unidades, skills e campos para o texto (das skills do inimigo, só as já vistas). */
export function eventContext(battle?: Pick<Battle, 'units' | 'fields'>) {
  const units = new Map(battle?.units.map((u) => [u.ref, u]))
  const skills = new Map(battle?.units.flatMap((u) => u.skills.map((s) => [s.key, s.name] as const)))
  const fields = new Map(battle?.fields.map((f) => [f.key, f.name]))
  return {
    unit: (ref: string) => units.get(ref),
    name: (ref: string) => units.get(ref)?.name ?? ref,
    /** Nome do equipamento vivo da unidade, se tiver. */
    gear: (ref: string) => units.get(ref)?.gear?.name,
    skill: (key: string) => skills.get(key) ?? humanize(key),
    field: (key: string | null) => (key ? (fields.get(key) ?? humanize(key)) : 'sem campo'),
  }
}

type Context = ReturnType<typeof eventContext>

const sideTone = (ctx: Context, ref: string): Tone => (ctx.unit(ref)?.side === 'OPPONENT' ? 'enemy' : 'ally')
const n = (value: number) => Math.round(value)

/** Uma ação do registro, ou nulo para os eventos que não precisam de linha. O TURN vira o cabeçalho do bloco. */
function describeEvent(event: BattleEvent, ctx: Context): Omit<LogEntry, 'id'> | null {
  switch (event.type) {
    case 'TURN':
    case 'ROUND_END':
      return null
    case 'SKIP':
      return event.reason === 'GEAR'
        ? { icon: 'skip', text: `${ctx.gear(event.ref) ?? 'O equipamento'} age sozinho: ${ctx.name(event.ref)} perde a vez`, tone: 'status' }
        : { icon: 'skip', text: `${ctx.name(event.ref)} está ${statusLabels[event.reason]} e perde a vez`, tone: 'status' }
    case 'WOKE':
      return { icon: 'status', text: `${ctx.name(event.ref)} acorda`, tone: 'status' }
    case 'CLEANSE':
      return event.status
        ? { icon: 'heal', text: `${ctx.name(event.targetRef)} perde ${statusLabels[event.status]}`, tone: 'heal' }
        : { icon: 'heal', text: `${ctx.name(event.targetRef)} não tinha o que tirar`, tone: 'muted' }
    case 'SKILL':
      return { icon: 'skill', text: `Usa ${ctx.skill(event.skillKey)}`, tone: sideTone(ctx, event.ref) }
    case 'DAMAGE':
      // golpe anulado pelo Indestrutível (DOM): o servidor manda o DAMAGE com 0
      if (event.amount === 0 && event.shieldAbsorbed === 0)
        return { icon: 'shield', text: `${ctx.name(event.targetRef)} não sofre nada`, value: 'anulado', tone: 'shield' }
      return {
        icon: 'damage',
        text: `${ctx.name(event.targetRef)} sofre dano${event.linked ? ' pelo elo' : ''}${event.shieldAbsorbed ? ` (${n(event.shieldAbsorbed)} no escudo)` : ''}`,
        value: `-${n(event.amount + event.shieldAbsorbed)}`,
        tone: 'damage',
      }
    case 'MISS':
      return { icon: 'miss', text: `${ctx.name(event.targetRef)} esquivou`, value: 'errou', tone: 'muted' }
    case 'DOT':
      if (event.amount === 0) return { icon: 'shield', text: `${ctx.name(event.ref)} não sofre o dano contínuo`, value: 'anulado', tone: 'shield' }
      return { icon: 'damage', text: `${ctx.name(event.ref)} sofre dano contínuo`, value: `-${n(event.amount)}`, tone: 'damage' }
    case 'HEAL':
      // cura com a vida cheia (passiva de regeneração) não rende linha
      if ((event.amount ?? 0) < 1) return null
      return {
        icon: 'heal',
        text: event.source === 'GEAR' ? `${ctx.name(event.targetRef)} regenera (${ctx.gear(event.targetRef) ?? 'equipamento'})` : `${ctx.name(event.targetRef)} recupera HP`,
        value: `+${n(event.amount ?? 0)}`,
        tone: 'heal',
      }
    case 'SHIELD':
      return { icon: 'shield', text: `${ctx.name(event.targetRef)} ganha escudo`, value: `+${n(event.amount ?? 0)}`, tone: 'shield' }
    case 'PROTECT':
      return { icon: 'shield', text: `Protege ${ctx.name(event.targetRef)}`, tone: 'shield' }
    case 'PROTECTED':
    case 'INTERCEPT': {
      const [protector, protectedRef] =
        event.type === 'PROTECTED' ? [event.protectorRef, event.protectedRef] : [event.guardianRef, event.protectedRef]
      return { icon: 'shield', text: `${ctx.name(protector)} entra na frente de ${ctx.name(protectedRef)}`, tone: 'shield' }
    }
    case 'GRANT_TURN':
      return { icon: 'time', text: `Dá a vez a ${ctx.name(event.targetRef)}`, tone: sideTone(ctx, event.ref) }
    case 'EXPLOIT':
      return {
        icon: 'damage',
        text: `Aproveita ${statusLabels[event.status]} em ${ctx.name(event.targetRef)}${event.consumed ? ' (consumido)' : ''}`,
        tone: 'damage',
      }
    case 'RECOVER':
      return { icon: 'heal', text: `${ctx.name(event.targetRef)} alivia o Desgaste`, tone: 'heal' }
    case 'MODIFIER':
      if (event.result === 'IGNORED') return null
      if (event.result === 'RESISTED')
        return { icon: 'resist', text: `${ctx.name(event.targetRef)} resiste a ${statLabels[event.stat]}`, tone: 'muted' }
      return {
        icon: event.percent > 0 ? 'buff' : 'debuff',
        text: `${ctx.name(event.targetRef)}: ${statLabels[event.stat]}`,
        value: `${event.percent > 0 ? '+' : ''}${event.percent}%`,
        tone: event.percent > 0 ? 'ally' : 'warning',
      }
    case 'STATUS': {
      // Dano contínuo da Elemental: vem do equipamento de quem bateu
      const by = event.source === 'GEAR' ? ` (${(event.ref && ctx.gear(event.ref)) ?? 'equipamento'})` : ''
      return event.result === 'RESISTED' || event.result === 'IMMUNE'
        ? {
            icon: 'resist',
            text: `${ctx.name(event.targetRef)} ${event.result === 'IMMUNE' ? 'está imune a' : 'resiste a'} ${statusLabels[event.status]}${by}`,
            tone: 'muted',
          }
        : { icon: 'status', text: `${ctx.name(event.targetRef)} fica ${statusLabels[event.status]}${by}`, tone: 'status' }
    }
    case 'WEAKEN':
      return event.result === 'RESISTED'
        ? { icon: 'resist', text: `${ctx.name(event.targetRef)} resiste ao enfraquecimento`, tone: 'muted' }
        : { icon: 'debuff', text: `${ctx.name(event.targetRef)}: todos os atributos`, value: `${event.percent}%`, tone: 'warning' }
    case 'INVULNERABLE':
      return { icon: 'shield', text: `${ctx.name(event.targetRef)} fica Indestrutível até o próximo turno`, tone: 'shield' }
    case 'LOCK':
      return { icon: 'lock', text: `${ctx.skill(event.skillKey)} de ${ctx.name(event.targetRef)} é travada`, tone: 'status' }
    case 'MOVE':
      return { icon: 'move', text: `${ctx.name(event.ref)} ${event.forced ? 'é deslocado' : 'se move'}`, tone: 'neutral' }
    case 'MOVE_BLOCKED':
      return { icon: 'resist', text: `${ctx.name(event.ref)} ${event.reason === 'RESISTED' ? 'resiste ao deslocamento' : 'não pode ser movido'}`, tone: 'muted' }
    case 'TURN_SHIFT':
      return {
        icon: 'time',
        text: `${ctx.name(event.targetRef)} ${event.percent >= 0 ? 'adianta' : 'atrasa'} a vez`,
        value: `${event.percent >= 0 ? '+' : '-'}${Math.abs(event.percent)}%`,
        tone: 'neutral',
      }
    case 'DESGASTE':
      return event.selfDamage >= 1 ? { icon: 'desgaste', text: 'Paga Desgaste', value: `-${n(event.selfDamage)} HP`, tone: 'warning' } : null
    case 'DEFEND':
      return { icon: 'shield', text: 'Defende', tone: 'shield' }
    case 'PASSIVE':
      return { icon: 'passive', text: `${ctx.name(event.ref)}: passiva ${event.name}`, tone: sideTone(ctx, event.ref) }
    case 'FIELD':
      return event.ref
        ? { icon: 'field', text: `Troca o campo para ${ctx.field(event.fieldKey)}`, tone: 'warning' }
        : { icon: 'field', text: `Campo: ${ctx.field(event.fieldKey)}`, tone: 'warning' }
    case 'DEFEATED':
      return { icon: 'defeated', text: `${ctx.name(event.ref)} foi derrotado`, tone: sideTone(ctx, event.ref) === 'enemy' ? 'ally' : 'enemy' }
    case 'BATTLE_END':
      return { icon: 'end', text: event.winner === 'PLAYER' ? 'Vitória' : 'Derrota', tone: event.winner === 'PLAYER' ? 'heal' : 'damage' }
  }
}

const ALL_STATS = 7

/**
 * Junta os 7 MODIFIER seguidos que a skill do Rei (DOM) põe em cada alvo, um por atributo, num evento só do front
 * (`WEAKEN`): no registro e na animação ficam uma linha e um número, não sete.
 */
export function foldModifiers(events: BattleEvent[]): BattleEvent[] {
  const out: BattleEvent[] = []
  for (let i = 0; i < events.length; i++) {
    const first = events[i]
    if (first.type === 'MODIFIER') {
      const run = events.slice(i, i + ALL_STATS)
      const same =
        run.length === ALL_STATS &&
        new Set(run.map((e) => e.type === 'MODIFIER' && e.stat)).size === ALL_STATS &&
        run.every((e) => e.type === 'MODIFIER' && e.targetRef === first.targetRef && e.percent === first.percent && e.result === first.result)
      if (same) {
        out.push({ type: 'WEAKEN', targetRef: first.targetRef, percent: first.percent, result: first.result })
        i += ALL_STATS - 1
        continue
      }
    }
    out.push(first)
  }
  return out
}

/** O registro em blocos: um por vez (TURN), com as ações dela em ordem. */
export function buildLog(events: BattleEvent[], ctx: Context): LogTurn[] {
  const turns: LogTurn[] = []
  let current: LogTurn | null = null
  events.forEach((event, i) => {
    if (event.type === 'TURN') {
      current = { id: i, ref: event.ref, round: event.round, extra: !!event.extra, entries: [] }
      turns.push(current)
      return
    }
    const entry = describeEvent(event, ctx)
    if (!entry) return
    if (!current) {
      current = { id: i, ref: null, round: 1, extra: false, entries: [] }
      turns.push(current)
    }
    current.entries.push({ ...entry, id: i })
  })
  return turns
}

/**
 * Eventos novos de uma jogada. A resposta de `POST /battles/:id/actions` repete o começo da vez do jogador (do último
 * `TURN` em diante: início de turno, passivas), que já estava no registro.
 */
export function newEvents(previous: BattleEvent[], incoming: BattleEvent[]): BattleEvent[] {
  const lastTurn = previous.map((e) => e.type).lastIndexOf('TURN')
  if (lastTurn < 0) return incoming
  const repeated = previous.slice(lastTurn)
  const same = repeated.every((event, i) => JSON.stringify(event) === JSON.stringify(incoming[i]))
  return same ? incoming.slice(repeated.length) : incoming
}

/** Texto que sobe da unidade durante a animação. */
/** `big`: palavra de impacto (ESQUIVOU!, ATORDOADO!), maior e com o estouro. */
export type Float = { id: number; ref: string; text: string; tone: Tone; big?: boolean }

/**
 * Um passo da animação: aplica o evento numa cópia das unidades só para exibir (HP, escudo, posição, derrota)
 * enquanto a jogada é reproduzida. No fim, a tela troca tudo pelo estado do servidor.
 */
export function stepUnits(units: BattleUnit[], event: BattleEvent): { units: BattleUnit[]; floats: Omit<Float, 'id'>[] } {
  const floats: Omit<Float, 'id'>[] = []
  const patch = (ref: string, change: (u: BattleUnit) => Partial<BattleUnit>) => {
    units = units.map((u) => (u.ref === ref ? { ...u, ...change(u) } : u))
  }

  switch (event.type) {
    case 'TURN':
      // o Indestrutível acaba no começo do próximo turno de quem usou
      if (!event.extra) patch(event.ref, () => ({ invulnerable: false }))
      break
    case 'DAMAGE':
      if (event.amount === 0 && event.shieldAbsorbed === 0) {
        floats.push({ ref: event.targetRef, text: 'Anulado!', tone: 'shield', big: true })
        break
      }
      patch(event.targetRef, (u) => ({ hp: Math.max(0, u.hp - event.amount), shield: Math.max(0, u.shield - event.shieldAbsorbed) }))
      floats.push({ ref: event.targetRef, text: `-${n(event.amount + event.shieldAbsorbed)}`, tone: 'damage' })
      break
    case 'DOT':
      patch(event.ref, (u) => ({ hp: Math.max(0, u.hp - event.amount) }))
      floats.push(
        event.amount === 0
          ? { ref: event.ref, text: 'Anulado!', tone: 'shield', big: true }
          : { ref: event.ref, text: `-${n(event.amount)}`, tone: 'damage' },
      )
      break
    case 'INVULNERABLE':
      patch(event.targetRef, () => ({ invulnerable: true }))
      floats.push({ ref: event.targetRef, text: 'Indestrutível!', tone: 'shield', big: true })
      break
    case 'WEAKEN':
      floats.push(
        event.result === 'RESISTED'
          ? { ref: event.targetRef, text: 'Resistiu!', tone: 'muted', big: true }
          : { ref: event.targetRef, text: `Tudo ${event.percent}%`, tone: 'status', big: true },
      )
      break
    case 'DESGASTE':
      if (event.selfDamage >= 1) {
        patch(event.ref, (u) => ({ hp: Math.max(0, u.hp - event.selfDamage) }))
        floats.push({ ref: event.ref, text: `-${n(event.selfDamage)} Desgaste`, tone: 'warning' })
      }
      break
    case 'HEAL':
      patch(event.targetRef, (u) => ({ hp: Math.min(u.maxHp, u.hp + (event.amount ?? 0)) }))
      if ((event.amount ?? 0) >= 1) floats.push({ ref: event.targetRef, text: `+${n(event.amount ?? 0)}`, tone: 'heal' })
      break
    case 'SHIELD':
      patch(event.targetRef, (u) => ({ shield: u.shield + (event.amount ?? 0) }))
      floats.push({ ref: event.targetRef, text: `+${n(event.amount ?? 0)} escudo`, tone: 'shield' })
      break
    case 'MISS':
      floats.push({ ref: event.targetRef, text: 'Esquivou!', tone: 'neutral', big: true })
      break
    case 'STATUS':
      floats.push({
        ref: event.targetRef,
        text: event.result === 'RESISTED' ? 'Resistiu!' : event.result === 'IMMUNE' ? 'Imune' : `${statusLabels[event.status]}!`,
        tone: event.result === 'RESISTED' || event.result === 'IMMUNE' ? 'muted' : 'status',
        big: true,
      })
      if (event.result === 'APPLIED' || event.result === 'RENEWED')
        patch(event.targetRef, (u) => ({ statuses: u.statuses.includes(event.status) ? u.statuses : [...u.statuses, event.status] }))
      break
    case 'MODIFIER':
      if (event.result === 'RESISTED') floats.push({ ref: event.targetRef, text: 'Resistiu!', tone: 'muted' })
      else if (event.result !== 'IGNORED')
        floats.push({ ref: event.targetRef, text: `${statLabels[event.stat]} ${event.percent > 0 ? '+' : ''}${event.percent}%`, tone: 'status' })
      break
    case 'MOVE':
      patch(event.ref, () => ({ position: event.to }))
      break
    case 'DEFEND':
      floats.push({ ref: event.ref, text: 'Defendendo', tone: 'shield', big: true })
      break
    case 'MOVE_BLOCKED':
      floats.push({ ref: event.ref, text: event.reason === 'RESISTED' ? 'Firme!' : 'Bloqueado', tone: 'muted', big: true })
      break
    case 'PROTECTED':
      floats.push({ ref: event.protectorRef, text: 'Protegeu!', tone: 'shield', big: true })
      break
    case 'INTERCEPT':
      floats.push({ ref: event.guardianRef, text: 'Interceptou!', tone: 'shield', big: true })
      break
    case 'LOCK':
      floats.push({ ref: event.targetRef, text: 'Travado!', tone: 'status', big: true })
      break
    case 'PASSIVE':
      floats.push({ ref: event.ref, text: event.name, tone: 'status' })
      break
    case 'SKIP':
      floats.push({ ref: event.ref, text: event.reason === 'GEAR' ? 'Rebelde!' : `${statusLabels[event.reason]}!`, tone: 'status', big: true })
      break
    case 'WOKE':
      patch(event.ref, (u) => ({ statuses: u.statuses.filter((s) => s !== 'SLEEP') }))
      floats.push({ ref: event.ref, text: 'Acordou!', tone: 'status', big: true })
      break
    case 'CLEANSE':
      if (event.status) {
        patch(event.targetRef, (u) => ({ statuses: u.statuses.filter((s) => s !== event.status) }))
        floats.push({ ref: event.targetRef, text: 'Purificado!', tone: 'heal', big: true })
      }
      break
    case 'DEFEATED':
      patch(event.ref, () => ({ alive: false, hp: 0 }))
      floats.push({ ref: event.ref, text: 'Abatido!', tone: 'damage', big: true })
      break
  }

  return { units, floats }
}

/** Tempo de cada evento na animação (os de texto passam rápido). */
export function stepDelay(event: BattleEvent): number {
  switch (event.type) {
    case 'TURN':
      // a vez chega na unidade (destaque) antes de ela agir
      return 550
    case 'SKILL':
      return 900
    case 'SKIP':
      // o aviso de atordoado fica na tela antes da próxima vez
      return 1500
    case 'DAMAGE':
    case 'HEAL':
    case 'SHIELD':
    case 'MISS':
    case 'WEAKEN':
    case 'INVULNERABLE':
    case 'DEFEATED':
    case 'MOVE':
    case 'DOT':
      return 420
    case 'ROUND_END':
    case 'TURN_SHIFT':
      return 60
    default:
      return 260
  }
}

/**
 * Unidades do começo da batalha, para reproduzir a abertura quando a máquina age antes da primeira vez do jogador
 * (o estado já chega com essas vezes resolvidas). Nulo quando não há o que reproduzir: o jogador já agiu ou ninguém da
 * máquina agiu ainda. Volta todos à vida cheia, sem escudo nem status; a posição fica a atual (o MOVE não diz de onde saiu).
 */
export function openingUnits(state: BattleState): BattleUnit[] | null {
  const sides = new Map(state.battle.units.map((u) => [u.ref, u.side]))
  const isPlayer = (ref: string) => sides.get(ref) === 'PLAYER'
  const playerActed = state.events.some(
    (e) => ((e.type === 'SKILL' || e.type === 'DEFEND') && isPlayer(e.ref)) || (e.type === 'MOVE' && !e.forced && isPlayer(e.ref)),
  )
  const opponentTurn = state.events.some((e) => e.type === 'TURN' && !isPlayer(e.ref))
  if (playerActed || !opponentTurn) return null
  return state.battle.units.map((u) => ({
    ...u,
    hp: u.maxHp,
    shield: 0,
    alive: true,
    statuses: [],
    tauntedBy: null,
    protectedBy: null,
    invulnerable: false,
    engaged: false,
  }))
}

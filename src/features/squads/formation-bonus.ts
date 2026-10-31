import type { Character, CharacterClass, FormationBonusValues } from '@/features/game/game-api'
import { classAuras, statLabels, statShort } from '@/features/game/game-labels'

// Bônus de formação (D128) na montagem do esquadrão. Os valores vêm de GET /formation-bonuses; as condições (adjacência,
// fundo da linha, sem aliado ao lado, Vanguarda ancora) espelham `battle-engine.ts` (`formationMultiplier`,
// `supportHealMultiplier`, `anchoredByVanguard`, `artilleryMultiplier`) só para mostrar: quem aplica é o servidor.
// Mudou a condição lá, muda aqui.

/** Colunas da esquerda para a direita: fundo, meio, frente (a frente olha para o inimigo, à direita). */
export const visualColumns = [
  { column: 2, label: 'Fundo' },
  { column: 1, label: 'Meio' },
  { column: 0, label: 'Frente' },
]

/** O que o cálculo usa do personagem (o tutorial monta exemplos só com a classe). */
export type FormationUnit = Pick<Character, 'id' | 'name' | 'characterClass'>

export type PlacedCharacter = { character: FormationUnit; row: number; column: number }

export type FormationBonus = {
  /** Etiqueta curta, sobre o retrato na grade. */
  chip: string
  text: string
  /** Quem dá o bônus; vazio = vem da própria classe. */
  from: string[]
  /** Célula vazia: quem vier para cá tira este bônus de um aliado da grade. */
  loss?: boolean
}

export type FormationReport = {
  character: FormationUnit
  bonuses: FormationBonus[]
  /** Por que o bônus ou a aura da própria classe não vale nesta posição. */
  idle: string | null
}

export const bonusSource = (bonus: FormationBonus) => (bonus.from.length > 0 ? bonus.from.join(', ') : 'Classe')
export const bonusTitle = (bonus: FormationBonus) => `${bonus.text} (${bonusSource(bonus)})`
// os valores vêm da API: duas classes podem dar a mesma etiqueta
export const bonusKey = (bonus: FormationBonus) => `${bonus.chip}:${bonusSource(bonus)}`
export const bonusValuesMessage = (failed: boolean) => (failed ? 'Não foi possível carregar os bônus de formação.' : 'Carregando os bônus de formação...')

type Cell = { row: number; column: number }

const isAdjacent = (a: Cell, b: Cell) => Math.abs(a.row - b.row) + Math.abs(a.column - b.column) === 1

const statAuraOf = (values: FormationBonusValues, characterClass: CharacterClass) =>
  values.statAuras.find((aura) => aura.characterClass === characterClass)

/** O que os vizinhos dão a quem estiver ao lado deles. Auras iguais não somam: cada classe vizinha conta uma vez. */
function auraBonuses(neighbours: PlacedCharacter[], values: FormationBonusValues): FormationBonus[] {
  const namesOf = (characterClass: CharacterClass) =>
    neighbours.filter((n) => n.character.characterClass === characterClass).map((n) => n.character.name)
  const bonuses: FormationBonus[] = []

  for (const neighbourClass of new Set(neighbours.map((n) => n.character.characterClass))) {
    const aura = statAuraOf(values, neighbourClass)
    if (aura) {
      bonuses.push({
        chip: `+${aura.percent}% ${statShort[aura.stat]}`,
        text: `+${aura.percent}% de ${statLabels[aura.stat]}`,
        from: namesOf(neighbourClass),
      })
    }
  }
  if (namesOf('SUPPORT').length > 0) {
    bonuses.push({ chip: `+${values.supportHealPercent}% CURA`, text: `+${values.supportHealPercent}% na cura recebida`, from: namesOf('SUPPORT') })
  }
  if (namesOf('VANGUARD').length > 0) {
    bonuses.push({ chip: 'ANCORADO', text: 'Não pode ser empurrado, puxado nem trocado à força', from: namesOf('VANGUARD') })
  }

  return bonuses
}

/** Bônus da própria classe valendo: Executor sem ninguém ao lado, Artilharia no fundo da linha com alguém à frente. */
function selfBonusActive(unit: PlacedCharacter, cells: Cell[]): boolean {
  if (unit.character.characterClass === 'EXECUTOR') return !cells.some((cell) => isAdjacent(unit, cell))
  if (unit.character.characterClass !== 'ARTILLERY') return false
  const line = cells.filter((cell) => cell.row === unit.row)
  return line.length > 1 && !line.some((cell) => cell.column > unit.column)
}

/** O que muda se alguém vier para esta célula vazia: o que ele recebe dos vizinhos e o bônus próprio que liga ou desliga em quem já está na grade. */
export function cellBonuses(placed: PlacedCharacter[], cell: Cell, values: FormationBonusValues): FormationBonus[] {
  const bonuses = auraBonuses(placed.filter((unit) => isAdjacent(unit, cell)), values)

  for (const unit of placed) {
    const active = selfBonusActive(unit, placed)
    if (active === selfBonusActive(unit, [...placed, cell])) continue
    const { name, characterClass } = unit.character
    const [percent, chipLabel, label] =
      characterClass === 'EXECUTOR'
        ? [values.executorLoneAttackPercent, statShort.ATTACK, 'de Ataque']
        : [values.artilleryBackDamagePercent, 'DANO', 'de dano']
    bonuses.push({
      chip: `${name.split(' ')[0].toUpperCase()} ${active ? '−' : '+'}${percent}% ${chipLabel}`,
      text: `${name} ${active ? 'perde' : 'ganha'} ${percent}% ${label}`,
      from: [name],
      loss: active,
    })
  }

  return bonuses
}

/** O que a classe dá na formação, com os valores da API. */
export function classAuraText(characterClass: CharacterClass, values: FormationBonusValues): string {
  const aura = statAuraOf(values, characterClass)
  if (aura) return `+${aura.percent}% de ${statLabels[aura.stat]} nos adjacentes.`
  if (characterClass === 'SUPPORT') return `+${values.supportHealPercent}% na cura recebida pelos adjacentes.`
  if (characterClass === 'ARTILLERY') return `+${values.artilleryBackDamagePercent}% de dano no fundo da linha, com alguém na frente.`
  if (characterClass === 'EXECUTOR') return `+${values.executorLoneAttackPercent}% de Ataque sem nenhum aliado adjacente (lobo solitário).`
  if (characterClass === 'VANGUARD') return classAuras.VANGUARD
  return 'Sem aura de formação.'
}

/** O que cada personagem da grade recebe na posição atual, na ordem da tela (da esquerda para a direita). */
export function formationReports(placed: PlacedCharacter[], values: FormationBonusValues): FormationReport[] {
  return [...placed]
    .sort((a, b) => a.row - b.row || b.column - a.column)
    .map((unit) => {
      const neighbours = placed.filter((other) => isAdjacent(unit, other))
      const bonuses = auraBonuses(neighbours, values)

      const characterClass = unit.character.characterClass
      let idle: string | null = null
      const active = selfBonusActive(unit, placed)
      if (characterClass === 'EXECUTOR') {
        const percent = values.executorLoneAttackPercent
        if (active) {
          bonuses.push({ chip: `+${percent}% ${statShort.ATTACK}`, text: `Lobo solitário: +${percent}% de Ataque`, from: [] })
        } else {
          idle = `Lobo solitário (+${percent}% de Ataque) desligado: tem aliado ao lado.`
        }
      } else if (characterClass === 'ARTILLERY') {
        const percent = values.artilleryBackDamagePercent
        const line = placed.filter((other) => other.row === unit.row)
        if (active) {
          bonuses.push({ chip: `+${percent}% DANO`, text: `+${percent}% de dano no fundo da linha`, from: [] })
        } else if (line.length === 1 && unit.column > 0) {
          idle = `Sem os +${percent}% de dano: precisa de alguém à frente na linha.`
        } else {
          idle = `Sem os +${percent}% de dano: só vale no fundo da linha.`
        }
      } else if (neighbours.length === 0 && (statAuraOf(values, characterClass) || characterClass === 'SUPPORT' || characterClass === 'VANGUARD')) {
        idle = 'Aura sem efeito: nenhum aliado ao lado.'
      }

      return { character: unit.character, bonuses, idle }
    })
}

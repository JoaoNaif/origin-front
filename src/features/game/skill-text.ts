import type { SkillEffect, SkillInfo, StatusType } from '@/features/game/game-api'
import { statLabels, statusLabels } from '@/features/game/game-labels'

// O que a skill faz, em frases completas, a partir dos dados do catálogo. Os textos das regras seguem
// ../origin-game/docs/skills_brief.md (11.1 alcance, 12.4 status) e engine.md (reposicionamento).
// Só explica: os números de verdade de cada jogada vêm da prévia do servidor.

type SkillData = Pick<SkillInfo, 'target' | 'range' | 'area' | 'cooldown' | 'desgastePercent' | 'baseHitChance' | 'effects'>

/** O que cada status faz com quem recebe (`engine.md`, tabela de status). */
export const statusEffects: Record<StatusType, string> = {
  STUN: 'perde a próxima ação',
  LOCK: '+2 de recarga numa skill',
  ROOT: 'não pode se mover nem ser movido',
  EXPOSE: 'vira alvo de corpo a corpo mesmo atrás de alguém',
  MARK: 'recebe +20% de dano',
  DOT: 'perde 4% do HP máximo no início de cada turno',
  TAUNT: 'golpes de alvo único só podem mirar quem provocou',
}

const num = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const pct = (value: number) => `${Math.round(value * 100)}%`
const turns = (n: number) => `${n} ${n === 1 ? 'turno' : 'turnos'}`

/** Quem a skill atinge e como chega lá. */
export function describeTargeting(skill: Pick<SkillInfo, 'target' | 'range' | 'area'>): string {
  if (skill.target === 'SELF') return 'Em si mesmo.'
  if (skill.target === 'ALLY') {
    return {
      SINGLE: 'Um aliado à escolha.',
      LINE: 'Uma linha de aliados.',
      COLUMN: 'Uma coluna de aliados (a mesma profundidade nas 3 linhas).',
      GRID: 'Todos os aliados.',
    }[skill.area]
  }
  if (skill.area === 'GRID') return 'Todos os inimigos, sem bloqueio.'
  if (skill.area === 'COLUMN') return 'Uma coluna inimiga (a mesma profundidade nas 3 linhas), todos com 100%.'
  if (skill.area === 'LINE' || skill.range === 'PIERCING') {
    return skill.range === 'PIERCING'
      ? 'Atravessa a linha inteira: todos nela levam 100%.'
      : 'Uma linha inimiga: 100% no primeiro, 60% no segundo e 30% no terceiro.'
  }
  switch (skill.range) {
    case 'MELEE':
      return 'Um inimigo, corpo a corpo: só o primeiro da linha.'
    case 'RANGED':
      return 'Um inimigo à distância, em qualquer célula; quem está atrás de alguém leva ×0,7.'
    case 'FLANK':
      return 'Um inimigo pelo flanco: o último da linha, por trás, ignorando quem está na frente.'
    default:
      return 'Um inimigo.'
  }
}

/** Um efeito em frase completa. */
export function explainEffect(effect: SkillEffect): string {
  const self = effect.appliesTo === 'SELF'
  switch (effect.type) {
    case 'DAMAGE':
      return `Causa dano com Poder ${num(effect.power)}.`
    case 'HEAL':
      // power 1,0 = 10% do HP máximo do alvo (D92)
      return `Cura ${Math.round(effect.power * 10)}% do HP máximo ${self ? 'de quem usa' : 'do alvo'}.`
    case 'SHIELD':
      return `Dá um escudo de ${Math.round(effect.power * 10)}% do HP máximo ${self ? 'a quem usa' : 'ao alvo'}.`
    case 'STAT_MODIFIER': {
      const who = self ? 'em quem usa' : 'no alvo'
      return `${effect.percent > 0 ? '+' : ''}${effect.percent}% de ${statLabels[effect.stat]} ${who} por ${turns(effect.duration)}.`
    }
    case 'APPLY_STATUS': {
      const duration = effect.status === 'LOCK' ? '' : ` por ${turns(effect.duration)}`
      return `${pct(effect.baseChance)} de chance de deixar ${self ? 'quem usa' : 'o alvo'} ${statusLabels[effect.status]}${duration}: ${statusEffects[effect.status]}.${self ? '' : ' A Vontade do alvo resiste.'}`
    }
    case 'REPOSITION':
      return {
        PUSH: 'Empurra o alvo uma casa para o fundo (a Vontade resiste; barrado se a casa estiver ocupada).',
        PULL: 'Puxa o alvo uma casa para a frente (a Vontade resiste; barrado se a casa estiver ocupada).',
        SWAP: 'Troca o alvo de lugar com um inimigo vizinho, à sua escolha (a Vontade resiste).',
        MOVE_ALLY: 'Move um aliado para outra célula sem gastar a vez dele.',
        DASH: 'Quem usa avança ou recua para uma célula vizinha vazia.',
      }[effect.kind]
    case 'TURN_SHIFT': {
      const who = self ? 'a própria vez' : 'a vez do alvo'
      return effect.percent >= 0 ? `Adianta ${who} em ${effect.percent}%.` : `Atrasa ${who} em ${-effect.percent}%.`
    }
    case 'CHANGE_FIELD':
      return `Troca o campo de batalha por ${effect.duration} rodadas, à sua escolha (bônus ×${num(effect.multiplier)}).`
    case 'RECOVER':
      return 'Alivia 50% do Desgaste acumulado.'
    case 'PROTECT':
      return 'Protege o aliado: até o seu próximo turno, os golpes de alvo único nele caem em você.'
    case 'GRANT_TURN':
      return `O aliado age logo em seguida${effect.attackPercent ? `, com +${effect.attackPercent}% de Ataque nessa ação` : ''}.`
    case 'EXPLOIT':
      return `Em alvo ${statusLabels[effect.status]}, o dano é ×${num(effect.multiplier)}${effect.consume ? ' e o status é consumido' : ''}.`
  }
}

/** Papel do efeito, para o jogador bater o olho: ataque, cura, buff... */
export type SkillKind = 'ATTACK' | 'HEAL' | 'DEFENSE' | 'BUFF' | 'DEBUFF' | 'CONTROL' | 'POSITION' | 'TEMPO' | 'FIELD' | 'RECOVER'

/** Ordem de importância: o primeiro presente é o papel principal da skill. */
const kindOrder: SkillKind[] = ['ATTACK', 'HEAL', 'DEFENSE', 'BUFF', 'DEBUFF', 'CONTROL', 'POSITION', 'TEMPO', 'FIELD', 'RECOVER']

function kindOf(effect: SkillEffect): SkillKind {
  switch (effect.type) {
    case 'DAMAGE':
    case 'EXPLOIT':
      return 'ATTACK'
    case 'HEAL':
      return 'HEAL'
    case 'SHIELD':
    case 'PROTECT':
      return 'DEFENSE'
    case 'STAT_MODIFIER':
      // buff aumenta, debuff diminui o stat de quem recebe (o alvo, ou quem usa)
      return effect.percent > 0 ? 'BUFF' : 'DEBUFF'
    case 'APPLY_STATUS':
      return 'CONTROL'
    case 'REPOSITION':
      return 'POSITION'
    case 'TURN_SHIFT':
    case 'GRANT_TURN':
      return 'TEMPO'
    case 'CHANGE_FIELD':
      return 'FIELD'
    case 'RECOVER':
      return 'RECOVER'
  }
}

/** Papéis da skill, do principal para os secundários, sem repetir. */
export function skillKinds(skill: Pick<SkillInfo, 'effects'>): SkillKind[] {
  const kinds = new Set(skill.effects.map(kindOf))
  return kindOrder.filter((k) => kinds.has(k))
}

/** Dados de uso em texto: recarga, custo e acerto. */
export function skillFacts(skill: SkillData): string[] {
  return [
    skill.cooldown ? `Recarga de ${turns(skill.cooldown)}` : 'Sem recarga',
    `Desgaste ${num(skill.desgastePercent)}%`,
    skill.baseHitChance === null ? 'Sempre acerta' : `Acerto base ${pct(skill.baseHitChance)}`,
  ]
}

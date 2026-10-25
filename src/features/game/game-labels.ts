import type {
  AiProfile,
  BattleSummary,
  CharacterClass,
  DangerLevel,
  Lineage,
  SkillArea,
  SkillKitSlot,
  SkillRange,
  SkillTarget,
  SkillTier,
  Stat,
  StatusType,
} from '@/features/game/game-api'

// Nomes em português dos enums da API (termos de ../origin-game/docs).

export const profileLabels: Record<AiProfile, string> = {
  AGGRESSIVE: 'Agressivo',
  CAUTIOUS: 'Cauteloso',
  FINISHER: 'Focado em abater',
  BALANCED: 'Equilibrado',
}

export const endReasonLabels: Record<NonNullable<BattleSummary['endReason']>, string> = {
  ELIMINATION: 'Eliminação',
  ROUND_LIMIT: 'Dano na rodada 30',
  ABANDON: 'Desistência',
}

export type BattleOutcome = 'WIN' | 'LOSS' | 'ABANDON'

/** Resultado do ponto de vista do jogador. */
export function battleOutcome(battle: Pick<BattleSummary, 'winner' | 'endReason'>): BattleOutcome {
  if (battle.winner === 'PLAYER') return 'WIN'
  return battle.endReason === 'ABANDON' ? 'ABANDON' : 'LOSS'
}

export const outcomeLabels: Record<BattleOutcome, string> = { WIN: 'Vitória', LOSS: 'Derrota', ABANDON: 'Desistência' }

/** Aura de formação de cada classe nos aliados adjacentes (D128). Só texto: quem aplica é o servidor. */
export const classAuras: Record<CharacterClass, string> = {
  VANGUARD: 'Adjacentes não podem ser empurrados, puxados nem trocados à força.',
  MARKSMAN: '+10% de Precisão nos adjacentes.',
  EXECUTOR: '+10% de Ataque sem nenhum aliado adjacente (lobo solitário).',
  CONTROLLER: '+10% de Vontade nos adjacentes.',
  SUPPORT: '+15% na cura recebida pelos adjacentes.',
  ARTILLERY: '+10% de dano no fundo da linha, com alguém na frente.',
  GUARDIAN: '+10% de Defesa nos adjacentes.',
  TACTICIAN: '+5% de Velocidade nos adjacentes.',
}

export const statOrder: Stat[] =['HP', 'ATTACK', 'DEFENSE', 'SPEED', 'PRECISION', 'EVASION', 'WILL']

export const statLabels: Record<Stat, string> = {
  HP: 'HP',
  ATTACK: 'Ataque',
  DEFENSE: 'Defesa',
  SPEED: 'Velocidade',
  PRECISION: 'Precisão',
  EVASION: 'Esquiva',
  WILL: 'Vontade',
}

/** Sigla de HUD (3 letras). */
export const statShort: Record<Stat, string> = {
  HP: 'HP',
  ATTACK: 'ATQ',
  DEFENSE: 'DEF',
  SPEED: 'VEL',
  PRECISION: 'PRE',
  EVASION: 'ESQ',
  WILL: 'VON',
}

export const dangerLabels: Record<DangerLevel, string> = {
  DISCRETE: 'Discreto',
  CONTINUOUS: 'Contínuo',
  DIFFERENTIABLE: 'Diferenciável',
  NON_LINEAR: 'Não-linear',
  CHAOTIC: 'Caótico',
}

export const lineageLabels: Record<Lineage, string> = {
  FUNDAMENTAL: 'Fundamental',
  ELEMENTAL: 'Elemental',
  MATERIAL: 'Material',
  VECTORIAL: 'Vetorial',
  PSYCHIC: 'Psíquica',
  BIOLOGICAL: 'Biológica',
  NONE: 'Sem linhagem',
}

export const tierLabels: Record<SkillTier, string> = {
  BASIC: 'Básica',
  STANDARD: 'Padrão',
  REINFORCED: 'Reforçada',
  STRONG: 'Forte',
  FINAL: 'Final',
}

export const kitSlotLabels: Record<SkillKitSlot, string> = {
  BASIC: 'Básica',
  STANDARD: 'Padrão',
  ROLE: 'Função',
  SIGNATURE: 'Assinatura',
}

export const rangeLabels: Record<SkillRange, string> = {
  MELEE: 'Corpo a corpo',
  RANGED: 'À distância',
  PIERCING: 'Perfurante',
  FLANK: 'Flanco',
}

export const areaLabels: Record<SkillArea, string> = {
  SINGLE: 'Alvo único',
  LINE: 'Linha',
  COLUMN: 'Coluna',
  GRID: 'Grade inteira',
}

export const targetLabels: Record<SkillTarget, string> = {
  ENEMY: 'Inimigo',
  ALLY: 'Aliado',
  SELF: 'Si mesmo',
}

export const statusLabels: Record<StatusType, string> = {
  STUN: 'Atordoado',
  LOCK: 'Travado',
  ROOT: 'Preso',
  EXPOSE: 'Exposto',
  MARK: 'Marcado',
  DOT: 'Dano contínuo',
  TAUNT: 'Provocado',
}

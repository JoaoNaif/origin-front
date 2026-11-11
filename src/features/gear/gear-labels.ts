import { Shield, Sword, type LucideIcon } from 'lucide-react'
import type { GearBondLevel, GearGrade, GearKind, GearLineage, GearLoseAction, GearPassive, StatPercents } from '@/features/gear/gear-api'
import { statOrder, statShort } from '@/features/game/game-labels'

// Nomes, ordem e cores do equipamento vivo (D94, D153). Peças visuais em gear-ui.tsx. Só texto: quem calcula é o servidor.

export const gradeOrder: GearGrade[] = ['SQUIRE', 'KNIGHT', 'MASTER', 'KING', 'DIVINE']

export const gradeLabels: Record<GearGrade, string> = {
  SQUIRE: 'Escudeiro',
  KNIGHT: 'Cavaleiro',
  MASTER: 'Mestre',
  KING: 'Rei',
  DIVINE: 'Divino',
}

/** Cor do grau (a da raridade equivalente; tokens `grade-*` no index.css). */
export const gradeColors: Record<GearGrade, string> = {
  SQUIRE: 'var(--color-grade-squire)',
  KNIGHT: 'var(--color-grade-knight)',
  MASTER: 'var(--color-grade-master)',
  KING: 'var(--color-grade-king)',
  DIVINE: 'var(--color-grade-divine)',
}

export const kindLabels: Record<GearKind, string> = { WEAPON: 'Arma', ARMOR: 'Armadura' }

export const kindIcons: Record<GearKind, LucideIcon> = { WEAPON: Sword, ARMOR: Shield }

export const bondLabels: Record<GearBondLevel, string> = { FULL: 'Elo pleno', PARTIAL: 'Elo parcial', NONE: 'Sem elo' }

/** Pleno em verde, parcial em laranja, sem elo em vermelho. */
export const bondTones: Record<GearBondLevel, 'success' | 'warning' | 'danger'> = { FULL: 'success', PARTIAL: 'warning', NONE: 'danger' }

export const bondRank: Record<GearBondLevel, number> = { FULL: 2, PARTIAL: 1, NONE: 0 }

export const requirementLevelLabels = { HIGH: 'alto', LOW: 'baixo' } as const

/** Nome curto da passiva de cada linhagem. */
export const passiveLabels: Record<GearPassive['type'], string> = {
  DOT_ON_HIT: 'Brasa',
  SINGLE_TARGET_REDUCTION: 'Couraça',
  IGNORE_DEFENSE: 'Perfurar',
  STATUS_WILL: 'Mente firme',
  REGEN: 'Regeneração',
  INITIAL_SHIELD: 'Escudo inicial',
}

/** Onde cai o custo do elo pleno (o Desgaste da linhagem). */
export const lineageCostTarget: Record<GearLineage, string> = {
  FUNDAMENTAL: 'HP máximo',
  ELEMENTAL: 'HP atual',
  MATERIAL: 'Defesa',
  VECTORIAL: 'Precisão',
  PSYCHIC: 'Vontade',
  BIOLOGICAL: 'Esquiva',
}

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** Número com até 2 casas, no formato brasileiro. */
export const fmt = (n: number) => numberFormat.format(n)

/** O que a passiva faz, com o número já escalado. */
export function passiveText(passive: GearPassive): string {
  switch (passive.type) {
    case 'DOT_ON_HIT':
      return `${fmt(passive.chance * 100)}% de chance de Dano contínuo a cada golpe com dano (Precisão contra Vontade)`
    case 'SINGLE_TARGET_REDUCTION':
      return `${fmt(passive.percent)}% menos dano de golpes de alvo único (não soma com a passiva do personagem: vale a maior)`
    case 'IGNORE_DEFENSE':
      return `Ignora ${fmt(passive.percent)}% da Defesa do alvo`
    case 'STATUS_WILL':
      return `+${fmt(passive.percent)}% de Vontade contra status`
    case 'REGEN':
      return `Regenera ${fmt(passive.percentOfMaxHp)}% do HP máximo no início de cada turno`
    case 'INITIAL_SHIELD':
      return `Começa a batalha com escudo de ${fmt(passive.percentOfMaxHp)}% do HP máximo`
  }
}

export function loseActionText(lose: GearLoseAction): string {
  return `${fmt(lose.start)}% de chance de perder a ação no 1º turno, +${fmt(lose.step)}% a cada turno, até ${fmt(lose.max)}%`
}

/** Os stats com %, na ordem da ficha. */
export function percentEntries(percents: StatPercents): [keyof typeof statShort, number][] {
  return statOrder.filter((s) => percents[s]).map((s) => [s, percents[s]!])
}

/** "+3% ATQ · +2% VEL" (ou "−6% em todos" quando cai igual nos 7). */
export function percentsText(percents: StatPercents): string {
  const entries = percentEntries(percents)
  if (entries.length === statOrder.length && entries.every(([, v]) => v === entries[0][1])) return `${signed(entries[0][1])}% em todos`
  return entries.map(([stat, v]) => `${signed(v)}% ${statShort[stat]}`).join(' · ')
}

const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : `−${fmt(-n)}`)

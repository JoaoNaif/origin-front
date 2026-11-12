import { Crown, Handshake, Scale, type LucideIcon } from 'lucide-react'
import type { BeastContract, BeastGrade } from '@/features/beasts/beast-api'
import { beastTerms } from '@/features/game/glossary'

// Nomes, ordem, cores e o que cada contrato faz (D95, D154). Peças visuais em beast-ui.tsx. Só texto: quem calcula é o
// servidor; os números vêm de `GET /beast-rules`.

export const beastGradeOrder: BeastGrade[] = ['SQUIRE', 'KNIGHT', 'MASTER', 'KING', 'SACRED']

export const beastGradeLabels: Record<BeastGrade, string> = {
  SQUIRE: 'Escudeiro',
  KNIGHT: 'Cavaleiro',
  MASTER: 'Mestre',
  KING: 'Rei',
  SACRED: 'Sagrada',
}

/** Cor do grau: a mesma régua do equipamento vivo (a sagrada na cor do Divino). */
export const beastGradeColors: Record<BeastGrade, string> = {
  SQUIRE: 'var(--color-grade-squire)',
  KNIGHT: 'var(--color-grade-knight)',
  MASTER: 'var(--color-grade-master)',
  KING: 'var(--color-grade-king)',
  SACRED: 'var(--color-grade-divine)',
}

export const contractOrder: BeastContract[] = ['DOMINANCE', 'MASTER', 'EQUALITY']

export const contractLabels: Record<BeastContract, string> = {
  DOMINANCE: 'Dominância',
  MASTER: 'Mestre',
  EQUALITY: 'Igualdade',
}

export const contractIcons: Record<BeastContract, LucideIcon> = { DOMINANCE: Crown, MASTER: Handshake, EQUALITY: Scale }

export const contractColors: Record<BeastContract, string> = {
  DOMINANCE: 'var(--color-contract-dominance)',
  MASTER: 'var(--color-contract-master)',
  EQUALITY: 'var(--color-contract-equality)',
}

/** Quem joga, em poucas palavras (etiqueta e resumo). */
export const contractShort: Record<BeastContract, string> = {
  DOMINANCE: 'a máquina joga por ela',
  MASTER: 'você joga com ela',
  EQUALITY: 'divide o dano com o dono',
}

/** O contrato por extenso, sem número (os números vêm de `GET /beast-rules`). */
export const contractText: Record<BeastContract, string> = {
  DOMINANCE:
    'Entra em campo e age sozinha: a máquina joga por ela. Enquanto ela está em campo, o dono perde um pouco de Vontade, que volta quando ela sai ou cai.',
  MASTER:
    'Entra em campo e você escolhe as jogadas dela. É a mais forte, mas pede todos os requisitos de atributo do dono: sem eles, a batalha não começa.',
  EQUALITY:
    'Não entra em campo: vira um escudo no dono que segura parte de cada golpe e dá Precisão e Esquiva. Se o escudo esvaziar, o dono leva um dano fixo e perde os bônus.',
}

export const slotLabel = (slot: number) => `Slot ${slot}`

/** A explicação do termo no glossário (balões e Guia). */
export const beastTermText = (term: string) => beastTerms.find((t) => t.term === term)?.text ?? ''

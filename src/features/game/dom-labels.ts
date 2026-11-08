import { Brain, Crown, HeartPulse, ShieldHalf, type LucideIcon } from 'lucide-react'
import type { DomLevel, DomPillar, DomRole } from '@/features/game/game-api'

// Nomes, ícones e cores do DOM (D152). Regras e números vêm de `GET /dom-rules` e do `dom` do personagem.

export const domPillarOrder: DomPillar[] = ['MIND', 'HEART', 'BODY', 'AURA']

export const domPillarLabels: Record<DomPillar, string> = { MIND: 'Mente', HEART: 'Coração', BODY: 'Corpo', AURA: 'Aura' }

/** O que o pilar representa, em poucas palavras. */
export const domPillarThemes: Record<DomPillar, string> = {
  MIND: 'percepção e antecipação',
  HEART: 'resistência e energia vital',
  BODY: 'domínio do próprio corpo',
  AURA: 'presença e intenção',
}

export const domPillarIcons: Record<DomPillar, LucideIcon> = { MIND: Brain, HEART: HeartPulse, BODY: ShieldHalf, AURA: Crown }

/** Cor de cada pilar (tokens `dom-*` do index.css), para `--tone`. */
export const domPillarColors: Record<DomPillar, string> = {
  MIND: 'var(--color-dom-mind)',
  HEART: 'var(--color-dom-heart)',
  BODY: 'var(--color-dom-body)',
  AURA: 'var(--color-dom-aura)',
}

export const domLevelLabels: Record<DomLevel, string> = { BASIC: 'Básico', INTERMEDIATE: 'Intermediário', ADVANCED: 'Avançado' }

export const domLevelOrder: DomLevel[] = ['BASIC', 'INTERMEDIATE', 'ADVANCED']

/** 0 = sem o pilar, 3 = avançado. */
export const domLevelRank = (level: DomLevel | null) => (level ? domLevelOrder.indexOf(level) + 1 : 0)

export const domRoleLabels: Record<DomRole, string> = { DAMAGE: 'Dano', TANK: 'Tank', SUPPORT: 'Suporte', CONTROL: 'Controle' }

export const domRoleOrder: DomRole[] = ['DAMAGE', 'TANK', 'SUPPORT', 'CONTROL']

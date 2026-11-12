import {
  ArrowDownCircle,
  ArrowUpCircle,
  PawPrint,
  Hourglass,
  Mountain,
  Move,
  RefreshCcw,
  Shield,
  Sparkle,
  Swords,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { SkillInfo } from '@/features/game/game-api'
import { skillKinds, type SkillKind } from '@/features/game/skill-text'

// Papéis da skill (ataque, cura, defesa...): nome, ícone e cores. Usado pelas etiquetas (skill-badges.tsx) e pela build.

export const kinds: Record<SkillKind, { label: string; icon: LucideIcon; text: string; box: string }> = {
  SUMMON: { label: 'Invocação', icon: PawPrint, text: 'text-beast', box: 'border-beast/50 bg-beast/10 text-beast' },
  ATTACK: { label: 'Ataque', icon: Swords, text: 'text-danger-hover', box: 'border-danger/50 bg-danger-dim text-danger-hover' },
  HEAL: { label: 'Cura', icon: Sparkle, text: 'text-success', box: 'border-success/40 bg-success/10 text-success' },
  DEFENSE: { label: 'Defesa', icon: Shield, text: 'text-info', box: 'border-info/40 bg-info/10 text-info' },
  BUFF: { label: 'Buff', icon: ArrowUpCircle, text: 'text-primary-soft', box: 'border-primary/50 bg-primary-dim text-primary-soft' },
  DEBUFF: { label: 'Debuff', icon: ArrowDownCircle, text: 'text-warning', box: 'border-warning/40 bg-warning/10 text-warning' },
  CONTROL: { label: 'Controle', icon: Zap, text: 'text-warning', box: 'border-warning/40 bg-warning/10 text-warning' },
  POSITION: { label: 'Posição', icon: Move, text: 'text-silver', box: 'border-line-strong bg-raised text-silver' },
  TEMPO: { label: 'Tempo', icon: Hourglass, text: 'text-silver', box: 'border-line-strong bg-raised text-silver' },
  FIELD: { label: 'Campo', icon: Mountain, text: 'text-warning', box: 'border-warning/40 bg-warning/10 text-warning' },
  RECOVER: { label: 'Recuperação', icon: RefreshCcw, text: 'text-success', box: 'border-success/40 bg-success/10 text-success' },
}

/** Cor de cada papel como variável CSS (para `--tone` em chanfros, barras e brilhos). */
const kindColors: Record<SkillKind, string> = {
  SUMMON: 'var(--color-beast)',
  ATTACK: 'var(--color-danger)',
  HEAL: 'var(--color-success)',
  DEFENSE: 'var(--color-info)',
  BUFF: 'var(--color-primary-soft)',
  DEBUFF: 'var(--color-warning)',
  CONTROL: 'var(--color-warning)',
  POSITION: 'var(--color-silver)',
  TEMPO: 'var(--color-silver)',
  FIELD: 'var(--color-warning)',
  RECOVER: 'var(--color-success)',
}

/** O papel principal da skill: nome, ícone e cor (variável CSS). */
export function skillKindStyle(skill: Pick<SkillInfo, 'effects'>) {
  const kind = skillKinds(skill)[0] ?? 'POSITION'
  return { label: kinds[kind].label, icon: kinds[kind].icon, color: kindColors[kind] }
}

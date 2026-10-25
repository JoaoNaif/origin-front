import { Compass, Crosshair, Flame, HeartPulse, Orbit, Shield, ShieldHalf, Sword, type LucideIcon } from 'lucide-react'
import type { CharacterClass } from '@/features/game/game-api'

/** Ícone de cada classe (placeholder até existir arte própria). */
export const classIcons: Record<CharacterClass, LucideIcon> = {
  VANGUARD: Shield,
  MARKSMAN: Crosshair,
  EXECUTOR: Sword,
  CONTROLLER: Orbit,
  SUPPORT: HeartPulse,
  ARTILLERY: Flame,
  GUARDIAN: ShieldHalf,
  TACTICIAN: Compass,
}

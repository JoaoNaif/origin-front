import {
  ArrowDownCircle,
  ArrowUpCircle,
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
import { rangeLabels } from '@/features/game/game-labels'
import { skillKinds, type SkillKind } from '@/features/game/skill-text'
import { cn } from '@/lib/cn'

// Leitura rápida da skill: o papel (ícone e cor) e a área (desenho da grade). Cores pelos tokens:
// ataque = perigo, cura = sucesso, defesa = info, buff = roxo, debuff e controle = alerta.

const kinds: Record<SkillKind, { label: string; icon: LucideIcon; text: string; box: string }> = {
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

type Skill = Pick<SkillInfo, 'effects' | 'target' | 'range' | 'area'>

/** Ícone grande do papel principal (ataque, cura...). */
export function SkillKindIcon({ skill, className }: { skill: Skill; className?: string }) {
  const kind = kinds[skillKinds(skill)[0] ?? 'POSITION']
  const Icon = kind.icon
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center border', kind.box, className)} title={kind.label}>
      <Icon className="size-5" />
    </span>
  )
}

/** Etiquetas: os papéis, o lado e a forma do alvo, com o desenho da área. */
export function SkillTags({ skill }: { skill: Skill }) {
  const list = skillKinds(skill)
  const side = skill.target === 'ENEMY' ? 'Inimigo' : skill.target === 'ALLY' ? 'Aliado' : 'Si mesmo'
  const shape = skill.target === 'SELF' ? null : { SINGLE: 'Alvo único', LINE: 'Linha', COLUMN: 'Coluna', GRID: 'Todos' }[skill.area]

  return (
    <span className="flex flex-wrap items-center gap-1">
      {list.map((k, i) => (
        <span
          key={k}
          className={cn(
            'border px-1.5 py-px font-mono text-[10px] font-bold whitespace-nowrap uppercase tracking-[0.12em]',
            i === 0 ? kinds[k].box : cn('border-line-strong', kinds[k].text),
          )}
        >
          {kinds[k].label}
        </span>
      ))}
      {[side, shape, skill.range && skill.target === 'ENEMY' && rangeLabels[skill.range]].filter(Boolean).map((text, i) => (
        <span
          key={i}
          className={cn(
            'flex items-center gap-1.5 border px-1.5 py-px font-mono text-[10px] font-bold whitespace-nowrap uppercase tracking-[0.12em]',
            skill.target === 'ENEMY' ? 'border-enemy/50 text-danger-hover' : 'border-ally/50 text-primary-soft',
          )}
        >
          {i === 0 && <AreaGlyph skill={skill} />}
          {text}
        </span>
      ))}
    </span>
  )
}

const shortShape = { SINGLE: 'Único', LINE: 'Linha', COLUMN: 'Coluna', GRID: 'Todos' } as const
const shortRange = { MELEE: 'Corpo', RANGED: 'Dist.', PIERCING: 'Perfura', FLANK: 'Flanco' } as const

/** Versão de uma linha (slot da barra de skills): papel, desenho da área e "Inimigo · Único · Corpo". */
export function SkillShortTags({ skill }: { skill: Skill }) {
  const main = kinds[skillKinds(skill)[0] ?? 'POSITION']
  const enemy = skill.target === 'ENEMY'
  // no inimigo, o vermelho e o desenho já dizem o lado: sobra espaço para a forma e o alcance
  const parts = enemy
    ? [shortShape[skill.area], skill.range && skill.area === 'SINGLE' && shortRange[skill.range]]
    : [skill.target === 'ALLY' ? 'Aliado' : 'Si mesmo', skill.target === 'ALLY' && shortShape[skill.area]]

  return (
    <span className="flex min-w-0 items-center gap-1.5 font-display text-[13px] leading-none font-semibold whitespace-nowrap uppercase tracking-wide">
      <span className={main.text}>{main.label}</span>
      <span className="text-fg-subtle">/</span>
      <AreaGlyph skill={skill} />
      <span className={cn('truncate', enemy ? 'text-danger-hover' : 'text-primary-soft')}>{parts.filter(Boolean).join(' · ')}</span>
    </span>
  )
}

/**
 * Desenho de quem é atingido na grade 3x3 (frente à esquerda, como a grade inimiga na tela).
 * Alvo único corpo a corpo = a frente; flanco = o fundo; à distância = qualquer (o meio); linha, coluna e todos.
 */
function AreaGlyph({ skill }: { skill: Skill }) {
  const lit = (row: number, column: number) => {
    if (skill.target === 'SELF') return row === 1 && column === 1
    switch (skill.area) {
      case 'GRID':
        return true
      case 'LINE':
        return row === 1
      case 'COLUMN':
        return column === 0
      default:
        if (skill.range === 'PIERCING') return row === 1
        if (skill.range === 'FLANK') return row === 1 && column === 2
        if (skill.range === 'MELEE') return row === 1 && column === 0
        return row === 1 && column === 1
    }
  }
  const on = skill.target === 'ENEMY' ? 'bg-danger-hover' : 'bg-primary-soft'

  return (
    <span className="grid grid-cols-3 gap-px" aria-hidden>
      {[0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => <span key={`${row}${column}`} className={cn('size-1.5', lit(row, column) ? on : 'bg-overlay')} />))}
    </span>
  )
}

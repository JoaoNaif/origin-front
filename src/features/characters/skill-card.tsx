import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { SkillInfo } from '@/features/game/game-api'
import { kitSlotLabels, lineageLabels, tierLabels } from '@/features/game/game-labels'
import { SkillTags } from '@/features/game/skill-badges'
import { describeTargeting, explainEffect, skillFacts } from '@/features/game/skill-text'
import { cn } from '@/lib/cn'

/** Força do tipo, de 1 (Básica) a 5 (Final): os traços do indicador. */
const tierRank = { BASIC: 1, STANDARD: 2, REINFORCED: 3, STRONG: 4, FINAL: 5 } as const

/** Indicador do tipo da skill: 5 traços, acesos até a força dela. */
export function TierPips({ skill, className }: { skill: Pick<SkillInfo, 'tier'>; className?: string }) {
  return (
    <span className={cn('flex items-center gap-0.5', className)} title={tierLabels[skill.tier]}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn('h-2.5 w-1 -skew-x-12', i < tierRank[skill.tier] ? 'bg-primary-soft' : 'bg-overlay')} />
      ))}
    </span>
  )
}

/** Card completo da skill: nome, tipo, papel no kit, dados e efeitos. */
export function SkillCard({ skill, enhanced, aside, className }: {
  skill: SkillInfo
  enhanced?: boolean
  /** Canto superior direito (ex.: slot da build). */
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <TierPips skill={skill} />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
              {tierLabels[skill.tier]}
              {skill.kitSlot && ` · ${kitSlotLabels[skill.kitSlot]}`}
              {` · ${lineageLabels[skill.lineage]}`}
            </span>
          </div>
          <p className="font-display text-xl leading-tight font-bold uppercase tracking-wide text-silver-bright">{skill.name}</p>
          <SkillTags skill={skill} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {skill.isAwakened && <Badge tone="warning">Despertada</Badge>}
          {enhanced && <Badge tone="success">Aprimorada</Badge>}
          {aside}
        </div>
      </div>

      {skill.description && <p className="text-sm leading-relaxed text-fg-muted">{skill.description}</p>}

      {/* O que faz, por extenso (o mesmo texto da batalha) */}
      <div className="space-y-1.5">
        <p className="text-[13px] leading-snug font-medium text-fg">{describeTargeting(skill)}</p>
        <ul className="space-y-1">
          {skill.effects.map((effect, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-fg-muted">
              <span className="mt-1.5 size-1 shrink-0 bg-primary-soft" />
              {explainEffect(effect)}
            </li>
          ))}
        </ul>
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line/70 pt-3 font-mono text-[11px] text-fg-subtle">
        {skillFacts(skill).map((fact) => (
          <span key={fact}>{fact}</span>
        ))}
      </p>
    </div>
  )
}

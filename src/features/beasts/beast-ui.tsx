import type { CSSProperties } from 'react'
import { Crown, PawPrint } from 'lucide-react'
import { Term } from '@/components/ui/term'
import type { BeastContract, BeastGrade, BeastSkill } from '@/features/beasts/beast-api'
import { beastGradeColors, beastGradeLabels, beastTermText, contractColors, contractIcons, contractLabels, contractShort } from '@/features/beasts/beast-labels'
import { areaLabels, rangeLabels, targetLabels } from '@/features/game/game-labels'
import { SkillKindIcon } from '@/features/game/skill-badges'
import { explainEffect } from '@/features/game/skill-text'
import { cn } from '@/lib/cn'

// Peças visuais das bestas: emblema (sem arquivo de arte: a pata na cor do grau, com o anel do contrato), grau,
// contrato e as skills em campo. Usadas na página Bestas, na ficha, na batalha e no admin.


const emblemSizes = {
  xs: ['size-9 [--cut:6px]', 'size-4'],
  sm: ['size-10 [--cut:7px]', 'size-4'],
  md: ['size-12 [--cut:9px]', 'size-5'],
  lg: ['size-16 [--cut:12px]', 'size-7'],
  xl: ['size-24 [--cut:16px]', 'size-11'],
} as const

/** Emblema da besta: chanfro na cor do grau, a pata no meio e o filete do contrato embaixo. */
export function BeastEmblem({ grade, contract, size = 'md', className }: {
  grade: BeastGrade
  contract: BeastContract
  size?: keyof typeof emblemSizes
  className?: string
}) {
  const [box, icon] = emblemSizes[size]
  return (
    <span
      style={{ '--tone': beastGradeColors[grade], '--contract': contractColors[contract] } as CSSProperties}
      className={cn(
        'chamfer relative flex shrink-0 items-center justify-center [--chamfer-bg:var(--color-bg)] [--chamfer-border:color-mix(in_srgb,var(--tone)_60%,transparent)]',
        box,
        grade === 'SACRED' && 'shadow-[0_0_24px_-6px_var(--tone)]',
        className,
      )}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-px bg-[radial-gradient(circle_at_50%_35%,color-mix(in_srgb,var(--tone)_28%,transparent),transparent_70%)] [clip-path:var(--chamfer-shape)]" />
      <PawPrint className={cn('relative text-(--tone)', icon)} />
      <span className="absolute inset-x-2 bottom-1 h-0.5 bg-(--contract)" />
    </span>
  )
}

/** Etiqueta do grau, na cor dele. */
export function BeastGradeTag({ grade, className }: { grade: BeastGrade; className?: string }) {
  return (
    <span
      style={{ '--tone': beastGradeColors[grade] } as CSSProperties}
      className={cn(
        'inline-flex items-center gap-1 border border-(--tone)/50 bg-(--tone)/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-(--tone)',
        className,
      )}
    >
      {grade === 'SACRED' && <Crown className="size-3" />}
      {beastGradeLabels[grade]}
    </span>
  )
}

/** Etiqueta do contrato: ícone, nome e (com `hint`) quem joga; a explicação do glossário no hover. */
export function ContractTag({ contract, hint, className }: { contract: BeastContract; hint?: boolean; className?: string }) {
  const Icon = contractIcons[contract]
  return (
    <span
      style={{ '--tone': contractColors[contract] } as CSSProperties}
      className={cn('inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-(--tone)', className)}
    >
      <Icon className="size-3.5 shrink-0" />
      <Term title={contractLabels[contract]} info={beastTermText(contractLabels[contract])} className="uppercase">
        {contractLabels[contract]}
      </Term>
      {hint && <span className="normal-case tracking-normal text-fg-subtle">· {contractShort[contract]}</span>}
    </span>
  )
}

/** As skills da besta em campo: o papel, o nome, o alvo e o que cada efeito faz. */
export function BeastSkillList({ skills }: { skills: BeastSkill[] }) {
  return (
    <ul className="space-y-2">
      {skills.map((skill, i) => (
        <li key={i} className="flex gap-3 border border-line/60 bg-bg/40 p-2.5">
          <SkillKindIcon skill={skill} className="size-8" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-base leading-tight font-bold uppercase tracking-wide text-silver-bright">{skill.name}</span>
              <span className="font-mono text-[10px] text-fg-subtle">
                {targetLabels[skill.target]}
                {skill.target !== 'SELF' && ` · ${areaLabels[skill.area]}`}
                {skill.range && skill.area === 'SINGLE' && ` · ${rangeLabels[skill.range]}`}
                {skill.cooldown > 0 && ` · recarga ${skill.cooldown}`}
              </span>
            </p>
            {skill.effects.map((effect, j) => (
              <p key={j} className="text-xs leading-snug text-fg-muted">
                {explainEffect(effect)}
              </p>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

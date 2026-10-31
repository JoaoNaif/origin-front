import { bonusKey, bonusTitle, type FormationBonus } from '@/features/squads/formation-bonus'
import { cn } from '@/lib/cn'

/** Etiquetas de bônus na grade. Roxo: o que se ganha; laranja: o bônus que um aliado perde. `wrap`: quebra em vez de cortar. */
export function BonusChips({ bonuses, wrap, className }: { bonuses: FormationBonus[]; wrap?: boolean; className?: string }) {
  return (
    <span className={cn('flex flex-wrap justify-center gap-0.5', className)}>
      {bonuses.map((bonus) => (
        <span
          key={bonusKey(bonus)}
          title={bonusTitle(bonus)}
          className={cn(
            'max-w-full rounded-control border bg-bg/85 px-0.5 font-mono text-[9px] leading-tight',
            wrap ? 'text-center' : 'truncate',
            bonus.loss ? 'border-warning/50 text-warning' : 'border-primary-soft/50 text-primary-soft',
          )}
        >
          {bonus.chip}
        </span>
      ))}
    </span>
  )
}

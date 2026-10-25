import { cn } from '@/lib/cn'

// Marca: uma grade 3x3 com a formação acesa, a ideia central do jogo.
const lit = [1, 3, 4, 7]

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-7 shrink-0 grid-cols-3 gap-[3px]', className)} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-[1px]',
            lit.includes(i) ? 'bg-primary-soft shadow-[0_0_6px_var(--color-primary)]' : 'bg-line-strong',
          )}
        />
      ))}
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark />
      <span className="font-display text-2xl font-extrabold italic tracking-[0.18em] text-gradient-silver">ORIGIN</span>
    </span>
  )
}

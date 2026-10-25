import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

// primary, secondary e danger usam o chanfro (cores via --chamfer-bg / --chamfer-border)
const variants: Record<ButtonVariant, string> = {
  primary: cn(
    'chamfer text-on-primary [--chamfer-bg:var(--color-primary)]',
    'hover:[--chamfer-bg:var(--color-primary-hover)] hover:drop-shadow-[0_0_14px_rgb(139_92_246/0.55)]',
    'active:[--chamfer-bg:var(--color-primary-active)]',
  ),
  secondary: cn(
    'chamfer text-fg [--chamfer-bg:var(--color-raised)] [--chamfer-border:var(--color-line-strong)]',
    'hover:text-silver-bright hover:[--chamfer-bg:var(--color-overlay)] hover:[--chamfer-border:rgb(201_202_211/0.45)]',
    'active:[--chamfer-bg:var(--color-raised)]',
  ),
  ghost: 'rounded-control text-fg-muted hover:bg-white/5 hover:text-fg active:bg-white/10',
  danger: cn(
    'chamfer text-white [--chamfer-bg:var(--color-danger)]',
    'hover:[--chamfer-bg:var(--color-danger-hover)] hover:drop-shadow-[0_0_14px_rgb(229_72_77/0.5)]',
    'active:[--chamfer-bg:var(--color-danger-active)]',
  ),
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3.5 text-sm [--cut:7px]',
  md: 'h-10 gap-2 px-5 text-base',
  lg: 'h-12 gap-2.5 px-7 text-lg [--cut:12px]',
}

/** Classes do botão, para usar também em <Link>. */
export function buttonClasses({ variant = 'primary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'focus-ring inline-flex items-center justify-center font-display font-bold uppercase tracking-[0.12em]',
    'transition-all duration-150 ease-out-soft',
    'disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40',
    variants[variant],
    sizes[size],
    className,
  )
}

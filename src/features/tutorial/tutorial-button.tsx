import { CircleHelp } from 'lucide-react'
import { useTutorial, type TutorialId } from '@/features/tutorial/tutorial-context'
import { cn } from '@/lib/cn'

/**
 * Abre o tutorial da tela. Por padrão, ícone com "Tutorial" escrito (topo das páginas); `iconOnly` para cantos
 * apertados (grade da formação, barra da batalha).
 */
export function TutorialButton({ id, label = 'Como funciona esta tela', iconOnly, className }: {
  id: TutorialId
  label?: string
  iconOnly?: boolean
  className?: string
}) {
  const { open } = useTutorial()

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => open(id)}
        aria-label={label}
        title={label}
        className={cn('focus-ring flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:text-primary-soft', className)}
      >
        <CircleHelp className="size-5" strokeWidth={1.75} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => open(id)}
      title={label}
      className={cn(
        'focus-ring chamfer group inline-flex h-7 items-center gap-1.5 pr-3 pl-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted transition-colors [--cut:7px]',
        '[--chamfer-bg:rgb(18_18_22/0.7)] [--chamfer-border:var(--color-line-strong)] hover:text-silver-bright hover:[--chamfer-border:rgb(167_139_250/0.6)]',
        className,
      )}
    >
      <CircleHelp className="size-4 text-primary-soft" strokeWidth={1.75} />
      Tutorial
    </button>
  )
}

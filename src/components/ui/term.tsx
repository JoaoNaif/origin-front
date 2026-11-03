import { useState, type ReactNode } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

const canHover = () => window.matchMedia('(hover: hover)').matches

/**
 * Palavra do jogo com a explicação escondida: o próprio rótulo ganha um sublinhado pontilhado discreto e, no desktop,
 * mostra o balão ao passar o mouse (ou no foco do teclado); no toque, abre um modal pequeno. Sem ícone extra, para não
 * poluir listas de atributos e status. Não usar dentro de link (é um botão).
 */
export function Term({ title, info, align = 'start', className, children }: {
  title: string
  info: ReactNode
  align?: 'start' | 'end'
  className?: string
  children: ReactNode
}) {
  const [hover, setHover] = useState(false)
  const [modal, setModal] = useState(false)

  return (
    <span className="relative inline-flex min-w-0" onMouseEnter={() => canHover() && setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        aria-expanded={hover || modal}
        onClick={() => (canHover() ? setHover((h) => !h) : setModal(true))}
        onFocus={() => canHover() && setHover(true)}
        onBlur={() => setHover(false)}
        className={cn(
          'focus-ring cursor-help truncate text-left underline decoration-current/35 decoration-dotted underline-offset-[3px] transition-colors hover:decoration-primary-soft aria-expanded:decoration-primary-soft',
          className,
        )}
      >
        {children}
      </button>
      {hover && (
        // pt-2 em vez de margem: o mouse passa do rótulo para o balão sem sair da área
        <span role="tooltip" className={cn('absolute top-full z-30 w-[min(18rem,80vw)] animate-fade-in pt-2', align === 'start' ? 'left-0' : 'right-0')}>
          <span className="block rounded-card border border-line-strong bg-raised p-3 text-xs leading-relaxed font-normal tracking-normal text-fg-muted normal-case shadow-[0_12px_32px_rgb(0_0_0/0.5)]">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">{title}</span>
            {info}
          </span>
        </span>
      )}
      <Dialog open={modal} onClose={() => setModal(false)} title={title} eyebrow="Glossário" size="sm">
        <div className="text-sm leading-relaxed text-fg-muted">{info}</div>
      </Dialog>
    </span>
  )
}

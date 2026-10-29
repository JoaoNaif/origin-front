import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

const canHover = () => window.matchMedia('(hover: hover)').matches

/**
 * Ícone de info com a explicação escondida: no desktop aparece ao passar o mouse (ou no foco do teclado); no toque,
 * abre um modal pequeno. `bare`: sem borda, para ir dentro de um campo. `align`: de que lado o balão abre.
 */
export function InfoTip({ title, children, bare, align = 'start' }: { title: string; children: ReactNode; bare?: boolean; align?: 'start' | 'end' }) {
  const [hover, setHover] = useState(false)
  const [modal, setModal] = useState(false)

  return (
    <span className="relative inline-flex" onMouseEnter={() => canHover() && setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        aria-label={`Sobre: ${title}`}
        aria-expanded={hover || modal}
        onClick={() => (canHover() ? setHover((h) => !h) : setModal(true))}
        onFocus={() => canHover() && setHover(true)}
        onBlur={() => setHover(false)}
        className={cn(
          'focus-ring flex items-center justify-center rounded-pill text-fg-subtle transition-colors hover:text-primary-soft aria-expanded:text-primary-soft',
          bare ? 'size-6' : 'size-7 border border-line hover:border-primary/50 aria-expanded:border-primary/50',
        )}
      >
        <Info className="size-3.5" />
      </button>
      {hover && (
        // pt-2 em vez de margem: o mouse passa do ícone para o balão sem sair da área
        <span role="tooltip" className={cn('absolute top-full z-30 w-[min(20rem,80vw)] animate-fade-in pt-2', align === 'start' ? 'left-0' : 'right-0')}>
          <span className="block rounded-card border border-line-strong bg-raised p-3 text-xs leading-relaxed font-normal tracking-normal text-fg-muted normal-case shadow-[0_12px_32px_rgb(0_0_0/0.5)]">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">{title}</span>
            {children}
          </span>
        </span>
      )}
      <Dialog open={modal} onClose={() => setModal(false)} title={title} eyebrow="Como funciona" size="sm">
        <div className="text-sm leading-relaxed text-fg-muted">{children}</div>
      </Dialog>
    </span>
  )
}

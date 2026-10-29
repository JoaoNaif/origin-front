import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Modal sobre o `<dialog>` nativo (`showModal`): camada de topo, foco preso e Esc de graça.
 * Fecha no Esc, no X e no clique fora; quem controla o `open` é o pai.
 */
export function Dialog({ open, onClose, title, eyebrow, children, footer, size = 'md', className }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** sm: explicação curta (InfoTip no mobile); md: conteúdo de página. */
  size?: 'sm' | 'md'
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-none max-w-none bg-transparent p-4 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-fade-in"
    >
      <div
        className={cn(
          'chamfer flex max-h-[calc(100dvh-2rem)] flex-col [--chamfer-bg:rgb(18_18_22/0.97)] [--chamfer-border:var(--color-line-strong)]',
          size === 'md' ? 'w-[min(56rem,calc(100vw-2rem))] [--cut:24px]' : 'w-[min(28rem,calc(100vw-2rem))] [--cut:16px]',
          className,
        )}
      >
        <header className="flex items-start gap-4 border-b border-line px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-subtle">{eyebrow}</p>}
            <h2 className={cn('truncate font-display leading-none font-extrabold uppercase italic text-silver-bright', size === 'md' ? 'text-4xl' : 'text-2xl')}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="focus-ring -mr-2 p-2 text-fg-muted transition-colors hover:text-fg">
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <footer className="border-t border-line px-6 py-4">{footer}</footer>}
      </div>
    </dialog>
  )
}

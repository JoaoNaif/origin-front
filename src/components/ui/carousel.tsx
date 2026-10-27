import { Children, useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

type CarouselState = { pages: number; page: number; canPrev: boolean; canNext: boolean }

/**
 * Carrossel com arrastar (mouse e touch), encaixe por página, setas, indicador de páginas e teclado (← →).
 * Cada filho vira um slide com a largura que ele mesmo define.
 */
export function Carousel({ label, children, className, viewportClassName }: {
  label: string
  children: ReactNode
  className?: string
  /** Ex.: espaço extra em cima para o conteúdo que cresce no hover (o viewport corta o que passa dele). */
  viewportClassName?: string
}) {
  const [viewportRef, api] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps', slidesToScroll: 'auto' })
  const [state, setState] = useState<CarouselState>({ pages: 0, page: 0, canPrev: false, canNext: false })

  useEffect(() => {
    if (!api) return
    const update = () =>
      setState({
        pages: api.scrollSnapList().length,
        page: api.selectedScrollSnap(),
        canPrev: api.canScrollPrev(),
        canNext: api.canScrollNext(),
      })
    update()
    api.on('select', update).on('reInit', update)
    return () => {
      api.off('select', update).off('reInit', update)
    }
  }, [api])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') api?.scrollPrev()
      if (event.key === 'ArrowRight') api?.scrollNext()
    },
    [api],
  )

  // Esmaece só a borda que ainda tem conteúdo para rolar
  const mask = `linear-gradient(to right, ${state.canPrev ? 'transparent, black 48px' : 'black'}, ${state.canNext ? 'black calc(100% - 48px), transparent' : 'black'})`

  return (
    <div role="region" aria-roledescription="carrossel" aria-label={label} onKeyDown={onKeyDown} className={className}>
      <div ref={viewportRef} className={cn('overflow-hidden py-2', viewportClassName)} style={{ maskImage: mask, WebkitMaskImage: mask }}>
        <div className="-ml-3 flex touch-pan-y">
          {Children.toArray(children).map((child, i) => (
            <div key={i} className="min-w-0 shrink-0 grow-0 pl-3">
              {child}
            </div>
          ))}
        </div>
      </div>

      {state.pages > 1 && (
        <div className="mt-4 flex items-center gap-4">
          <div className="flex flex-1 items-center gap-1.5">
            {Array.from({ length: state.pages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`Ir para a página ${i + 1}`}
                aria-current={i === state.page}
                className="focus-ring group flex h-4 items-center"
              >
                <span
                  className={cn(
                    'block h-[3px] transition-all duration-300 ease-out-soft',
                    i === state.page
                      ? 'w-10 bg-primary shadow-[0_0_8px_var(--color-primary)]'
                      : 'w-5 bg-line-strong group-hover:bg-fg-subtle',
                  )}
                />
              </button>
            ))}
          </div>

          <span className="font-mono text-[11px] tracking-[0.15em] text-fg-subtle tabular-nums">
            <span className="text-silver-bright">{String(state.page + 1).padStart(2, '0')}</span> / {String(state.pages).padStart(2, '0')}
          </span>

          <div className="flex gap-2">
            <ArrowButton direction="prev" disabled={!state.canPrev} onClick={() => api?.scrollPrev()} />
            <ArrowButton direction="next" disabled={!state.canNext} onClick={() => api?.scrollNext()} />
          </div>
        </div>
      )}
    </div>
  )
}

export function ArrowButton({ direction, disabled, onClick }: { direction: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Anterior' : 'Próximo'}
      className={cn(
        'focus-ring chamfer flex size-10 items-center justify-center text-fg-muted [--cut:8px]',
        '[--chamfer-bg:var(--color-raised)] [--chamfer-border:var(--color-line-strong)]',
        'transition-all duration-150 ease-out-soft',
        'hover:text-silver-bright hover:[--chamfer-border:rgb(167_139_250/0.7)] hover:[--chamfer-bg:var(--color-overlay)]',
        'active:[--chamfer-bg:var(--color-primary-dim)]',
        'disabled:pointer-events-none disabled:opacity-30',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

import { useSyncExternalStore } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { dismiss, toastStore } from '@/components/ui/toast'
import { cn } from '@/lib/cn'

/** Os avisos de 	oast no canto da tela. Montado uma vez, no main.tsx. */

export function Toaster() {
  const list = useSyncExternalStore(toastStore.subscribe, toastStore.get)

  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {list.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : XCircle
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'chamfer pointer-events-auto flex animate-fade-in items-start gap-3 p-3.5 [--cut:12px]',
              t.tone === 'success'
                ? '[--chamfer-bg:rgb(14_32_24/0.97)] [--chamfer-border:rgb(61_214_140/0.5)]'
                : '[--chamfer-bg:rgb(40_16_18/0.97)] [--chamfer-border:rgb(229_72_77/0.55)]',
            )}
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', t.tone === 'success' ? 'text-success' : 'text-danger-hover')} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight font-bold uppercase tracking-wide text-silver-bright">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-fg-muted">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="focus-ring -m-1 p-1 text-fg-subtle hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

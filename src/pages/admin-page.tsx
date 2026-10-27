import { Database, Users, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Page, PageHeader } from '@/components/layout/page'
import { AccountsPanel } from '@/features/admin/accounts-panel'
import { CatalogPanel } from '@/features/admin/catalog-panel'
import { cn } from '@/lib/cn'

type Tab = 'catalogo' | 'contas'

const tabs: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: 'catalogo', label: 'Catálogo', icon: Database },
  { value: 'contas', label: 'Contas', icon: Users },
]

/** Área do admin (só `role: ADMIN`; carregada sob demanda). A aba fica na URL (`?aba=`). */
export function AdminPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('aba') === 'contas' ? 'contas' : 'catalogo'

  return (
    <Page>
      <PageHeader
        eyebrow="Admin"
        title="Controle"
        description="Catálogo do jogo (modelos, skills, traços, campos, NPCs) e contas dos jogadores."
      />

      <div role="tablist" className="flex gap-1 border-b border-line">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setParams(value === 'catalogo' ? {} : { aba: value }, { replace: true })}
            className={cn(
              'focus-ring relative -mb-px flex h-11 items-center gap-2 px-4 font-display text-lg font-semibold uppercase tracking-[0.1em] transition-colors',
              tab === value ? 'text-silver-bright' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon className={cn('size-4', tab === value ? 'text-primary-soft' : 'text-fg-subtle')} />
            {label}
            {tab === value && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary shadow-glow" />}
          </button>
        ))}
      </div>

      {tab === 'catalogo' ? <CatalogPanel /> : <AccountsPanel />}
    </Page>
  )
}

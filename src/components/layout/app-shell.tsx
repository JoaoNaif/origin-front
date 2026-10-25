import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { Sidebar } from '@/components/layout/sidebar'
import { cn } from '@/lib/cn'

const COLLAPSED_KEY = 'origin:sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Casca das telas logadas: barra lateral fixa (recolhível) no desktop e menu em gaveta no mobile.
 * A tela de batalha fica fora daqui, em tela cheia.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1')
      } catch {
        // sem armazenamento: só não lembra a preferência
      }
      return !value
    })
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-line bg-surface transition-[width] duration-200 ease-out-soft lg:block',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile: gaveta */}
      <div className={cn('fixed inset-0 z-40 lg:hidden', !mobileOpen && 'pointer-events-none')}>
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 border-r border-line bg-surface shadow-panel transition-transform duration-200 ease-out-soft',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="focus-ring absolute top-4 right-4 flex size-8 items-center justify-center rounded-control text-fg-subtle hover:text-fg"
          >
            <X className="size-4" />
          </button>
          <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur-md lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="focus-ring flex size-9 items-center justify-center rounded-control text-fg-muted hover:bg-white/5 hover:text-fg"
          >
            <Menu className="size-5" />
          </button>
        </header>

        <main className="relative flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

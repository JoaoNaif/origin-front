import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  History,
  House,
  LayoutGrid,
  Lock,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Logo, LogoMark } from '@/components/brand/logo'
import { logout, meQueryKey, useMe } from '@/features/auth/auth-api'
import { useSkillOffers } from '@/features/game/game-api'
import { cn } from '@/lib/cn'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number; soon?: boolean }

type SidebarProps = {
  collapsed: boolean
  onToggleCollapsed?: () => void
  /** Chamado ao navegar (fecha o menu no mobile). */
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, onNavigate }: SidebarProps) {
  const { data: offers } = useSkillOffers()

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Jogar',
      items: [
        { to: '/', label: 'Lobby', icon: House, end: true },
        { to: '/batalhar', label: 'Batalhar', icon: Swords },
      ],
    },
    {
      title: 'Coleção',
      items: [
        { to: '/personagens', label: 'Personagens', icon: Users, badge: offers?.length },
        { to: '/esquadroes', label: 'Esquadrões', icon: LayoutGrid },
      ],
    },
    {
      title: 'Registro',
      items: [{ to: '/historico', label: 'Histórico', icon: History }],
    },
    {
      title: 'Em breve',
      items: [
        { to: '/ranqueado', label: 'Ranqueado', icon: Trophy, soon: true },
        { to: '/mercado', label: 'Mercado', icon: Store, soon: true },
        { to: '/baus', label: 'Baús', icon: Package, soon: true },
      ],
    },
  ]

  let index = 0

  return (
    <div className="relative flex h-full flex-col">
      <div className="pointer-events-none absolute inset-0 scanlines opacity-60" />

      <div className={cn('relative flex h-16 items-center', collapsed ? 'justify-center' : 'justify-between px-5')}>
        {collapsed ? <LogoMark /> : <Logo />}
        {onToggleCollapsed && !collapsed && <CollapseButton collapsed={collapsed} onClick={onToggleCollapsed} />}
      </div>

      <div className="mx-4 h-px bg-gradient-line" />

      <nav className="relative flex-1 space-y-5 px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-line first:hidden" />
            ) : (
              <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                {'// '}
                {group.title}
              </p>
            )}
            {group.items.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                index={String(++index).padStart(2, '0')}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      {onToggleCollapsed && collapsed && (
        <div className="relative flex justify-center pb-2">
          <CollapseButton collapsed={collapsed} onClick={onToggleCollapsed} />
        </div>
      )}

      <AccountCard collapsed={collapsed} />
    </div>
  )
}

function SidebarLink({ item, index, collapsed, onNavigate }: {
  item: NavItem
  index: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const content = (active: boolean) => (
    <>
      {active && <span className="absolute inset-y-1.5 -left-3 w-[3px] bg-primary shadow-[0_0_12px_var(--color-primary)]" />}
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-colors',
          active ? 'text-primary-soft' : 'text-fg-subtle group-hover:text-fg-muted',
        )}
      />
      {!collapsed && (
        <span className="flex-1 truncate font-display text-[17px] font-semibold uppercase tracking-[0.08em]">{item.label}</span>
      )}
      {!collapsed && item.soon && <Lock className="size-3.5 text-fg-subtle" />}
      {!collapsed && !item.soon && !item.badge && (
        <span className={cn('font-mono text-[10px]', active ? 'text-primary-soft' : 'text-fg-subtle/70')}>{index}</span>
      )}
      {!!item.badge && (
        <span
          className={cn(
            'flex min-w-5 items-center justify-center bg-primary px-1.5 font-mono text-[10px] font-bold text-on-primary',
            collapsed && 'absolute top-0.5 right-0.5 h-4 min-w-4 px-1',
          )}
        >
          {item.badge}
        </span>
      )}
      {collapsed && <Tooltip label={item.soon ? `${item.label} · em breve` : item.label} />}
    </>
  )

  const base = cn(
    'group relative flex h-10 items-center gap-3 transition-all duration-150 ease-out-soft [--cut:8px]',
    collapsed ? 'justify-center' : 'px-3',
  )

  if (item.soon) {
    return (
      <span aria-disabled className={cn(base, 'cursor-not-allowed text-fg-subtle/70')}>
        {content(false)}
      </span>
    )
  }

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          base,
          'focus-ring chamfer',
          isActive
            ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.12)] [--chamfer-border:rgb(139_92_246/0.4)]'
            : 'text-fg-muted [--chamfer-bg:transparent] hover:text-fg hover:[--chamfer-bg:rgb(255_255_255/0.04)]',
        )
      }
    >
      {({ isActive }) => content(isActive)}
    </NavLink>
  )
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 border border-line-strong bg-overlay px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-fg uppercase opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  )
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      className="focus-ring flex size-8 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-white/5 hover:text-fg"
    >
      <Icon className="size-4" />
    </button>
  )
}

function AccountCard({ collapsed }: { collapsed: boolean }) {
  const { data: account } = useMe()
  const queryClient = useQueryClient()

  // Sem conta no /me, o RequireAuth leva para o login
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(meQueryKey, null)
    },
  })

  const initials = (account?.displayName ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className="relative border-t border-line p-3">
      {!collapsed && (
        <p className="flex items-center gap-2 px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          <span className="size-1.5 animate-pulse rounded-pill bg-success shadow-[0_0_6px_var(--color-success)]" />
          Conectado
        </p>
      )}
      <div className={cn('flex items-center gap-3', collapsed ? 'flex-col' : 'px-2 py-1')}>
        <span className="chamfer flex size-9 shrink-0 items-center justify-center font-display text-sm font-bold text-primary-soft [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(139_92_246/0.5)] [--cut:7px]">
          {initials}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold uppercase tracking-wide text-fg">{account?.displayName}</p>
            <p className="truncate font-mono text-[11px] text-fg-subtle">@{account?.username}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          aria-label="Sair"
          title="Sair"
          className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-danger-dim hover:text-danger-hover disabled:opacity-40"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )
}

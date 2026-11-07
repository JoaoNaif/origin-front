import {
  BookOpen,
  ChevronRight,
  History,
  House,
  LayoutGrid,
  Lock,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Store,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Logo, LogoMark } from '@/components/brand/logo'
import { accountInitials, useLogout, useMe } from '@/features/auth/auth-api'
import { useChests, useWallet } from '@/features/economy/economy-api'
import { Coins } from '@/features/economy/economy-ui'
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
  const { data: chests } = useChests()
  const { data: account } = useMe()

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
      title: 'Economia',
      items: [
        { to: '/mercado', label: 'Mercado', icon: Store },
        { to: '/baus', label: 'Baús', icon: Package, badge: chests?.length },
      ],
    },
    {
      title: 'Registro',
      items: [
        { to: '/historico', label: 'Histórico', icon: History },
        { to: '/guia', label: 'Guia', icon: BookOpen },
      ],
    },
    {
      title: 'Em breve',
      items: [{ to: '/ranqueado', label: 'Ranqueado', icon: Trophy, soon: true }],
    },
  ]

  // Só esconde o link: a proteção é o 403 do backend
  if (account?.role === 'ADMIN') {
    groups.push({ title: 'Admin', items: [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] })
  }

  let index = 0

  return (
    <div className="relative flex h-full flex-col">
      {/* fundo: varredura, quadriculado sumindo e um brilho roxo no topo (recortado aqui, para as dicas da barra recolhida saírem para o lado) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 scanlines opacity-60" />
        <div className="absolute inset-x-0 top-0 h-48 bg-grid opacity-40 mask-[linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute -top-24 -left-16 size-64 rounded-pill bg-primary/10 blur-3xl" />
      </div>

      <div className={cn('relative flex h-16 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between px-5')}>
        <Link to="/" onClick={onNavigate} aria-label="Lobby" className="focus-ring group rounded-control transition-transform duration-200 hover:scale-[1.03]">
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
        {onToggleCollapsed && !collapsed && <CollapseButton collapsed={collapsed} onClick={onToggleCollapsed} />}
      </div>

      <div className="relative mx-4 h-px shrink-0 bg-gradient-line" />

      <nav className={cn('relative min-h-0 flex-1 space-y-4 px-3 py-4', !collapsed && 'overflow-y-auto [scrollbar-width:none]')}>
        {groups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-line first:hidden" />
            ) : (
              <p className="flex items-center gap-2 px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
                <span className="text-primary-soft/70">//</span>
                {group.title}
                <span className="h-px flex-1 bg-linear-to-r from-line to-transparent" />
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

      <AccountCard collapsed={collapsed} onNavigate={onNavigate} />
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
      {/* faixa do ativo e luz que entra pela esquerda no hover */}
      <span
        className={cn(
          'absolute top-1.5 bottom-1.5 left-0 w-0.75 bg-primary shadow-[0_0_12px_var(--color-primary)] transition-transform duration-200 ease-out-soft',
          active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-50',
        )}
      />
      {!item.soon && !collapsed && (
        <span
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-3/4 bg-linear-to-r from-primary/15 to-transparent transition-transform duration-500 ease-out-soft',
            active ? 'translate-x-0' : '-translate-x-full group-hover:translate-x-0',
          )}
        />
      )}

      {/* ícone num losango que gira no hover */}
      <span className="relative flex size-8 shrink-0 items-center justify-center">
        <span
          className={cn(
            'absolute inset-1.5 rotate-45 border transition-all duration-300 ease-out-soft',
            item.soon
              ? 'border-dashed border-line'
              : active
                ? 'border-primary-soft/70 bg-primary/20 shadow-[0_0_14px_-4px_var(--color-primary)]'
                : 'border-transparent group-hover:rotate-135 group-hover:border-line-strong group-hover:bg-bg/60',
          )}
        />
        <Icon
          className={cn(
            'relative size-4.5 transition-colors duration-200',
            active ? 'text-silver-bright' : item.soon ? 'text-fg-subtle/60' : 'text-fg-subtle group-hover:text-primary-soft',
          )}
        />
      </span>

      {!collapsed && (
        <span
          className={cn(
            'relative flex-1 truncate font-display text-[17px] font-semibold uppercase tracking-[0.08em] transition-transform duration-200 ease-out-soft',
            !active && !item.soon && 'group-hover:translate-x-0.5',
          )}
        >
          {item.label}
        </span>
      )}

      {!collapsed && item.soon && (
        <span className="relative flex items-center gap-1 border border-dashed border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-fg-subtle">
          <Lock className="size-2.5" /> Breve
        </span>
      )}
      {!collapsed && !item.soon && !item.badge && (
        <span className={cn('relative font-mono text-[10px] transition-colors', active ? 'text-primary-soft' : 'text-fg-subtle/60 group-hover:text-fg-subtle')}>
          {index}
        </span>
      )}
      {!!item.badge && (
        <span
          className={cn(
            'chamfer relative flex items-center justify-center font-mono text-[10px] font-bold text-on-primary [--chamfer-bg:var(--color-primary)] [--chamfer-border:var(--color-primary-soft)] [--cut:4px]',
            'shadow-[0_0_12px_-2px_var(--color-primary)]',
            collapsed ? 'absolute! top-0 right-0 h-4 min-w-4 px-1' : 'h-5 min-w-6 px-1.5',
          )}
        >
          {item.badge}
        </span>
      )}
      {collapsed && <Tooltip label={item.soon ? `${item.label} · em breve` : item.label} />}
    </>
  )

  const base = cn(
    'group relative flex h-11 items-center gap-2.5 transition-all duration-200 ease-out-soft [--cut:10px]',
    collapsed ? 'justify-center' : 'pr-3 pl-1.5',
  )

  if (item.soon) {
    return (
      <span aria-disabled className={cn(base, 'cursor-not-allowed text-fg-subtle/60')}>
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
          // a luz do hover fica dentro do item; recolhida, a dica precisa sair para o lado
          !collapsed && 'overflow-hidden',
          isActive
            ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.1)] [--chamfer-border:rgb(167_139_250/0.45)]'
            : 'text-fg-muted [--chamfer-bg:transparent] [--chamfer-border:transparent] hover:text-fg hover:[--chamfer-border:var(--color-line)]',
        )
      }
    >
      {({ isActive }) => content(isActive)}
    </NavLink>
  )
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 border border-line-strong bg-overlay px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-fg uppercase opacity-0 shadow-panel transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
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
      className="focus-ring chamfer flex size-8 items-center justify-center text-fg-subtle [--chamfer-bg:transparent] [--chamfer-border:transparent] [--cut:6px] transition-all hover:text-primary-soft hover:[--chamfer-bg:var(--color-raised)] hover:[--chamfer-border:var(--color-line-strong)]"
    >
      <Icon className="size-4" />
    </button>
  )
}

function AccountCard({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { data: account } = useMe()
  const { data: wallet } = useWallet()
  const { data: chests } = useChests()
  const logoutMutation = useLogout()
  const initials = accountInitials(account?.displayName)

  return (
    <div className="relative shrink-0 space-y-2 border-t border-line p-3">
      {/* carteira: moeda e baús fechados, leva ao Mercado */}
      {wallet && !collapsed && (
        <Link
          to="/mercado"
          onClick={onNavigate}
          title="Carteira (Mercado)"
          className="focus-ring chamfer group flex items-center gap-3 px-3 py-2 [--cut:8px] [--chamfer-bg:color-mix(in_srgb,var(--color-coin)_6%,var(--color-bg))] [--chamfer-border:color-mix(in_srgb,var(--color-coin)_25%,transparent)] transition-all hover:[--chamfer-border:color-mix(in_srgb,var(--color-coin)_70%,transparent)]"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-fg-subtle">Carteira</span>
            <Coins value={wallet.coins} className="text-sm font-bold text-silver-bright" />
          </span>
          {!!chests?.length && (
            <span className="flex items-center gap-1 border border-line-strong bg-bg/60 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted" title="Baús fechados">
              <Package className="size-3 text-primary-soft" /> {chests.length}
            </span>
          )}
          <ChevronRight className="size-3.5 text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-coin" />
        </Link>
      )}

      <div className={cn('flex items-center gap-2', collapsed && 'flex-col')}>
        <Link
          to="/conta"
          onClick={onNavigate}
          aria-label="Minha conta"
          title="Minha conta"
          className={cn(
            'focus-ring chamfer group flex min-w-0 flex-1 items-center gap-3 [--cut:8px] transition-all',
            '[--chamfer-bg:transparent] [--chamfer-border:transparent] hover:[--chamfer-bg:var(--color-raised)] hover:[--chamfer-border:var(--color-line)]',
            collapsed ? 'p-1' : 'p-1.5',
          )}
        >
          {/* avatar com o ponto de conectado no canto */}
          <span className="relative shrink-0">
            <span className="chamfer flex size-10 items-center justify-center font-display text-base font-extrabold italic text-primary-soft [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(139_92_246/0.5)] [--cut:8px] transition-all group-hover:text-silver-bright group-hover:[--chamfer-border:var(--color-primary-soft)]">
              {initials}
            </span>
            <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-pill border-2 border-surface bg-success shadow-[0_0_6px_var(--color-success)]" title="Conectado" />
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base leading-tight font-bold uppercase tracking-wide text-fg transition-colors group-hover:text-silver-bright">
                {account?.displayName}
              </p>
              <p className="truncate font-mono text-[10px] text-fg-subtle">@{account?.username}</p>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          aria-label="Sair"
          title="Sair"
          className="focus-ring chamfer flex size-9 shrink-0 items-center justify-center text-fg-subtle [--chamfer-bg:transparent] [--chamfer-border:var(--color-line)] [--cut:6px] transition-all hover:text-danger-hover hover:[--chamfer-bg:var(--color-danger-dim)] hover:[--chamfer-border:rgb(229_72_77/0.5)] disabled:opacity-40"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )
}

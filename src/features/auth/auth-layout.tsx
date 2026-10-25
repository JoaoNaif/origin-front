import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/cn'

/** Layout de login e cadastro: painel da marca à esquerda (desktop), formulário à direita. */
export function AuthLayout() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <section className="relative flex items-center justify-center bg-gradient-glow px-6 py-12 lg:bg-none">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  )
}

/** Cabeçalho padrão das telas de autenticação. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <header className="mb-8 space-y-2">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase italic text-silver-bright">{title}</h1>
      <p className="text-sm text-fg-muted">{subtitle}</p>
    </header>
  )
}

/** Alerta de erro do formulário (erro da API, não de campo). */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-control border border-danger/40 bg-danger-dim px-3.5 py-2.5 text-sm text-danger-hover">
      {children}
    </div>
  )
}

// Lado esquerdo: as duas grades 3x3 frente a frente, o coração do jogo.

const allyCells = [1, 3, 4, 6]
const enemyCells = [0, 4, 5, 8]

function MiniGrid({ cells, side }: { cells: number[]; side: 'ally' | 'enemy' }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 9 }, (_, i) => {
        const occupied = cells.includes(i)
        return (
          <div
            key={i}
            className={cn(
              'flex size-14 items-center justify-center rounded-control border transition-colors xl:size-16',
              occupied
                ? side === 'ally'
                  ? 'border-ally/50 bg-primary-dim/60 shadow-[0_0_24px_-8px_var(--color-ally)]'
                  : 'border-enemy/40 bg-danger-dim/50'
                : 'border-line/70 bg-surface/40',
            )}
          >
            {occupied && <span className={cn('size-2 rounded-pill', side === 'ally' ? 'bg-primary-soft' : 'bg-enemy')} />}
          </div>
        )
      })}
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-silver) 1px, transparent 1px), linear-gradient(90deg, var(--color-silver) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <div className="relative">
        <Logo />
      </div>

      <div className="relative flex items-center justify-center gap-8 xl:gap-12">
        <MiniGrid cells={allyCells} side="ally" />
        <span className="font-display text-xs font-semibold tracking-[0.3em] text-fg-subtle">VS</span>
        <MiniGrid cells={enemyCells} side="enemy" />
      </div>

      <div className="relative max-w-md space-y-3">
        <h2 className="font-display text-5xl leading-[0.9] font-extrabold uppercase italic text-silver-bright">
          Não vence o mais forte.
          <br />
          <span className="text-gradient-primary">Vence quem pensa melhor.</span>
        </h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Monte a formação, leia o adversário e escolha cada jogada. Na grade, a posição decide.
        </p>
      </div>
    </aside>
  )
}

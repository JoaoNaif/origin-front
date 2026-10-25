import type { ReactNode } from 'react'
import { Shield, Swords, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Referência visual do tema: cores, degradês, arredondamento e botões.

const colors = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['raised', 'bg-raised'],
  ['overlay', 'bg-overlay'],
  ['line', 'bg-line'],
  ['line-strong', 'bg-line-strong'],
  ['fg', 'bg-fg'],
  ['fg-muted', 'bg-fg-muted'],
  ['silver', 'bg-silver'],
  ['primary', 'bg-primary'],
  ['primary-soft', 'bg-primary-soft'],
  ['primary-dim', 'bg-primary-dim'],
  ['danger', 'bg-danger'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning'],
  ['info', 'bg-info'],
] as const

const gradients = [
  ['gradient-primary', 'bg-gradient-primary'],
  ['gradient-surface', 'bg-gradient-surface border border-line'],
  ['gradient-glow', 'bg-gradient-glow border border-line'],
] as const

const radii = [
  ['control · 4px', 'rounded-control', 'input, célula da grade'],
  ['card · 6px', 'rounded-card', 'card, painel'],
  ['panel · 8px', 'rounded-panel', 'modal, drawer'],
  ['chamfer', 'chamfer [--chamfer-border:var(--color-line-strong)] [--chamfer-bg:var(--color-raised)] border-0', 'botão, destaque, card de personagem'],
  ['hud-corners', 'hud-corners border-line/60 [--hud-color:var(--color-primary-soft)]', 'painel de dados'],
] as const

const sizes = ['lg', 'md', 'sm'] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-fg-muted">{title}</h2>
      {children}
    </section>
  )
}

export function DesignPage() {
  return (
    <main className="min-h-screen bg-gradient-glow">
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-16">
        <header className="space-y-2">
          <h1 className="font-display text-5xl font-semibold tracking-[0.2em] text-gradient-silver">ORIGIN</h1>
          <p className="text-fg-muted">Sistema visual: preto, prata e energia roxa.</p>
        </header>

        <Section title="Cores">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {colors.map(([name, cls]) => (
              <div key={name} className="overflow-hidden rounded-card border border-line bg-surface">
                <div className={`h-14 ${cls}`} />
                <p className="px-3 py-2 font-mono text-xs text-fg-muted">{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Degradês">
          <div className="grid gap-3 sm:grid-cols-3">
            {gradients.map(([name, cls]) => (
              <div key={name} className={`flex h-24 items-end rounded-card p-3 ${cls}`}>
                <span className="font-mono text-xs text-fg">{name}</span>
              </div>
            ))}
          </div>
          <p className="font-display text-3xl font-semibold text-gradient-primary">text-gradient-primary</p>
          <div className="h-px bg-gradient-line" />
        </Section>

        <Section title="Botões">
          {sizes.map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-3">
              <Button size={size}>
                <Swords className="size-4" /> Atacar
              </Button>
              <Button size={size} variant="secondary">
                <Shield className="size-4" /> Defender
              </Button>
              <Button size={size} variant="ghost">
                Cancelar
              </Button>
              <Button size={size} variant="danger">
                Desistir
              </Button>
              <Button size={size} disabled>
                Desabilitado
              </Button>
            </div>
          ))}
          <p className="text-xs text-fg-subtle">Use Tab para ver o foco.</p>
        </Section>

        <Section title="Arredondamento">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {radii.map(([name, cls, use]) => (
              <div key={name} className={`border border-line-strong bg-raised p-4 ${cls}`}>
                <p className="font-mono text-xs text-fg">{name}</p>
                <p className="text-xs text-fg-subtle">{use}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Exemplo: card de personagem">
          <div className="max-w-xs rounded-card border border-line bg-gradient-surface p-4 shadow-card transition-all duration-200 ease-out-soft hover:border-primary/50 hover:shadow-glow">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-silver-bright">Kael Vaz</span>
              <span className="rounded-pill bg-primary-dim px-2 py-0.5 text-xs text-primary-soft">Vanguarda</span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 overflow-hidden rounded-pill bg-overlay">
                <div className="h-full w-3/4 rounded-pill bg-success" />
              </div>
              <div className="h-1.5 overflow-hidden rounded-pill bg-overlay">
                <div className="h-full w-1/3 rounded-pill bg-warning" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-xs text-fg-muted">
              <Zap className="size-4 text-primary-soft" /> Nível 18
            </div>
          </div>
        </Section>
      </div>
    </main>
  )
}

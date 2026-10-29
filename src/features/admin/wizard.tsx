import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Note, RequiredMark } from '@/features/admin/form-fields'
import type { WizardStep } from '@/features/admin/wizard-steps'
import { cn } from '@/lib/cn'

// Passo a passo de todos os formulários do catálogo: trilha no topo, um passo por vez, o que falta embaixo e a
// navegação. O último passo é sempre a revisão, com o botão de salvar. Tipo e passo inicial em wizard-steps.ts.

export type { WizardStep }

export function Wizard<Id extends string>({ steps, current, onStep, problems, submitLabel, onSubmit, saving, children }: {
  steps: WizardStep<Id>[]
  current: Id
  onStep: (id: Id) => void
  /** O que falta em cada passo (vazio = pronto). A revisão (último) não entra. */
  problems: Record<Id, string[]>
  submitLabel: string
  /** Sem ele (ex.: dentro de outro formulário, que tem o próprio botão), o último passo não mostra o salvar. */
  onSubmit?: () => void
  saving?: boolean
  /** O conteúdo do passo atual. */
  children: ReactNode
}) {
  const index = steps.findIndex((s) => s.id === current)
  const prev = steps[index - 1]
  const next = steps[index + 1]
  const missing = next ? problems[current] : []

  return (
    <div className="space-y-6">
      <Stepper steps={steps} current={current} problems={problems} onSelect={onStep} />

      <div className="min-h-80">
        {children}
        {missing.length > 0 && (
          <div className="mt-6">
            <Note tone="warning">
              <p className="font-semibold">Falta neste passo:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Note>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-fg-subtle">
          <RequiredMark /> obrigatório
        </p>
        <div className="flex gap-2">
          {prev && (
            <Button size="sm" variant="ghost" onClick={() => onStep(prev.id)}>
              <ArrowLeft className="size-3.5" /> {prev.title}
            </Button>
          )}
          {next ? (
            <Button size="sm" variant={missing.length ? 'secondary' : 'primary'} onClick={() => onStep(next.id)}>
              Próximo: {next.title} <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            onSubmit && (
              <Button size="sm" onClick={onSubmit} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {submitLabel}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Trilha dos passos: marcadores do mesmo tamanho ligados por uma linha (verde até onde está pronto). Abaixo de 640px,
 * só os marcadores, e o nome do passo atual embaixo.
 */
function Stepper<Id extends string>({ steps, current, problems, onSelect }: {
  steps: WizardStep<Id>[]
  current: Id
  problems: Record<Id, string[]>
  onSelect: (id: Id) => void
}) {
  const last = steps[steps.length - 1].id
  const isDone = (id: Id) => id !== last && problems[id].length === 0
  const doneCount = steps.filter((s) => isDone(s.id)).length
  const index = steps.findIndex((s) => s.id === current)

  return (
    <div className="space-y-3 border-b border-line pb-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          Passo <span className="text-primary-soft">{String(index + 1).padStart(2, '0')}</span> / {String(steps.length).padStart(2, '0')}
          <span className="text-fg-muted sm:hidden"> · {steps[index].title}</span>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          <span className="text-success">{doneCount}</span> de {steps.length - 1} prontos
        </p>
      </div>

      <ol className="flex">
        {steps.map((s, i) => {
          const active = s.id === current
          const done = isDone(s.id)
          const missing = s.id !== last && !done
          return (
            <li key={s.id} className="relative flex min-w-0 flex-1 justify-center">
              {/* linha até o marcador anterior: verde se o anterior está pronto */}
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn('absolute top-4 right-[calc(50%+1.25rem)] left-[calc(-50%+1.25rem)] h-px', isDone(steps[i - 1].id) ? 'bg-success/50' : 'bg-line-strong')}
                />
              )}
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? 'step' : undefined}
                aria-label={`${s.title}${done ? ' (pronto)' : missing ? ' (falta algo)' : ''}`}
                className="focus-ring group flex min-w-0 flex-col items-center gap-2 rounded-control px-1"
              >
                <span
                  className={cn(
                    'chamfer relative flex size-8 shrink-0 items-center justify-center font-mono text-xs font-bold [--cut:7px] transition-all duration-150',
                    active
                      ? 'text-on-primary [--chamfer-bg:var(--color-primary)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_0_10px_rgb(139_92_246/0.55)]'
                      : done
                        ? 'text-success [--chamfer-bg:rgb(61_214_140/0.1)] [--chamfer-border:rgb(61_214_140/0.5)]'
                        : 'text-fg-muted [--chamfer-bg:var(--color-bg)] [--chamfer-border:var(--color-line-strong)] group-hover:[--chamfer-border:var(--color-fg-subtle)]',
                  )}
                >
                  {done && !active ? <Check className="size-4" /> : String(i + 1).padStart(2, '0')}
                  {missing && !active && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-pill bg-warning ring-2 ring-surface" />}
                </span>
                <span className="hidden min-w-0 flex-col items-center sm:flex">
                  <span
                    className={cn(
                      'max-w-full truncate font-display text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors',
                      active ? 'text-silver-bright' : 'text-fg-muted group-hover:text-fg',
                    )}
                  >
                    {s.title}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-subtle">
                    {s.id === last ? 'salvar' : s.optional ? 'opcional' : missing ? 'pendente' : 'pronto'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Cabeçalho de cada passo: o que é e para que serve. */
export function StepIntro({ title, optional, children }: { title: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="mb-5 space-y-2">
      <h3 className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-wide text-silver-bright">
        {title}
        <Badge tone={optional ? 'neutral' : 'primary'}>{optional ? 'Opcional' : 'Obrigatório'}</Badge>
      </h3>
      <Note>{children}</Note>
    </div>
  )
}

/** Lista da revisão: uma linha por passo, com o resumo e o que falta; clicar volta ao passo. */
export function ReviewList<Id extends string>({ rows, problems, onGo }: {
  rows: { id: Id; label: string; value: ReactNode }[]
  problems: Record<Id, string[]>
  onGo: (id: Id) => void
}) {
  return (
    <ul className="divide-y divide-line rounded-control border border-line">
      {rows.map((row) => {
        const ok = problems[row.id].length === 0
        return (
          <li key={row.id}>
            <button type="button" onClick={() => onGo(row.id)} className="focus-ring flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-white/2">
              {ok ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <span className="mt-1.5 size-2 shrink-0 rounded-pill bg-warning" />}
              <span className="w-36 shrink-0 text-xs uppercase tracking-[0.12em] text-fg-muted">{row.label}</span>
              <span className="min-w-0 flex-1 text-sm text-fg">
                {row.value}
                {problems[row.id].map((m) => (
                  <span key={m} className="block text-xs text-warning">
                    {m}
                  </span>
                ))}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Fim da revisão: tudo pronto, ou o que ainda falta (salvar continua liberado: o servidor diz o que impede). */
export function ReviewStatus<Id extends string>({ steps, problems }: { steps: WizardStep<Id>[]; problems: Record<Id, string[]> }) {
  const pending = steps.slice(0, -1).filter((s) => problems[s.id].length > 0)
  return pending.length === 0 ? (
    <Note tone="success">Tudo certo. Ao salvar, o servidor confere de novo e, se algo não bater, o motivo aparece no topo.</Note>
  ) : (
    <Note tone="warning">
      Ainda falta: {pending.map((s) => s.title).join(', ')}. Você pode tentar salvar mesmo assim: o servidor diz o que impede.
    </Note>
  )
}
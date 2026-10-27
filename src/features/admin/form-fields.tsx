import { useId, type ReactNode } from 'react'
import { Check, Info } from 'lucide-react'
import type { Option } from '@/features/admin/admin-schema'
import { cn } from '@/lib/cn'

// Campos do formulário do admin: controlados, com rótulo, dica e exemplo. Visual funcional, mesma paleta do jogo.

const control =
  'h-10 w-full rounded-control border border-line bg-bg px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-line-strong focus:border-primary focus:shadow-[0_0_0_3px_rgb(139_92_246/0.18)]'

/** Rótulo, dica embaixo e erro. `wide` ocupa a linha inteira da grade. */
export function Field({ label, hint, error, wide, htmlFor, children }: {
  label: string
  hint?: ReactNode
  error?: string
  wide?: boolean
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', wide && 'sm:col-span-2')}>
      <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-fg-subtle">{hint}</p>
      )}
    </div>
  )
}

export function TextField({ label, value, onChange, placeholder, hint, error, wide, mono }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: ReactNode
  error?: string
  wide?: boolean
  mono?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} wide={wide} htmlFor={id}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={cn(control, mono && 'font-mono', error && 'border-danger/70')}
      />
    </Field>
  )
}

/** Texto opcional: vazio vira `null` (o servidor aceita `description: null`). */
export function TextAreaField({ label, value, onChange, placeholder, hint, rows = 3, required }: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  hint?: ReactNode
  rows?: number
  /** Obrigatório: vazio continua `''` em vez de `null`. */
  required?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} wide htmlFor={id}>
      <textarea
        id={id}
        value={value ?? ''}
        rows={rows}
        onChange={(e) => onChange(e.target.value || (required ? '' : null))}
        placeholder={placeholder}
        className={cn(control, 'h-auto resize-y py-2 leading-relaxed')}
      />
    </Field>
  )
}

export function NumberField({ label, value, onChange, step = 1, min, max, unit, hint, error, placeholder, allowEmpty }: {
  label: string
  value: number | null | undefined
  onChange: (value: number | null) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  hint?: ReactNode
  error?: string
  placeholder?: string
  /** Vazio = `null` (campo opcional). */
  allowEmpty?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className={cn(control, 'flex items-center gap-2 px-0 focus-within:border-primary', error && 'border-danger/70')}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={(e) => {
            if (e.target.value === '') return onChange(allowEmpty ? null : 0)
            const n = Number(e.target.value)
            if (!Number.isNaN(n)) onChange(n)
          }}
          className="h-full w-full min-w-0 bg-transparent px-3 font-mono text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        {unit && <span className="shrink-0 pr-3 font-mono text-[11px] text-fg-subtle">{unit}</span>}
      </div>
    </Field>
  )
}

/** Lista de escolha. `emptyLabel`: permite "nenhum" (vira `null`). */
export function SelectField({ label, value, onChange, options, hint, error, wide, emptyLabel }: {
  label: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: Option[]
  hint?: ReactNode
  error?: string
  wide?: boolean
  emptyLabel?: string
}) {
  const id = useId()
  const selected = options.find((o) => o.value === value)
  return (
    <Field label={label} hint={selected?.hint ?? hint} error={error} wide={wide} htmlFor={id}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-invalid={error ? true : undefined}
        className={cn(control, 'cursor-pointer pr-8', !value && 'text-fg-subtle', error && 'border-danger/70')}
      >
        {(emptyLabel !== undefined || !selected) && <option value="">{emptyLabel ?? 'Escolha...'}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-fg">
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Botões de escolha única lado a lado (poucas opções: alvo, área, dificuldade). */
export function Segmented({ label, value, onChange, options, hint, wide }: {
  label: string
  value: string | null
  onChange: (value: string) => void
  options: Option[]
  hint?: ReactNode
  wide?: boolean
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <Field label={label} hint={selected?.hint ?? hint} wide={wide}>
      <div role="radiogroup" className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn(
              'focus-ring h-9 rounded-control border px-3 text-sm transition-colors',
              o.value === value
                ? 'border-primary bg-primary-dim text-silver-bright'
                : 'border-line bg-bg text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  )
}

/** Várias escolhas em etiquetas clicáveis (traços pedidos, traços do NPC). */
export function MultiPick({ label, values, onChange, options, max, hint, error, wide = true }: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  options: Option[]
  max?: number
  hint?: ReactNode
  error?: string
  wide?: boolean
}) {
  const full = max !== undefined && values.length >= max
  return (
    <Field label={max !== undefined ? `${label} (${values.length}/${max})` : label} hint={hint} error={error} wide={wide}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = values.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              title={o.hint}
              onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
              className={cn(
                'focus-ring flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-xs transition-colors disabled:opacity-40',
                on ? 'border-primary bg-primary-dim text-silver-bright' : 'border-line bg-bg text-fg-muted hover:text-fg',
              )}
            >
              {on && <Check className="size-3 text-primary-soft" />}
              {o.label}
            </button>
          )
        })}
        {options.length === 0 && <span className="text-xs text-fg-subtle">Nada para escolher ainda.</span>}
      </div>
    </Field>
  )
}

export function Toggle({ label, checked, onChange, hint }: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
          checked ? 'border-primary bg-primary' : 'border-line-strong bg-bg',
        )}
      >
        {checked && <Check className="size-3 text-on-primary" />}
      </span>
      <span>
        <span className="text-sm text-fg">{label}</span>
        {hint && <span className="block text-xs text-fg-subtle">{hint}</span>}
      </span>
    </label>
  )
}

/** Bloco do formulário com número, título e explicação. */
export function FormSection({ index, title, description, actions, children }: {
  index: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4 border-t border-line pt-5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="flex items-baseline gap-2.5 font-display text-xl font-bold uppercase tracking-wide text-silver-bright">
            <span className="font-mono text-[11px] font-medium text-primary-soft">{index}</span>
            {title}
          </h3>
          {description && <p className="max-w-2xl text-xs text-fg-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn('grid gap-4', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-3', cols === 4 && 'sm:grid-cols-2 lg:grid-cols-4')}
    >
      {children}
    </div>
  )
}

/** Caixa de explicação (o que é, exemplo). */
export function Note({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-control border px-3 py-2.5 text-xs leading-relaxed',
        tone === 'info' ? 'border-info/25 bg-info/5 text-fg-muted' : 'border-warning/30 bg-warning/10 text-warning',
      )}
    >
      <Info className={cn('mt-px size-3.5 shrink-0', tone === 'info' ? 'text-info' : 'text-warning')} />
      <div>{children}</div>
    </div>
  )
}

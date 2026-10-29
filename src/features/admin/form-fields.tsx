import { useId, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Info } from 'lucide-react'
import { InfoTip } from '@/components/ui/info-tip'
import type { Option } from '@/features/admin/admin-schema'
import { cn } from '@/lib/cn'

// Campos do formulário do admin: controlados, com rótulo, dica e exemplo. Visual funcional, mesma paleta do jogo.
// A dica fica num ícone de info: nos campos (texto, número, lista), numa área fixa à direita dentro da caixa; nos
// botões de escolha, ao lado do rótulo.

/** O elemento nativo dentro da caixa: sem borda nem fundo próprios (quem desenha é a ControlBox). */
const inner = 'h-10 w-full min-w-0 flex-1 bg-transparent px-3 text-sm text-fg outline-none placeholder:text-fg-subtle'

/**
 * Caixa de todo campo: a borda, o foco e o erro ficam aqui; dentro, o elemento nativo, o que vem depois dele (unidade,
 * seta da lista) e, se houver dica, o ícone de info numa área à direita separada por uma linha. Mesmo desenho em todos.
 */
function ControlBox({ label, hint, error, multiline, trailing, children }: {
  label: string
  hint?: ReactNode
  error?: string
  /** Texto longo: o ícone fica no alto, não no meio. */
  multiline?: boolean
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex w-full rounded-control border bg-bg transition-colors hover:border-line-strong focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgb(139_92_246/0.18)]',
        multiline ? 'items-start' : 'items-center',
        error ? 'border-danger/70' : 'border-line',
      )}
    >
      {children}
      {trailing}
      {!!hint && (
        <span className={cn('flex w-9 shrink-0 justify-center self-stretch border-l border-line', multiline ? 'items-start pt-2' : 'items-center')}>
          <InfoTip title={label} bare align="end">
            {hint}
          </InfoTip>
        </span>
      )}
    </div>
  )
}

/**
 * Rótulo, controle e erro embaixo. `wide` ocupa a linha inteira da grade. `hint` aqui vira ícone ao lado do rótulo
 * (para os botões de escolha); os campos passam a dica para a ControlBox.
 */
export function Field({ label, hint, error, wide, htmlFor, required, children }: {
  label: string
  hint?: ReactNode
  error?: string
  wide?: boolean
  htmlFor?: string
  /** Marca o rótulo com `*` (obrigatório). */
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', wide && 'sm:col-span-2')}>
      <div className="flex min-h-6 items-center gap-1">
        <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">
          {label}
          {required && <RequiredMark />}
        </label>
        {hint && (
          <InfoTip title={label} bare>
            {hint}
          </InfoTip>
        )}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({ label, value, onChange, placeholder, hint, error, wide, mono, required }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: ReactNode
  error?: string
  wide?: boolean
  mono?: boolean
  required?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} error={error} wide={wide} htmlFor={id} required={required}>
      <ControlBox label={label} hint={hint} error={error}>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          className={cn(inner, mono && 'font-mono')}
        />
      </ControlBox>
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
    <Field label={label} wide htmlFor={id} required={required}>
      <ControlBox label={label} hint={hint} multiline>
        <textarea
          id={id}
          value={value ?? ''}
          rows={rows}
          onChange={(e) => onChange(e.target.value || (required ? '' : null))}
          placeholder={placeholder}
          className={cn(inner, 'block h-auto resize-y py-2 leading-relaxed')}
        />
      </ControlBox>
    </Field>
  )
}

export function NumberField({ label, value, onChange, step = 1, min, max, unit, hint, error, placeholder, allowEmpty, required }: {
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
  required?: boolean
}) {
  const id = useId()
  // o texto enquanto digita: deixa o campo vazio (para trocar o número) sem virar 0 na hora
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Field label={label} error={error} htmlFor={id} required={required}>
      <ControlBox
        label={label}
        hint={hint}
        error={error}
        trailing={unit && <span className="shrink-0 pr-3 font-mono text-[11px] text-fg-subtle">{unit}</span>}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft ?? value ?? ''}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const text = e.target.value
            setDraft(text)
            if (text === '') {
              if (allowEmpty) onChange(null)
              return
            }
            const n = Number(text)
            if (!Number.isNaN(n)) onChange(n)
          }}
          onBlur={() => {
            // saiu vazio: obrigatório volta a 0
            if (draft === '' && !allowEmpty) onChange(0)
            setDraft(null)
          }}
          className={cn(inner, 'font-mono')}
        />
      </ControlBox>
    </Field>
  )
}

/** Lista de escolha. `emptyLabel`: permite "nenhum" (vira `null`). Seta própria: a nativa disputaria lugar com a dica. */
export function SelectField({ label, value, onChange, options, hint, error, wide, emptyLabel, required }: {
  label: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: Option[]
  hint?: ReactNode
  error?: string
  wide?: boolean
  emptyLabel?: string
  required?: boolean
}) {
  const id = useId()
  const selected = options.find((o) => o.value === value)
  return (
    <Field label={label} error={error} wide={wide} htmlFor={id} required={required}>
      <ControlBox
        label={label}
        // a dica da opção escolhida (ex.: o que a classe faz) vale mais que a geral
        hint={selected?.hint ?? hint}
        error={error}
        trailing={<ChevronDown aria-hidden className="pointer-events-none -ml-8 mr-3 size-4 shrink-0 text-fg-subtle" />}
      >
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          aria-invalid={error ? true : undefined}
          // fundo transparente (respeita o canto arredondado da caixa); cada opção tem fundo próprio, senão a lista aberta herda o transparente e fica branca
          className={cn(inner, 'cursor-pointer appearance-none truncate pr-9', !value && 'text-fg-subtle')}
        >
          {(emptyLabel !== undefined || !selected) && (
            <option value="" className="bg-bg text-fg-subtle">
              {emptyLabel ?? 'Escolha...'}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-bg text-fg">
              {o.label}
            </option>
          ))}
        </select>
      </ControlBox>
    </Field>
  )
}
/** Botões de escolha única lado a lado (poucas opções: alvo, área, dificuldade). */
export function Segmented({ label, value, onChange, options, hint, wide, required }: {
  label: string
  value: string | null
  onChange: (value: string) => void
  options: Option[]
  hint?: ReactNode
  wide?: boolean
  required?: boolean
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <Field label={label} hint={selected?.hint ?? hint} wide={wide} required={required}>
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

/**
 * Escolha única em cartões, cada um com nome, explicação e um extra (números, desenho). Para escolhas que precisam de
 * explicação para fazer sentido (tipo, alvo e área da skill).
 */
export function ChoiceCards({ label, value, onChange, options, cols = 3, required, hint }: {
  label: string
  value: string | null
  onChange: (value: string) => void
  options: { value: string; label: string; description: string; extra?: ReactNode; disabled?: boolean }[]
  cols?: 2 | 3 | 4 | 5
  required?: boolean
  hint?: ReactNode
}) {
  return (
    <Field label={label} hint={hint} required={required} wide>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          'grid gap-2 sm:grid-cols-2',
          cols === 3 && 'lg:grid-cols-3',
          cols === 4 && 'lg:grid-cols-4',
          cols === 5 && 'lg:grid-cols-3 xl:grid-cols-5',
        )}
      >
        {options.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                'focus-ring flex flex-col gap-1.5 rounded-control border p-3 text-left transition-colors disabled:opacity-40',
                on ? 'border-primary bg-primary-dim' : 'border-line bg-bg hover:border-line-strong',
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn('flex size-3.5 shrink-0 items-center justify-center rounded-pill border', on ? 'border-primary-soft' : 'border-line-strong')}>
                  {on && <span className="size-1.5 rounded-pill bg-primary-soft" />}
                </span>
                <span className={cn('font-display text-base leading-tight font-bold uppercase tracking-wide', on ? 'text-silver-bright' : 'text-fg')}>{o.label}</span>
              </span>
              <span className="text-xs leading-relaxed text-fg-muted">{o.description}</span>
              {o.extra}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

/** Várias escolhas em etiquetas clicáveis (traços pedidos, traços do NPC). */
export function MultiPick({ label, values, onChange, options, max, hint, error, wide = true, required }: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  options: Option[]
  max?: number
  hint?: ReactNode
  error?: string
  wide?: boolean
  required?: boolean
}) {
  const full = max !== undefined && values.length >= max
  return (
    <Field label={max !== undefined ? `${label} (${values.length}/${max})` : label} hint={hint} error={error} wide={wide} required={required}>
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

export function RequiredMark() {
  return (
    <span className="ml-1 text-danger-hover" title="Obrigatório">
      *
    </span>
  )
}

/** Caixa de explicação (o que é, exemplo). */
const noteTones = {
  info: ['border-info/25 bg-info/5 text-fg-muted', 'text-info'],
  warning: ['border-warning/30 bg-warning/10 text-warning', 'text-warning'],
  success: ['border-success/30 bg-success/5 text-fg-muted', 'text-success'],
} as const

export function Note({ tone = 'info', children }: { tone?: keyof typeof noteTones; children: ReactNode }) {
  const [box, icon] = noteTones[tone]
  return (
    <div className={cn('flex gap-2.5 rounded-control border px-3 py-2.5 text-xs leading-relaxed', box)}>
      <Info className={cn('mt-px size-3.5 shrink-0', icon)} />
      <div>{children}</div>
    </div>
  )
}

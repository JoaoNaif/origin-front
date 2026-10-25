import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'

type InputProps = ComponentProps<'input'> & {
  label: string
  error?: string
  icon?: ReactNode
  /** Elemento à direita do campo (ex.: botão de mostrar senha). */
  trailing?: ReactNode
}

export function Input({ label, error, icon, trailing, className, id, ...props }: InputProps) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const errorId = `${inputId}-error`

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">
        {label}
      </label>
      <div
        className={cn(
          'group flex h-11 items-center gap-2.5 rounded-control border bg-surface px-3.5',
          'transition-all duration-150 ease-out-soft',
          'focus-within:bg-raised',
          error
            ? 'border-danger/70 focus-within:shadow-[0_0_0_3px_rgb(229_72_77/0.18)]'
            : 'border-line hover:border-line-strong focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgb(139_92_246/0.18)]',
        )}
      >
        {icon && (
          <span
            className={cn(
              'flex shrink-0 transition-colors [&>svg]:size-4',
              error ? 'text-danger' : 'text-fg-subtle group-focus-within:text-primary-soft',
            )}
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-full w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle',
            className,
          )}
          {...props}
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordInput(props: Omit<InputProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
          className="focus-ring -mr-1 flex size-7 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:text-fg"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  )
}

import { useState, type ReactNode } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import {
  adminErrorMessage,
  catalogKeys,
  editableBody,
  useSaveCatalogEntry,
  type AdminCatalog,
  type CatalogCollection,
  type CatalogItem,
} from '@/features/admin/admin-api'
import { KEY_PATTERN, slugify, type AdminRules, type FormProps } from '@/features/admin/admin-schema'
import { Field } from '@/features/admin/form-fields'

/**
 * Item de outra coleção criado (ou editado) sem sair do formulário atual: o assistente do modelo cria a variante, o
 * traço e as skills do kit por aqui. Salva na hora, sozinho; quem abriu recebe a `key` e liga o item.
 */
export function InlineEntry<T extends Record<string, unknown>>({ collection, item, initial, keyPrefix = '', title, description, catalog, rules, render, onDone, onCancel }: {
  collection: CatalogCollection
  /** Item existente (editar). Sem ele, cria um novo. */
  item?: CatalogItem
  initial: T
  /** Começo fixo da key (skills: "modelo:"). */
  keyPrefix?: string
  title: string
  description?: ReactNode
  catalog: AdminCatalog
  rules: AdminRules | undefined
  render: (props: FormProps<T>) => ReactNode
  onDone: (key: string) => void
  onCancel: () => void
}) {
  const [body, setBody] = useState<T>(() => (item ? (editableBody(collection, item) as T) : initial))
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const save = useSaveCatalogEntry(collection)
  const [localError, setLocalError] = useState<string | null>(null)

  const name = String(body.name ?? '')
  const currentSlug = slugTouched ? slug : slugify(name)
  const key = item ? item.key : `${keyPrefix}${currentSlug}`
  const exists = !item && catalog[catalogKeys[collection]].some((i) => i.key === key)
  const keyError = item || !currentSlug ? undefined : !KEY_PATTERN.test(key) ? 'Use só minúsculas, números e "-".' : exists ? 'Já existe um item com essa key.' : undefined

  const submit = () => {
    if (!name.trim()) return setLocalError('Dê um nome.')
    if (!currentSlug || keyError) return setLocalError(keyError ?? 'Preencha a key.')
    setLocalError(null)
    save.mutate(
      { key, body, isNew: !item },
      {
        onSuccess: () => {
          toast.success(item ? 'Salvo no catálogo' : 'Criado no catálogo', `${name} · ${key}`)
          onDone(key)
        },
        onError: () => toast.error('Não foi possível salvar', 'O motivo está logo acima dos botões.'),
      },
    )
  }

  const error = localError ?? (save.isError ? adminErrorMessage(save.error) : null)

  return (
    <div className="space-y-5 rounded-card border border-primary/40 bg-bg/70 p-4 shadow-[0_0_0_4px_rgb(139_92_246/0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">{item ? 'Editando' : 'Criando'}</p>
          <p className="font-display text-xl font-bold uppercase tracking-wide text-silver-bright">{title}</p>
          {description && <p className="max-w-2xl text-xs text-fg-muted">{description}</p>}
        </div>
        <button type="button" onClick={onCancel} aria-label="Fechar" className="focus-ring p-1 text-fg-subtle hover:text-fg">
          <X className="size-4" />
        </button>
      </div>

      {!item && (
        <Field label="Key" required error={keyError} hint="Identificador fixo, não muda depois. Sai do nome; mexa só se quiser outro.">
          <div className="flex h-10 items-center rounded-control border border-line bg-bg focus-within:border-primary">
            {keyPrefix && <span className="pl-3 font-mono text-sm text-fg-subtle">{keyPrefix}</span>}
            <input
              value={currentSlug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              placeholder="preenchida pelo nome"
              className="h-full w-full min-w-0 bg-transparent px-1.5 font-mono text-sm text-fg outline-none placeholder:text-fg-subtle first:px-3"
            />
          </div>
        </Field>
      )}

      {render({ value: body, onChange: setBody, catalog, rules, itemKey: key, isNew: !item })}

      {error && (
        <pre role="alert" className="whitespace-pre-wrap rounded-control border border-danger/30 bg-danger-dim px-3 py-2.5 font-sans text-xs text-fg">
          {error}
        </pre>
      )}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={submit} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          {item ? 'Salvar' : 'Criar e usar'}
        </Button>
      </div>
    </div>
  )
}

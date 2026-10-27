import { useMemo, useState, type ComponentType } from 'react'
import { Braces, Copy, FileText, Loader2, Plus, Save, Search, Trash2, Undo2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  adminErrorMessage,
  catalogKeys,
  readOnlyFields,
  useAdminCatalog,
  useAdminOptions,
  useDeleteCatalogEntry,
  useSaveCatalogEntry,
  type AdminCatalog,
  type CatalogCollection,
  type CatalogItem,
} from '@/features/admin/admin-api'
import { collectionInfo, emptyBodies, KEY_PATTERN, slugify, type AdminRules, type FormProps } from '@/features/admin/admin-schema'
import { FieldForm, TraitForm, VariantForm } from '@/features/admin/entry-forms'
import { Field, Note } from '@/features/admin/form-fields'
import { NpcSquadForm } from '@/features/admin/npc-squad-form'
import { SkillForm } from '@/features/admin/skill-form'
import { TemplateForm } from '@/features/admin/template-form'
import { cn } from '@/lib/cn'

const collections = Object.keys(collectionInfo) as CatalogCollection[]

// os corpos são tipados em cada formulário; aqui o painel só passa adiante
const forms = {
  variants: VariantForm,
  traits: TraitForm,
  templates: TemplateForm,
  skills: SkillForm,
  fields: FieldForm,
  'npc-squads': NpcSquadForm,
} as unknown as Record<CatalogCollection, ComponentType<FormProps<Record<string, unknown>>>>

/** Corpo da edição: o item sem a `key` (vai na URL) e sem os campos só de leitura. */
function editableBody(collection: CatalogCollection, item: CatalogItem) {
  const hidden = new Set(['key', ...(readOnlyFields[collection] ?? [])])
  return structuredClone(Object.fromEntries(Object.entries(item).filter(([field]) => !hidden.has(field))))
}

/** Erro de kit do modelo (D92, D97): diz o que fazer, não só o que falta. */
function withKitHelp(message: string, key: string) {
  if (!message.includes('kit do modelo')) return message
  const prefix = message.match(/kit do modelo ([a-z0-9-]+)/)?.[1] ?? (key.split(':')[0] || 'key-do-modelo')
  return `${message}\n\nO modelo precisa de 4 skills do kit já criadas, com a key começando por "${prefix}:", a "Classe do kit" igual à do modelo e um de cada papel (Básica, Padrão, Função e Assinatura). Com 1 variante, as 4 são dela; com 2, duas de cada; com 3, duas da principal e uma de cada outra. Crie as skills em Skills (em "Modelo dono", digite "${prefix}" mesmo antes de o modelo existir) e depois o modelo.`
}

/** Seleção: um item existente pela `key`, ou um novo (em branco ou copiado de outro). */
type Selection = { key: string; isNew: false } | { from: CatalogItem | null; isNew: true; seq: number }

export function CatalogPanel() {
  const catalog = useAdminCatalog()
  const options = useAdminOptions()
  const [collection, setCollection] = useState<CatalogCollection>('templates')
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<Selection | null>(null)

  const items = useMemo(() => catalog.data?.[catalogKeys[collection]] ?? [], [catalog.data, collection])
  const q = query.trim().toLowerCase()
  const shown = items.filter((item) => `${item.key} ${item.name}`.toLowerCase().includes(q))
  const selected = selection && !selection.isNew ? items.find((i) => i.key === selection.key) : undefined
  const info = collectionInfo[collection]
  const rules = options.data?.rules as AdminRules | undefined

  const changeCollection = (value: CatalogCollection) => {
    setCollection(value)
    setSelection(null)
    setQuery('')
  }
  const startNew = (from: CatalogItem | null) => setSelection({ from, isNew: true, seq: Date.now() })

  if (catalog.isPending) return <div className="h-[32rem] animate-pulse bg-raised" />
  if (catalog.isError) return <p className="text-sm text-danger">{adminErrorMessage(catalog.error)}</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {collections.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => changeCollection(c)}
            className={cn(
              'focus-ring chamfer flex h-9 items-center gap-2 px-4 font-display text-sm font-semibold uppercase tracking-[0.1em] transition-colors [--cut:7px]',
              collection === c
                ? 'text-silver-bright [--chamfer-bg:rgb(139_92_246/0.14)] [--chamfer-border:rgb(139_92_246/0.5)]'
                : 'text-fg-muted [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:text-fg',
            )}
          >
            {collectionInfo[c].label}
            <span className="font-mono text-[10px] text-fg-subtle">{catalog.data[catalogKeys[c]].length}</span>
          </button>
        ))}
        <Badge className="ml-auto">versão {catalog.data.version}</Badge>
      </div>

      <Note>
        <b className="text-fg">{info.label}:</b> {info.help}
      </Note>

      <div className="grid items-start gap-5 lg:grid-cols-[17rem_1fr]">
        <aside className="hud-corners flex max-h-[44rem] flex-col border border-line bg-surface [--hud-color:var(--color-line-strong)] lg:sticky lg:top-6">
          <div className="space-y-2 border-b border-line p-2">
            <Button size="sm" className="w-full" onClick={() => startNew(null)}>
              <Plus className="size-4" /> Nova {info.singular}
            </Button>
            <label className="flex h-9 items-center gap-2 rounded-control border border-line bg-bg px-2.5 focus-within:border-primary">
              <Search className="size-3.5 text-fg-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nome ou key"
                className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
              />
            </label>
          </div>
          <ul className="flex-1 overflow-y-auto py-1">
            {shown.map((item) => {
              const active = selected?.key === item.key
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setSelection({ key: item.key, isNew: false })}
                    className={cn(
                      'focus-ring relative w-full px-3 py-2 text-left transition-colors',
                      active ? 'bg-primary-dim' : 'hover:bg-white/[0.03]',
                    )}
                  >
                    {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
                    <p className={cn('truncate text-sm', active ? 'text-silver-bright' : 'text-fg')}>{item.name}</p>
                    <p className="truncate font-mono text-[11px] text-fg-subtle">{item.key}</p>
                  </button>
                </li>
              )
            })}
            {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-subtle">Nada encontrado.</li>}
          </ul>
        </aside>

        {selection?.isNew ? (
          <EntryEditor
            key={`new-${collection}-${selection.seq}`}
            collection={collection}
            item={selection.from}
            isNew
            catalog={catalog.data}
            rules={rules}
            onSaved={(key) => setSelection({ key, isNew: false })}
            onCancel={() => setSelection(null)}
          />
        ) : selected ? (
          <EntryEditor
            key={`${collection}-${selected.key}-${catalog.data.version}`}
            collection={collection}
            item={selected}
            isNew={false}
            catalog={catalog.data}
            rules={rules}
            onSaved={(key) => setSelection({ key, isNew: false })}
            onDeleted={() => setSelection(null)}
            onDuplicate={() => startNew(selected)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-line-strong bg-surface/50 px-6 py-20 text-center">
            <p className="text-sm text-fg-muted">Escolha um item da lista para editar, ou crie um novo.</p>
            <p className="font-mono text-xs text-fg-subtle">{info.example}</p>
            <Button size="sm" variant="secondary" onClick={() => startNew(null)}>
              <Plus className="size-4" /> Nova {info.singular}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function EntryEditor({ collection, item, isNew, catalog, rules, onSaved, onDeleted, onDuplicate, onCancel }: {
  collection: CatalogCollection
  /** No novo: o item de onde o corpo foi copiado (nulo = em branco). */
  item: CatalogItem | null
  isNew: boolean
  catalog: AdminCatalog
  rules: AdminRules | undefined
  onSaved: (key: string) => void
  onDeleted?: () => void
  onDuplicate?: () => void
  onCancel?: () => void
}) {
  const initial = useMemo(() => (item ? editableBody(collection, item) : emptyBodies[collection]()), [collection, item])
  const [body, setBody] = useState<Record<string, unknown>>(initial)
  const [key, setKey] = useState(isNew ? '' : (item?.key ?? ''))
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [json, setJson] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = useSaveCatalogEntry(collection)
  const remove = useDeleteCatalogEntry(collection)
  const info = collectionInfo[collection]
  const Form = forms[collection]

  const dirty = JSON.stringify(body) !== JSON.stringify(initial) || (isNew && key !== '')
  const existingKeys = catalog[catalogKeys[collection]].map((i) => i.key)
  const keyError = !isNew
    ? undefined
    : key && !KEY_PATTERN.test(key)
      ? 'Use só minúsculas, números e "-" (sem espaço nem acento).'
      : existingKeys.includes(key)
        ? 'Já existe um item com essa key.'
        : undefined

  /** O corpo atual: do formulário, ou do JSON no modo avançado. */
  const currentBody = (): Record<string, unknown> | null => {
    if (mode === 'form') return body
    try {
      const parsed = JSON.parse(json)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      setLocalError('O JSON precisa ser um objeto { ... }.')
    } catch (e) {
      setLocalError(`JSON inválido: ${(e as Error).message}`)
    }
    return null
  }

  const switchMode = (next: 'form' | 'json') => {
    if (next === mode) return
    if (next === 'json') {
      setJson(JSON.stringify(body, null, 2))
      setMode('json')
      setLocalError(null)
      return
    }
    const parsed = currentBody()
    if (parsed) {
      setBody(parsed)
      setMode('form')
      setLocalError(null)
    }
  }

  const submit = () => {
    const payload = currentBody()
    if (!payload) return
    if (!String(payload.name ?? '').trim()) return setLocalError('Dê um nome.')
    if (isNew && (!key || keyError)) return setLocalError(keyError ?? 'Preencha a key.')
    setLocalError(null)
    save.mutate({ key, body: payload, isNew }, { onSuccess: () => onSaved(key) })
  }

  const serverError = save.isError
    ? withKitHelp(adminErrorMessage(save.error), key)
    : remove.isError
      ? adminErrorMessage(remove.error)
      : null

  const changeBody = (next: Record<string, unknown>) => {
    // num item novo, a key acompanha o nome até ser mexida à mão
    if (isNew && collection !== 'skills' && key === slugify(String(body.name ?? ''))) setKey(slugify(String(next.name ?? '')))
    setBody(next)
  }

  return (
    <section className="hud-corners flex min-w-0 flex-col border border-line bg-surface [--hud-color:var(--color-primary)]">
      {/* cabeçalho fixo com as ações */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary-soft">
            {isNew ? (item ? `Nova ${info.singular} · cópia de ${item.name}` : `Nova ${info.singular}`) : info.singular}
          </p>
          <h2 className="truncate font-display text-3xl font-bold uppercase italic text-silver-bright">
            {String(body.name ?? '') || <span className="text-fg-subtle">Sem nome</span>}
          </h2>
          {!isNew && <p className="font-mono text-xs text-fg-subtle">{item?.key}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-control border border-line p-0.5">
            {(['form', 'json'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                title={m === 'json' ? 'Avançado: editar o corpo em JSON' : 'Formulário'}
                className={cn(
                  'focus-ring flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-xs transition-colors',
                  mode === m ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg',
                )}
              >
                {m === 'form' ? <FileText className="size-3.5" /> : <Braces className="size-3.5" />}
                {m === 'form' ? 'Formulário' : 'JSON'}
              </button>
            ))}
          </div>
          {onDuplicate && (
            <Button size="sm" variant="ghost" onClick={onDuplicate} title="Criar um item novo a partir deste">
              <Copy className="size-3.5" /> Duplicar
            </Button>
          )}
          {isNew ? (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="size-3.5" /> Cancelar
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setBody(initial)} disabled={!dirty}>
              <Undo2 className="size-3.5" /> Descartar
            </Button>
          )}
          <Button size="sm" onClick={submit} disabled={save.isPending || (!dirty && mode === 'form')}>
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {isNew ? 'Criar' : 'Salvar'}
          </Button>
        </div>
      </header>

      <div className="space-y-6 p-5">
        {(localError || serverError) && (
          <div role="alert" className="space-y-1 rounded-control border border-danger/30 bg-danger-dim px-3 py-2.5">
            <p className="font-display text-sm font-semibold uppercase tracking-wide text-danger-hover">Não foi possível salvar</p>
            <pre className="whitespace-pre-wrap font-sans text-xs text-fg">{localError ?? serverError}</pre>
          </div>
        )}

        {isNew && (
          <KeyField collection={collection} value={key} onChange={setKey} error={keyError} catalog={catalog} name={String(body.name ?? '')} />
        )}

        {mode === 'form' ? (
          <Form value={body} onChange={changeBody} catalog={catalog} rules={rules} itemKey={key} />
        ) : (
          <Field label="Corpo (JSON)" hint="Modo avançado: o mesmo corpo do formulário. Volte ao formulário para conferir.">
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
              rows={26}
              className="focus-ring min-h-96 w-full resize-y rounded-control border border-line bg-bg p-3 font-mono text-[12px] leading-relaxed text-fg outline-none focus:border-primary"
            />
          </Field>
        )}

        <p className="border-t border-line pt-4 text-xs text-fg-subtle">
          Ao salvar, o servidor confere o catálogo inteiro: se a mudança quebrar outro item, nada muda e o motivo aparece no
          topo. Vale na hora para as batalhas novas; as em andamento seguem como começaram.
        </p>

        {!isNew && item && (
          <div className="flex items-center justify-end gap-2">
            {confirmDelete ? (
              <>
                <span className="text-sm text-fg-muted">Apagar “{item.name}” de vez?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(item.key, { onSuccess: onDeleted, onSettled: () => setConfirmDelete(false) })}
                >
                  {remove.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  Apagar
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="text-danger hover:text-danger-hover" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-3.5" /> Apagar {info.singular}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** A `key` (identificador fixo) de um item novo. Nas skills: o modelo dono + um nome curto. */
function KeyField({ collection, value, onChange, error, catalog, name }: {
  collection: CatalogCollection
  value: string
  onChange: (key: string) => void
  error?: string
  catalog: AdminCatalog
  name: string
}) {
  const [owner, slug] = value.includes(':') ? value.split(':', 2) : ['', value]
  const hint = (
    <>
      Identificador fixo, não muda depois. Só minúsculas, números e “-”.{' '}
      {name && !value && (
        <button type="button" className="text-primary-soft underline-offset-2 hover:underline" onClick={() => onChange(collection === 'skills' && owner ? `${owner}:${slugify(name)}` : slugify(name))}>
          Usar “{slugify(name)}”
        </button>
      )}
    </>
  )

  if (collection === 'skills') {
    return (
      <div className="grid gap-4 rounded-card border border-line bg-raised/40 p-4 sm:grid-cols-2">
        <Field
          label="Modelo dono"
          hint={
            owner && !catalog.templates.some((t) => t.key === owner)
              ? `“${owner}” ainda não existe: crie as 4 skills do kit e depois o modelo com essa key.`
              : 'O personagem que usa a skill. Escolha um ou digite a key de um modelo novo.'
          }
        >
          <input
            list="admin-template-keys"
            value={owner}
            onChange={(e) => {
              const next = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
              onChange(next ? `${next}:${slug || slugify(name)}` : slug)
            }}
            placeholder="ex.: draxler"
            className="h-10 w-full rounded-control border border-line bg-bg px-3 font-mono text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-primary"
          />
          <datalist id="admin-template-keys">
            {catalog.templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Nome curto" hint={hint} error={error}>
          <div className="flex h-10 items-center rounded-control border border-line bg-bg focus-within:border-primary">
            {owner && <span className="pl-3 font-mono text-sm text-fg-subtle">{owner}:</span>}
            <input
              value={slug}
              onChange={(e) => onChange(owner ? `${owner}:${e.target.value}` : e.target.value)}
              placeholder="ex.: detonacao"
              className="h-full w-full min-w-0 bg-transparent px-1.5 font-mono text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
        </Field>
        <p className="font-mono text-xs text-fg-subtle sm:col-span-2">
          key final: <span className="text-fg">{value || '—'}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-raised/40 p-4">
      <Field label="Key" hint={<>Preenchida a partir do nome. {hint}</>} error={error}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`ex.: ${slugify(collectionInfo[collection].example.replace(/^Ex\.: /, '').split(',')[0])}`}
          className="h-10 w-full rounded-control border border-line bg-bg px-3 font-mono text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-primary"
        />
      </Field>
    </div>
  )
}

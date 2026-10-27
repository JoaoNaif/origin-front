import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { newEffect, type Effect, type EffectField, type EffectSpec } from '@/features/admin/admin-schema'
import { FormGrid, NumberField, SelectField, Toggle } from '@/features/admin/form-fields'

/** Campos de um efeito (ou do gatilho da passiva) conforme o tipo. */
export function EffectFields({ effect, spec, onChange }: { effect: Effect; spec: EffectSpec; onChange: (effect: Effect) => void }) {
  const set = (name: string, value: unknown) => {
    const next = { ...effect }
    // appliesTo padrão (nos alvos) e número opcional vazio: sai do corpo
    if (value === null || (name === 'appliesTo' && value === 'TARGET')) delete next[name]
    else next[name] = value
    onChange(next)
  }

  if (spec.fields.length === 0) return null

  return (
    <FormGrid cols={spec.fields.length > 2 ? 3 : 2}>
      {spec.fields.map((field) => (
        <EffectInput key={field.name} field={field} value={effect[field.name]} onChange={(v) => set(field.name, v)} />
      ))}
    </FormGrid>
  )
}

function EffectInput({ field, value, onChange }: { field: EffectField; value: unknown; onChange: (value: unknown) => void }) {
  switch (field.kind) {
    case 'number':
      return (
        <NumberField
          label={field.label}
          value={value as number | undefined}
          onChange={(n) => onChange(n === null ? null : field.integer ? Math.round(n) : n)}
          step={field.step ?? 1}
          unit={field.unit}
          hint={field.hint}
          allowEmpty={field.optional}
          placeholder={field.optional ? String(field.default) : undefined}
        />
      )
    case 'choice':
      return (
        <SelectField
          label={field.label}
          value={(value as string | undefined) ?? field.default}
          onChange={(v) => onChange(v ?? field.default)}
          options={field.choices}
          hint={field.hint}
        />
      )
    case 'boolean':
      return (
        <div className="flex items-end pb-1.5">
          <Toggle label={field.label} checked={Boolean(value)} onChange={onChange} hint={field.hint} />
        </div>
      )
  }
}

/** Lista de efeitos: cada um num cartão, com o tipo escolhido numa lista com explicação. */
export function EffectsEditor({ effects, onChange, specs, addLabel = 'Adicionar efeito', emptyText }: {
  effects: Effect[]
  onChange: (effects: Effect[]) => void
  specs: Record<string, EffectSpec>
  addLabel?: string
  emptyText?: string
}) {
  const types = Object.keys(specs)
  const [adding, setAdding] = useState(types[0])

  const replace = (index: number, effect: Effect) => onChange(effects.map((e, i) => (i === index ? effect : e)))

  return (
    <div className="space-y-3">
      {effects.length === 0 && (
        <p className="rounded-control border border-dashed border-line-strong px-3 py-4 text-center text-xs text-fg-subtle">
          {emptyText ?? 'Nenhum efeito.'}
        </p>
      )}

      {effects.map((effect, index) => {
        const spec = specs[effect.type]
        return (
          <div key={index} className="space-y-3 rounded-card border border-line bg-raised/60 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-2.5 font-mono text-[11px] text-primary-soft">{String(index + 1).padStart(2, '0')}</span>
              <div className="flex-1">
                <SelectField
                  label="Tipo"
                  value={effect.type}
                  onChange={(type) => type && replace(index, newEffect(type, specs[type]))}
                  options={types.map((t) => ({ value: t, label: specs[t].label, hint: specs[t].description }))}
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-6 text-fg-subtle hover:text-danger-hover"
                aria-label="Tirar efeito"
                onClick={() => onChange(effects.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {spec ? (
              <EffectFields effect={effect} spec={spec} onChange={(e) => replace(index, e)} />
            ) : (
              <p className="text-xs text-warning">Tipo desconhecido: {effect.type}</p>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          aria-label="Tipo do novo efeito"
          className="h-8 rounded-control border border-line bg-bg px-2 text-sm text-fg"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {specs[t].label}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={() => onChange([...effects, newEffect(adding, specs[adding])])}>
          <Plus className="size-3.5" /> {addLabel}
        </Button>
      </div>
    </div>
  )
}

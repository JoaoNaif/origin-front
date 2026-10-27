import { Plus, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  exclusivityLabels,
  passiveEffectSpecs,
  passiveTriggerSpecs,
  rarityLabels,
  type TemplateBody,
} from '@/features/admin/admin-schema'
import { EffectFields, EffectsEditor } from '@/features/admin/effects-editor'
import { keyOptions, toOptions, type FormProps } from '@/features/admin/admin-schema'
import {
  FormGrid,
  FormSection,
  Note,
  NumberField,
  Segmented,
  SelectField,
  TextAreaField,
  TextField,
} from '@/features/admin/form-fields'
import { classLabels, type StatBlock } from '@/features/game/game-api'
import { dangerLabels, statLabels, statOrder } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'

/** Mesmo cálculo do servidor (`statBudget`): o HP conta 1/5. */
const statBudget = (s: StatBlock) => s.HP / 5 + s.ATTACK + s.DEFENSE + s.SPEED + s.PRECISION + s.EVASION + s.WILL

export function TemplateForm({ value, onChange, catalog, rules, itemKey }: FormProps<TemplateBody>) {
  const set = <K extends keyof TemplateBody>(field: K, v: TemplateBody[K]) => onChange({ ...value, [field]: v })
  const setPassive = (passive: Partial<TemplateBody['passive']>) => set('passive', { ...value.passive, ...passive })

  const maxVariants = rules?.maxTemplateVariants ?? 3
  const primaries = value.variants.filter((v) => v.isPrimary).length
  const budget = statBudget(value.stats)
  const target = rules?.classBudget[value.characterClass]
  const tolerance = target && rules ? Math.round(target * rules.classBudgetTolerance) : 0
  const budgetOk = target === undefined || Math.abs(budget - target) <= tolerance
  const sameClass = catalog.templates.filter((t) => t.characterClass === value.characterClass && t.key !== itemKey)
  const current = catalog.templates.find((t) => t.key === itemKey)
  const skillKeys = (current?.skillKeys as string[] | undefined) ?? []

  return (
    <>
      <FormSection index="01" title="Identidade" description="Quem é o personagem.">
        <FormGrid>
          <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Kael Vaz" />
          <SelectField
            label="Classe"
            value={value.characterClass}
            onChange={(v) => v && set('characterClass', v as TemplateBody['characterClass'])}
            options={toOptions(classLabels)}
            hint="Define o orçamento de atributos e a aura de formação."
          />
          <Segmented
            label="Raridade"
            value={value.rarity}
            onChange={(v) => set('rarity', v as TemplateBody['rarity'])}
            options={toOptions(rarityLabels)}
            hint="Mede só a dificuldade de conseguir, não a força."
          />
          <SelectField
            label="Periculosidade inicial"
            value={value.initialDanger}
            onChange={(v) => v && set('initialDanger', v as TemplateBody['initialDanger'])}
            options={toOptions(dangerLabels)}
            hint="Começa aqui e sobe com o personagem."
          />
          <SelectField
            label="Exclusividade"
            value={value.exclusivity}
            onChange={(v) => v && set('exclusivity', v as TemplateBody['exclusivity'])}
            options={toOptions(exclusivityLabels)}
            hint="Exclusivo não vem de baú nem pode ser vendido."
            wide
          />
          <TextAreaField
            label="Descrição"
            value={value.description}
            onChange={(v) => set('description', v)}
            placeholder="Ex.: Ex-soldado que transforma a raiva em explosões controladas."
          />
        </FormGrid>
      </FormSection>

      <FormSection
        index="02"
        title="Variantes e família"
        description={`Os poderes do personagem (até ${maxVariants}). Marque uma como principal.`}
        actions={
          value.variants.length < maxVariants && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                set('variants', [...value.variants, { variantKey: '', isPrimary: value.variants.length === 0 }])
              }
            >
              <Plus className="size-3.5" /> Variante
            </Button>
          )
        }
      >
        <div className="space-y-2">
          {value.variants.length === 0 && <Note tone="warning">Adicione ao menos uma variante.</Note>}
          {value.variants.map((variant, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <SelectField
                  label={`Variante ${index + 1}`}
                  value={variant.variantKey || null}
                  onChange={(v) =>
                    set('variants', value.variants.map((x, i) => (i === index ? { ...x, variantKey: v ?? '' } : x)))
                  }
                  options={keyOptions(catalog.variants)}
                />
              </div>
              <Button
                size="sm"
                variant={variant.isPrimary ? 'secondary' : 'ghost'}
                className="mb-1"
                title="Variante principal"
                onClick={() => set('variants', value.variants.map((x, i) => ({ ...x, isPrimary: i === index })))}
              >
                <Star className={cn('size-3.5', variant.isPrimary && 'fill-primary-soft text-primary-soft')} />
                Principal
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="mb-1 text-fg-subtle hover:text-danger-hover"
                aria-label="Tirar variante"
                onClick={() => set('variants', value.variants.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {value.variants.length > 0 && primaries !== 1 && <Note tone="warning">Marque exatamente uma variante como principal.</Note>}
        </div>
        <FormGrid>
          <SelectField
            label="Traço de família"
            value={value.familyTraitKey}
            onChange={(v) => set('familyTraitKey', v)}
            options={keyOptions(catalog.traits.filter((t) => t.source === 'TEMPLATE'))}
            emptyLabel="Nenhum"
            hint="Traço que já vem com o personagem (origem: família)."
            wide
          />
        </FormGrid>
      </FormSection>

      <FormSection
        index="03"
        title="Atributos"
        description="Valores no nível 100 (o jogo calcula os outros níveis). Cada classe tem um orçamento: o HP conta 1/5."
        actions={
          sameClass.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const source = sameClass.find((t) => t.key === e.target.value)
                if (source) set('stats', { ...(source.stats as StatBlock) })
              }}
              aria-label="Copiar atributos de outro modelo"
              className="h-8 rounded-control border border-line bg-bg px-2 text-sm text-fg-muted"
            >
              <option value="">Copiar atributos de...</option>
              {sameClass.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          )
        }
      >
        <FormGrid cols={4}>
          {statOrder.map((stat) => (
            <NumberField
              key={stat}
              label={statLabels[stat]}
              value={value.stats[stat]}
              onChange={(v) => set('stats', { ...value.stats, [stat]: v ?? 0 })}
              min={0}
            />
          ))}
          <div
            className={cn(
              'flex flex-col justify-center rounded-control border px-3 py-2',
              budgetOk ? 'border-success/30 bg-success/5' : 'border-danger/40 bg-danger-dim',
            )}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Orçamento</span>
            <span className={cn('font-mono text-lg font-bold', budgetOk ? 'text-success' : 'text-danger-hover')}>
              {Math.round(budget)}
              {target !== undefined && <span className="text-xs font-normal text-fg-muted"> / {target} ±{tolerance}</span>}
            </span>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection index="04" title="Passiva" description="Uma habilidade sempre ativa: quando dispara (gatilho) e o que faz (efeitos).">
        <FormGrid>
          <TextField label="Nome da passiva" value={value.passive.name} onChange={(v) => setPassive({ name: v })} placeholder="Ex.: Couraça" />
          <SelectField
            label="Gatilho"
            value={value.passive.trigger.type}
            onChange={(type) => {
              if (!type) return
              const spec = passiveTriggerSpecs[type]
              setPassive({ trigger: Object.fromEntries([['type', type], ...spec.fields.map((f) => [f.name, f.default])]) as TemplateBody['passive']['trigger'] })
            }}
            options={Object.entries(passiveTriggerSpecs).map(([v, s]) => ({ value: v, label: s.label, hint: s.description }))}
          />
          <TextAreaField
            label="Descrição da passiva"
            value={value.passive.description}
            onChange={(v) => setPassive({ description: v ?? '' })}
            placeholder="Ex.: Ao ser atingido, reduz em 15% o dano recebido."
            hint="Aparece para o jogador. Obrigatória."
            required
          />
        </FormGrid>
        {passiveTriggerSpecs[value.passive.trigger.type] && (
          <EffectFields
            effect={value.passive.trigger}
            spec={passiveTriggerSpecs[value.passive.trigger.type]}
            onChange={(trigger) => setPassive({ trigger })}
          />
        )}
        <EffectsEditor
          effects={value.passive.effects}
          onChange={(effects) => setPassive({ effects })}
          specs={passiveEffectSpecs}
          emptyText="A passiva ainda não faz nada."
        />
      </FormSection>

      <FormSection index="05" title="Skills" description="Calculado pelo servidor: as skills com a key começando por esta (kit primeiro).">
        {itemKey && skillKeys.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {skillKeys.map((k) => (
              <Badge key={k}>{k}</Badge>
            ))}
          </div>
        ) : (
          <Note tone="warning">
            Um modelo precisa das 4 skills do kit (Básica, Padrão, Função e Assinatura) <b>antes</b> de ser criado. Crie-as
            em Skills com a key começando por <code className="font-mono">{itemKey || 'key-do-modelo'}:</code>.
          </Note>
        )}
      </FormSection>
    </>
  )
}

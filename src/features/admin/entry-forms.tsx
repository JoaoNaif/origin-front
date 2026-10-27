import {
  traitCategoryLabels,
  traitEffectSpecs,
  traitSourceLabels,
  keyOptions,
  toOptions,
  type FormProps,
  type FieldBody,
  type TraitBody,
  type VariantBody,
} from '@/features/admin/admin-schema'
import { EffectsEditor } from '@/features/admin/effects-editor'
import {
  FormGrid,
  FormSection,
  MultiPick,
  Note,
  NumberField,
  Segmented,
  SelectField,
  TextAreaField,
  TextField,
} from '@/features/admin/form-fields'
import { lineageLabels, statLabels } from '@/features/game/game-labels'

export function VariantForm({ value, onChange, catalog, itemKey }: FormProps<VariantBody>) {
  const set = <K extends keyof VariantBody>(field: K, v: VariantBody[K]) => onChange({ ...value, [field]: v })

  return (
    <FormSection index="01" title="Variante" description="O poder do personagem. Os modelos escolhem até 3 variantes.">
      <FormGrid>
        <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Relâmpago" />
        <SelectField
          label="Linhagem"
          value={value.lineage}
          onChange={(v) => v && set('lineage', v as VariantBody['lineage'])}
          options={toOptions(lineageLabels)}
          hint="A família do poder. Define o atributo que o Desgaste consome."
        />
        <SelectField
          label="Desperta de"
          value={value.awakensFromKey}
          onChange={(v) => set('awakensFromKey', v)}
          options={keyOptions(catalog.variants.filter((v) => v.key !== itemKey))}
          emptyLabel="Não é despertada (variante comum)"
          hint="Só para variante despertada: a variante comum de onde ela nasce."
          wide
        />
        <TextAreaField
          label="Descrição"
          value={value.description}
          onChange={(v) => set('description', v)}
          placeholder="Ex.: Descargas elétricas rápidas que atravessam a linha inimiga."
        />
      </FormGrid>
    </FormSection>
  )
}

export function TraitForm({ value, onChange, catalog }: FormProps<TraitBody>) {
  const set = <K extends keyof TraitBody>(field: K, v: TraitBody[K]) => onChange({ ...value, [field]: v })

  return (
    <>
      <FormSection index="01" title="Traço" description="Um bônus fixo do personagem. Os campos de batalha pedem traços para dar bônus.">
        <FormGrid>
          <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Veterano" />
          <Segmented
            label="Categoria"
            value={value.category}
            onChange={(v) => set('category', v as TraitBody['category'])}
            options={toOptions(traitCategoryLabels)}
          />
          <Segmented
            label="Origem"
            value={value.source}
            onChange={(v) => set('source', v as TraitBody['source'])}
            options={toOptions(traitSourceLabels)}
            hint="Família: vem no modelo e fica na venda. Conquistado: se perde na venda."
            wide
          />
          <SelectField
            label="Variante"
            value={value.variantKey}
            onChange={(v) => set('variantKey', v)}
            options={keyOptions(catalog.variants)}
            emptyLabel="Nenhuma"
            hint="Para traço de família ligado a uma variante. Deixe em branco nos outros."
            wide
          />
          <TextAreaField
            label="Descrição"
            value={value.description}
            onChange={(v) => set('description', v)}
            placeholder="Ex.: Anos de campo deixam a mente firme: +3% de Vontade."
          />
        </FormGrid>
      </FormSection>
      <FormSection index="02" title="Efeitos" description="O que o traço faz. Ex.: Bônus de atributo, Vontade, 3 (= +3%).">
        <EffectsEditor effects={value.effects} onChange={(effects) => set('effects', effects)} specs={traitEffectSpecs} />
      </FormSection>
    </>
  )
}

export function FieldForm({ value, onChange, catalog, rules }: FormProps<FieldBody>) {
  const set = <K extends keyof FieldBody>(field: K, v: FieldBody[K]) => onChange({ ...value, [field]: v })
  const setPercent = (field: 'primaryPercent' | 'secondaryPercent', v: number | null) => {
    const next = { ...value }
    if (v === null) delete next[field]
    else next[field] = v
    onChange(next)
  }
  const traits = rules?.fieldTraits

  return (
    <>
      <FormSection index="01" title="Campo de batalha" description="Sorteado antes da escolha do squad. Quem tem um dos traços pedidos ganha os dois bônus.">
        <FormGrid>
          <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Arena" />
          <div />
          <TextAreaField
            label="Descrição"
            value={value.description}
            onChange={(v) => set('description', v)}
            placeholder="Ex.: Areia batida e público gritando: favorece quem parte para cima."
          />
        </FormGrid>
      </FormSection>
      <FormSection index="02" title="Quem ganha o bônus">
        <MultiPick
          label="Traços pedidos"
          values={value.requiredTraitKeys}
          onChange={(v) => set('requiredTraitKeys', v)}
          options={catalog.traits.map((t) => ({ value: t.key, label: t.name, hint: t.key }))}
          max={traits?.max}
          hint={traits && `Escolha de ${traits.min} a ${traits.max}. Basta ter um deles.`}
        />
      </FormSection>
      <FormSection index="03" title="Bônus">
        <FormGrid cols={4}>
          <SelectField label="Atributo principal" value={value.primaryStat} onChange={(v) => v && set('primaryStat', v as FieldBody['primaryStat'])} options={toOptions(statLabels)} />
          <NumberField
            label="Bônus principal"
            value={value.primaryPercent}
            onChange={(v) => setPercent('primaryPercent', v)}
            unit="%"
            allowEmpty
            placeholder={rules ? String(rules.fieldPercent.primary) : undefined}
            hint={rules && `Vazio = padrão (${rules.fieldPercent.primary}%)`}
          />
          <SelectField label="Atributo secundário" value={value.secondaryStat} onChange={(v) => v && set('secondaryStat', v as FieldBody['secondaryStat'])} options={toOptions(statLabels)} />
          <NumberField
            label="Bônus secundário"
            value={value.secondaryPercent}
            onChange={(v) => setPercent('secondaryPercent', v)}
            unit="%"
            allowEmpty
            placeholder={rules ? String(rules.fieldPercent.secondary) : undefined}
            hint={rules && `Vazio = padrão (${rules.fieldPercent.secondary}%)`}
          />
        </FormGrid>
        {value.primaryStat === value.secondaryStat && <Note tone="warning">Os dois bônus estão no mesmo atributo.</Note>}
      </FormSection>
    </>
  )
}

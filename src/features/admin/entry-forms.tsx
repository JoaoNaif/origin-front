import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  keyOptions,
  traitCategoryLabels,
  traitEffectSpecs,
  type FieldBody,
  type FormProps,
  type TraitBody,
  type VariantBody,
} from '@/features/admin/admin-schema'
import { EffectsEditor } from '@/features/admin/effects-editor'
import { ChoiceCards, FormGrid, FormSection, MultiPick, Note, NumberField, SelectField, TextAreaField, TextField } from '@/features/admin/form-fields'
import { ReviewList, ReviewStatus, StepIntro, Wizard } from '@/features/admin/wizard'
import { firstStep, type WizardStep } from '@/features/admin/wizard-steps'
import type { Lineage } from '@/features/game/game-api'
import { lineageLabels, statLabels, statOrder } from '@/features/game/game-labels'

// Assistentes da variante, do traço e do campo, no mesmo formato do modelo e da skill (wizard.tsx). As checagens
// espelham o domínio do ../origin-game (trait.ts, battle-field.ts) só para orientar; quem decide é o servidor.

const submitLabel = (isNew: boolean | undefined, noun: string) => `${isNew ? 'Criar' : 'Salvar'} ${noun}`

// ---------------------------------------------------------------------------
// Variante
// ---------------------------------------------------------------------------

/** O que cada linhagem é e o que o Desgaste dela consome (D59, `LINEAGE_COST_TARGET`). */
const lineageText: Record<Lineage, { what: string; cost: string }> = {
  FUNDAMENTAL: { what: 'As forças básicas do mundo: tempo, espaço, energia pura.', cost: 'gasta HP máximo' },
  ELEMENTAL: { what: 'Fogo, gelo, raio, água: os elementos da natureza.', cost: 'gasta HP atual' },
  MATERIAL: { what: 'Metal, pedra, matéria: moldar e endurecer coisas.', cost: 'gasta Defesa' },
  VECTORIAL: { what: 'Movimento, força, gravidade: mudar direção e velocidade.', cost: 'gasta Precisão' },
  PSYCHIC: { what: 'Mente: ilusão, controle, leitura.', cost: 'gasta Vontade' },
  BIOLOGICAL: { what: 'O corpo: regenerar, mutar, envenenar.', cost: 'gasta Esquiva' },
  NONE: { what: 'Sem poder: quem luta só com técnica.', cost: 'gasta Defesa' },
}

type VariantStepId = 'identity' | 'lineage' | 'awakening' | 'review'

const variantSteps: WizardStep<VariantStepId>[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'lineage', title: 'Linhagem' },
  { id: 'awakening', title: 'Comum ou despertada' },
  { id: 'review', title: 'Revisão' },
]

/** `baseOnly`: dentro do modelo, que só aceita variante comum (o despertar é do personagem). */
export function VariantForm({ value, onChange, catalog, itemKey, isNew, onSubmit, saving, baseOnly }: FormProps<VariantBody> & { baseOnly?: boolean }) {
  const [step, setStep] = useState(firstStep(variantSteps, isNew))
  const set = <K extends keyof VariantBody>(field: K, v: VariantBody[K]) => onChange({ ...value, [field]: v })
  const base = catalog.variants.filter((v) => v.key !== itemKey && !v.awakensFromKey)
  const from = catalog.variants.find((v) => v.key === value.awakensFromKey)
  const awakened = value.awakensFromKey !== null

  const problems: Record<VariantStepId, string[]> = { identity: [], lineage: [], awakening: [], review: [] }
  if (!value.name.trim()) problems.identity.push('Dê um nome à variante.')
  if (awakened && !value.awakensFromKey) problems.awakening.push('Escolha de qual variante ela desperta.')

  return (
    <Wizard steps={variantSteps} current={step} onStep={setStep} problems={problems} submitLabel={submitLabel(isNew, 'variante')} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="Qual é o poder">
            A <b className="text-fg">variante</b> é o poder de um personagem: Explosão, Gelo, Tempo, Relâmpago... Os
            personagens têm de 0 a 3 variantes, e cada skill é de uma delas. Aqui vão só o nome e a ideia do poder; a força
            fica nas skills.
          </StepIntro>
          <FormGrid>
            <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Relâmpago" hint="O nome que o jogador vê na ficha do personagem." required />
            <div />
            <TextAreaField
              label="Descrição"
              value={value.description}
              onChange={(v) => set('description', v)}
              placeholder="Ex.: Descargas elétricas rápidas que atravessam a linha inimiga."
              hint="Opcional. Como o poder funciona na história."
            />
          </FormGrid>
        </>
      )}

      {step === 'lineage' && (
        <>
          <StepIntro title="De que família é o poder">
            Toda variante é de uma <b className="text-fg">linhagem</b>, a família do poder. Ela decide o que o{' '}
            <b className="text-fg">Desgaste</b> consome: cada skill usada cansa o personagem e tira um pouco de um atributo
            dele (o da linhagem). Escolha pela ideia do poder; o custo vem junto.
          </StepIntro>
          <ChoiceCards
            label="Linhagem"
            value={value.lineage}
            onChange={(v) => set('lineage', v as VariantBody['lineage'])}
            required
            options={(Object.keys(lineageLabels) as Lineage[]).map((l) => ({
              value: l,
              label: lineageLabels[l],
              description: lineageText[l].what,
              extra: <span className="mt-1 font-mono text-[10px] text-primary-soft">Desgaste: {lineageText[l].cost}</span>,
            }))}
          />
        </>
      )}

      {step === 'awakening' && (
        <>
          <StepIntro title="Comum ou despertada">
            A maioria das variantes é <b className="text-fg">comum</b>: o personagem tem desde o começo. Uma{' '}
            <b className="text-fg">despertada</b> é a forma evoluída de uma comum, que o personagem destrava em nível alto
            (só quem tem uma única variante). Ela traz skills próprias, mais fortes e mais caras.
          </StepIntro>
          {baseOnly ? (
            <Note>Dentro do personagem só entra variante comum: o despertar acontece depois, com o personagem em nível alto.</Note>
          ) : (
            <div className="space-y-5">
              <ChoiceCards
                label="Tipo"
                value={awakened ? 'AWAKENED' : 'BASE'}
                onChange={(v) => set('awakensFromKey', v === 'AWAKENED' ? (value.awakensFromKey ?? base[0]?.key ?? '') : null)}
                cols={2}
                required
                options={[
                  { value: 'BASE', label: 'Comum', description: 'Vem com o personagem. É o caso da maioria.' },
                  { value: 'AWAKENED', label: 'Despertada', description: 'Evolução de uma variante comum, destravada em nível alto.' },
                ]}
              />
              {awakened && (
                <FormGrid>
                  <SelectField
                    label="Desperta de"
                    value={value.awakensFromKey || null}
                    onChange={(v) => set('awakensFromKey', v ?? '')}
                    options={keyOptions(base)}
                    hint="A variante comum que evolui para esta."
                    required
                    wide
                  />
                </FormGrid>
              )}
              {from && from.lineage !== value.lineage && (
                <Note tone="warning">
                  {from.name} é {lineageLabels[from.lineage as Lineage]} e esta é {lineageLabels[value.lineage]}. Normalmente a despertada é da mesma linhagem.
                </Note>
              )}
            </div>
          )}
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Variante', value: value.name || '—' },
              { id: 'lineage', label: 'Linhagem', value: `${lineageLabels[value.lineage]} · Desgaste ${lineageText[value.lineage].cost}` },
              { id: 'awakening', label: 'Tipo', value: awakened ? `Despertada de ${from?.name ?? '—'}` : 'Comum' },
            ]}
          />
          <ReviewStatus steps={variantSteps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

// ---------------------------------------------------------------------------
// Traço
// ---------------------------------------------------------------------------

const categoryText: Record<TraitBody['category'], string> = {
  COMBAT: 'Do jeito de lutar: técnica, arma, estilo.',
  POSTURE: 'Do jeito de agir: frieza, coragem, paciência.',
  ORIGIN: 'De onde veio: família, povo, lugar. Todo traço de família é desta.',
}

type TraitStepId = 'identity' | 'source' | 'effects' | 'review'

const traitSteps: WizardStep<TraitStepId>[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'source', title: 'Origem' },
  { id: 'effects', title: 'Efeitos' },
  { id: 'review', title: 'Revisão' },
]

/** `family`: traço de família de um modelo (origem fixa; a variante, se tiver, é uma das do modelo). */
export function TraitForm({ value, onChange, catalog, rules, isNew, onSubmit, saving, family }: FormProps<TraitBody> & { family?: { variantKeys: string[] } }) {
  const [step, setStep] = useState(firstStep(traitSteps, isNew))
  const set = <K extends keyof TraitBody>(field: K, v: TraitBody[K]) => onChange({ ...value, [field]: v })
  const variants = family ? catalog.variants.filter((v) => family.variantKeys.includes(v.key)) : catalog.variants
  const isFamily = value.source === 'TEMPLATE'
  const variant = catalog.variants.find((v) => v.key === value.variantKey)

  const problems: Record<TraitStepId, string[]> = { identity: [], source: [], effects: [], review: [] }
  if (!value.name.trim()) problems.identity.push('Dê um nome ao traço.')
  if (isFamily && value.category !== 'ORIGIN') problems.identity.push('Traço de família é sempre da categoria Origem.')
  if (value.variantKey && !isFamily) problems.source.push('Traço ligado a uma variante é sempre de família.')
  if (value.effects.length === 0) problems.effects.push('O traço precisa de ao menos um efeito.')

  // família força a categoria Origem; conquistado não tem variante
  const changeSource = (source: TraitBody['source']) =>
    onChange({ ...value, source, category: source === 'TEMPLATE' ? 'ORIGIN' : value.category, variantKey: source === 'TEMPLATE' ? value.variantKey : null })

  return (
    <Wizard steps={traitSteps} current={step} onStep={setStep} problems={problems} submitLabel={submitLabel(isNew, 'traço')} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="Qual é o traço">
            Um <b className="text-fg">traço</b> é uma característica fixa do personagem com um bônus pequeno (ex.:
            Veterano, +3% de Vontade). Além do bônus, os <b className="text-fg">campos de batalha</b> dão vantagem a quem
            tem certos traços. A categoria organiza a lista, e cada campo pede traços de categorias diferentes.
          </StepIntro>
          <div className="space-y-5">
            <FormGrid>
              <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Veterano" hint="O nome que o jogador vê na ficha." required />
            </FormGrid>
            <ChoiceCards
              label="Categoria"
              value={value.category}
              onChange={(v) => set('category', v as TraitBody['category'])}
              required
              hint={isFamily ? 'Traço de família é sempre Origem.' : undefined}
              options={(Object.keys(traitCategoryLabels) as TraitBody['category'][]).map((c) => ({
                value: c,
                label: traitCategoryLabels[c],
                description: categoryText[c],
                disabled: isFamily && c !== 'ORIGIN',
              }))}
            />
            <FormGrid>
              <TextAreaField
                label="Descrição"
                value={value.description}
                onChange={(v) => set('description', v)}
                placeholder="Ex.: Anos de campo deixam a mente firme: +3% de Vontade."
                hint="Opcional. O jogador lê na ficha; vale citar o bônus."
              />
            </FormGrid>
          </div>
        </>
      )}

      {step === 'source' && (
        <>
          <StepIntro title="Como o personagem ganha">
            <b className="text-fg">Família</b>: já vem com o personagem (é escolhido no modelo) e fica com ele mesmo se for
            vendido. <b className="text-fg">Conquistado</b>: ganho jogando, em metas e eventos, e se perde se o personagem
            for vendido. Um traço de família pode ser ligado a uma <b className="text-fg">variante</b> (ex.: “Sangue de
            Fogo” para quem tem Chamas); aí só personagens com essa variante podem tê-lo.
          </StepIntro>
          {family ? (
            <Note>Este traço é de família: ele já entra no personagem que você está montando.</Note>
          ) : (
            <ChoiceCards
              label="Origem"
              value={value.source}
              onChange={(v) => changeSource(v as TraitBody['source'])}
              cols={2}
              required
              options={[
                { value: 'TEMPLATE', label: 'Família', description: 'Vem no personagem e fica na venda. Categoria sempre Origem.' },
                { value: 'CONQUERED', label: 'Conquistado', description: 'Ganho em metas e eventos. Se perde na venda.' },
              ]}
            />
          )}
          {isFamily && (
            <div className="mt-5">
              <FormGrid>
                <SelectField
                  label="Variante"
                  value={value.variantKey}
                  onChange={(v) => set('variantKey', v)}
                  options={keyOptions(variants)}
                  emptyLabel="Nenhuma (qualquer personagem pode ter)"
                  hint={family ? 'Opcional. Precisa ser uma das variantes do personagem.' : 'Opcional. Liga o traço a um poder.'}
                  wide
                />
              </FormGrid>
            </div>
          )}
        </>
      )}

      {step === 'effects' && (
        <>
          <StepIntro title="O que o traço dá">
            O bônus do traço, sempre ativo. O mais comum é <b className="text-fg">Bônus de atributo</b> (ex.: Vontade, 3 =
            +3%). Traços são pequenos de propósito
            {rules && (
              <>
                : um personagem tem até <b className="text-fg">{rules.maxTraits}</b> traços, e a soma deles num mesmo
                atributo não passa de <b className="text-fg">{rules.traitStatCapPercent}%</b>
              </>
            )}
            .
          </StepIntro>
          <EffectsEditor effects={value.effects} onChange={(effects) => set('effects', effects)} specs={traitEffectSpecs} emptyText="O traço ainda não dá nada: adicione um efeito." />
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Traço', value: `${value.name || '—'} · ${traitCategoryLabels[value.category]}` },
              { id: 'source', label: 'Origem', value: isFamily ? `Família${variant ? ` · ${variant.name}` : ''}` : 'Conquistado' },
              { id: 'effects', label: 'Efeitos', value: value.effects.map((e) => traitEffectSpecs[e.type]?.label ?? e.type).join(', ') || 'Nenhum' },
            ]}
          />
          <ReviewStatus steps={traitSteps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

// ---------------------------------------------------------------------------
// Campo de batalha
// ---------------------------------------------------------------------------

type FieldStepId = 'identity' | 'traits' | 'bonus' | 'review'

const fieldSteps: WizardStep<FieldStepId>[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'traits', title: 'Quem ganha' },
  { id: 'bonus', title: 'Bônus' },
  { id: 'review', title: 'Revisão' },
]

export function FieldForm({ value, onChange, catalog, rules, isNew, onSubmit, saving }: FormProps<FieldBody>) {
  const [step, setStep] = useState(firstStep(fieldSteps, isNew))
  const set = <K extends keyof FieldBody>(field: K, v: FieldBody[K]) => onChange({ ...value, [field]: v })
  const setPercent = (field: 'primaryPercent' | 'secondaryPercent', v: number | null) => {
    const next = { ...value }
    if (v === null) delete next[field]
    else next[field] = v
    onChange(next)
  }
  const limits = rules?.fieldTraits
  const chosen = catalog.traits.filter((t) => value.requiredTraitKeys.includes(t.key))
  const categories = new Set(chosen.map((t) => t.category as TraitBody['category']))
  const primary = value.primaryPercent ?? rules?.fieldPercent.primary
  const secondary = value.secondaryPercent ?? rules?.fieldPercent.secondary

  const problems: Record<FieldStepId, string[]> = { identity: [], traits: [], bonus: [], review: [] }
  if (!value.name.trim()) problems.identity.push('Dê um nome ao campo.')
  if (limits && (value.requiredTraitKeys.length < limits.min || value.requiredTraitKeys.length > limits.max))
    problems.traits.push(`Escolha de ${limits.min} a ${limits.max} traços (tem ${value.requiredTraitKeys.length}).`)
  if (chosen.length > 0 && categories.size < 2) problems.traits.push('Os traços precisam ser de pelo menos 2 categorias diferentes.')
  if (value.primaryStat === value.secondaryStat) problems.bonus.push('Os dois bônus precisam ser em atributos diferentes.')
  if ((value.primaryPercent ?? 1) <= 0 || (value.secondaryPercent ?? 1) <= 0) problems.bonus.push('Os bônus precisam ser maiores que zero.')

  const statOptions = statOrder.map((s) => ({ value: s, label: statLabels[s] }))

  return (
    <Wizard steps={fieldSteps} current={step} onStep={setStep} problems={problems} submitLabel={submitLabel(isNew, 'campo')} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="Qual é o terreno">
            O <b className="text-fg">campo de batalha</b> é o terreno da luta. Antes de cada batalha o jogo sorteia um
            campo e mostra ao jogador, que escolhe o esquadrão já sabendo onde vai lutar. Quem combina com o campo ganha um
            bônus de atributo durante a batalha toda, dos dois lados.
          </StepIntro>
          <FormGrid>
            <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Arena" hint="O nome que aparece no sorteio." required />
            <div />
            <TextAreaField
              label="Descrição"
              value={value.description}
              onChange={(v) => set('description', v)}
              placeholder="Ex.: Areia batida e público gritando: favorece quem parte para cima."
              hint="Opcional. O clima do lugar e a quem ele favorece."
            />
          </FormGrid>
        </>
      )}

      {step === 'traits' && (
        <>
          <StepIntro title="Quem ganha o bônus">
            O campo pede alguns <b className="text-fg">traços</b>: cada personagem que tem <b className="text-fg">pelo menos um</b>{' '}
            deles ganha o bônus. Para não favorecer só um tipo de personagem, os traços pedidos precisam ser de pelo menos{' '}
            <b className="text-fg">2 categorias</b> diferentes (Combate, Postura, Origem).
          </StepIntro>
          <MultiPick
            label="Traços pedidos"
            values={value.requiredTraitKeys}
            onChange={(v) => set('requiredTraitKeys', v)}
            options={catalog.traits.map((t) => ({
              value: t.key,
              label: `${t.name} · ${traitCategoryLabels[t.category as TraitBody['category']] ?? String(t.category)}`,
              hint: (t.description as string | null) ?? t.key,
            }))}
            max={limits?.max}
            hint={limits && `Escolha de ${limits.min} a ${limits.max}. Basta o personagem ter um deles.`}
            required
          />
          {chosen.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-fg-muted">Categorias escolhidas:</span>
              {[...categories].map((c) => (
                <Badge key={c} tone="primary">
                  {traitCategoryLabels[c] ?? c}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'bonus' && (
        <>
          <StepIntro title="Qual é o bônus">
            Quem combina com o campo ganha <b className="text-fg">dois bônus</b> de atributo: um principal (maior) e um
            secundário (menor), em atributos diferentes. Deixe a porcentagem vazia para usar o padrão do jogo
            {rules && (
              <>
                {' '}
                (<b className="text-fg">{rules.fieldPercent.primary}%</b> e <b className="text-fg">{rules.fieldPercent.secondary}%</b>)
              </>
            )}
            . Escolha atributos que combinem com o terreno (Arena: Ataque e Velocidade).
          </StepIntro>
          <FormGrid cols={4}>
            <SelectField label="Atributo principal" value={value.primaryStat} onChange={(v) => v && set('primaryStat', v as FieldBody['primaryStat'])} options={statOptions} required />
            <NumberField
              label="Bônus principal"
              value={value.primaryPercent}
              onChange={(v) => setPercent('primaryPercent', v)}
              unit="%"
              allowEmpty
              placeholder={rules ? String(rules.fieldPercent.primary) : undefined}
              hint={rules && `Vazio = padrão (${rules.fieldPercent.primary}%).`}
            />
            <SelectField label="Atributo secundário" value={value.secondaryStat} onChange={(v) => v && set('secondaryStat', v as FieldBody['secondaryStat'])} options={statOptions} required />
            <NumberField
              label="Bônus secundário"
              value={value.secondaryPercent}
              onChange={(v) => setPercent('secondaryPercent', v)}
              unit="%"
              allowEmpty
              placeholder={rules ? String(rules.fieldPercent.secondary) : undefined}
              hint={rules && `Vazio = padrão (${rules.fieldPercent.secondary}%).`}
            />
          </FormGrid>
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Campo', value: value.name || '—' },
              { id: 'traits', label: 'Quem ganha', value: chosen.map((t) => t.name).join(', ') || 'Nenhum traço' },
              {
                id: 'bonus',
                label: 'Bônus',
                value: `+${primary ?? '?'}% ${statLabels[value.primaryStat]} · +${secondary ?? '?'}% ${statLabels[value.secondaryStat]}`,
              },
            ]}
          />
          <ReviewStatus steps={fieldSteps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

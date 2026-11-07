import { useState, type ReactNode } from 'react'
import { AlertCircle, Check, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AdminCatalog, CatalogItem } from '@/features/admin/admin-api'
import {
  emptyBodies,
  exclusivityLabels,
  keyOptions,
  passiveEffectSpecs,
  passiveTriggerSpecs,
  rarityLabels,
  toOptions,
  type FormProps,
  type SkillBody,
  type TemplateBody,
  type TraitBody,
  type VariantBody,
} from '@/features/admin/admin-schema'
import { EffectFields, EffectsEditor } from '@/features/admin/effects-editor'
import { TraitForm, VariantForm } from '@/features/admin/entry-forms'
import {
  Field,
  FormGrid,
  FormSection,
  Note,
  NumberField,
  RequiredMark,
  Segmented,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
} from '@/features/admin/form-fields'
import { InlineEntry } from '@/features/admin/inline-entry'
import { SkillForm } from '@/features/admin/skill-form'
import { ReviewList, ReviewStatus, StepIntro, Wizard } from '@/features/admin/wizard'
import { classLabels, type CharacterClass, type SkillKitSlot, type Stat, type StatBlock } from '@/features/game/game-api'
import { dangerLabels, kitSlotLabels, lineageLabels, statLabels, statOrder, tierLabels } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'

// Assistente do modelo (o personagem): um passo por parte, na ordem em que fazem sentido para quem não conhece o
// projeto. Variante, traço e skills do kit podem ser escolhidos ou criados ali mesmo (InlineEntry). As checagens
// daqui só orientam; quem decide é o servidor.

/** Mesmo cálculo do servidor (`statBudget`): o HP conta 1/5. */
const statBudget = (s: StatBlock) => s.HP / 5 + s.ATTACK + s.DEFENSE + s.SPEED + s.PRECISION + s.EVASION + s.WILL

const KIT_SLOTS: SkillKitSlot[] = ['BASIC', 'STANDARD', 'ROLE', 'SIGNATURE']

const kitSlotHints: Record<SkillKitSlot, string> = {
  BASIC: 'Golpe simples e barato, sem recarga. É o que o personagem usa quando o resto está recarregando.',
  STANDARD: 'O golpe principal do começo do jogo, com um pouco de recarga.',
  ROLE: 'O que a classe faz no time: proteger, curar, controlar, marcar...',
  SIGNATURE: 'A marca do personagem: o golpe que mostra o poder (a variante) dele.',
}

const statHints: Record<Stat, string> = {
  HP: 'Vida. Vale 1/5 no orçamento (700 de HP = 140 pontos).',
  ATTACK: 'Força dos golpes de dano.',
  DEFENSE: 'Reduz o dano recebido.',
  SPEED: 'Com que frequência age (enche a barra de vez).',
  PRECISION: 'Chance de acertar.',
  EVASION: 'Chance de desviar.',
  WILL: 'Resiste a status (atordoar, prender...).',
}

const classHints: Record<CharacterClass, string> = {
  VANGUARD: 'Linha de frente que aguenta e bate.',
  MARKSMAN: 'Dano de longe, alvo único.',
  EXECUTOR: 'Finaliza alvos fracos, muito dano.',
  CONTROLLER: 'Atrapalha o inimigo com status.',
  SUPPORT: 'Cura e fortalece os aliados.',
  ARTILLERY: 'Dano em área.',
  GUARDIAN: 'Protege os aliados, segura o dano.',
  TACTICIAN: 'Mexe na vez e na posição do time.',
}

type StepId = 'identity' | 'variants' | 'family' | 'stats' | 'passive' | 'kit' | 'review'

const steps: { id: StepId; title: string; optional?: boolean }[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'variants', title: 'Variantes', optional: true },
  { id: 'family', title: 'Traço de família', optional: true },
  { id: 'stats', title: 'Atributos' },
  { id: 'passive', title: 'Passiva' },
  { id: 'kit', title: 'Skills do kit' },
  { id: 'review', title: 'Revisão' },
]

/** Quantas skills do kit cada variante precisa (D97): 1 = 4; 2 = 2 e 2; 3 = 2 da principal e 1 das outras. `''` = sem variante. */
function expectedKit(variants: TemplateBody['variants']): Map<string, number> {
  if (variants.length === 0) return new Map([['', 4]])
  if (variants.length === 1) return new Map([[variants[0].variantKey, 4]])
  if (variants.length === 2) return new Map(variants.map((v) => [v.variantKey, 2]))
  return new Map(variants.map((v) => [v.variantKey, v.isPrimary ? 2 : 1]))
}

/** O que falta em cada passo (vazio = pronto). Espelho das regras do servidor, só para orientar. */
function findProblems(value: TemplateBody, catalog: AdminCatalog, itemKey: string, keyError: string | undefined, rules: FormProps<TemplateBody>['rules']) {
  const p: Record<StepId, string[]> = { identity: [], variants: [], family: [], stats: [], passive: [], kit: [], review: [] }

  if (!value.name.trim()) p.identity.push('Dê um nome ao personagem.')
  if (!itemKey) p.identity.push('Defina a key.')
  if (keyError) p.identity.push(keyError)

  const chosen = value.variants.map((v) => v.variantKey)
  if (chosen.some((k) => !k)) p.variants.push('Escolha a variante em todas as linhas (ou tire a linha vazia).')
  if (new Set(chosen).size !== chosen.length) p.variants.push('A mesma variante aparece duas vezes.')
  if (value.variants.length > 0 && value.variants.filter((v) => v.isPrimary).length !== 1) p.variants.push('Marque exatamente uma variante como principal.')

  const family = catalog.traits.find((t) => t.key === value.familyTraitKey)
  if (family?.variantKey && !chosen.includes(family.variantKey as string))
    p.family.push(`O traço “${family.name}” é da variante ${variantName(catalog, family.variantKey as string)}, que o personagem não tem.`)

  if (statOrder.some((s) => !(value.stats[s] > 0))) p.stats.push('Todos os atributos precisam ser maiores que zero.')
  const target = rules?.classBudget[value.characterClass]
  if (target !== undefined && rules) {
    const tolerance = Math.round(target * rules.classBudgetTolerance)
    const budget = Math.round(statBudget(value.stats))
    if (Math.abs(budget - target) > tolerance) p.stats.push(`O orçamento está em ${budget}; a classe pede ${target} (±${tolerance}).`)
  }

  if (!value.passive.name.trim()) p.passive.push('Dê um nome à passiva.')
  if (!value.passive.description.trim()) p.passive.push('Escreva a descrição da passiva (o jogador lê).')
  if (value.passive.effects.length === 0) p.passive.push('A passiva precisa de ao menos um efeito.')

  const kit = kitSkills(catalog, itemKey)
  if (!itemKey) p.kit.push('Defina a key no passo 1: as skills do kit usam ela.')
  else {
    for (const slot of KIT_SLOTS) {
      const inSlot = kit.filter((s) => s.kitSlot === slot)
      if (inSlot.length === 0) p.kit.push(`Falta a skill de ${kitSlotLabels[slot]}.`)
      if (inSlot.length > 1) p.kit.push(`Há ${inSlot.length} skills de ${kitSlotLabels[slot]}; o kit tem uma de cada.`)
    }
    for (const s of kit)
      if (s.kitClass !== value.characterClass)
        p.kit.push(`“${s.name}” é do kit de ${classLabels[s.kitClass as CharacterClass]}; o personagem é ${classLabels[value.characterClass]}.`)
    if (!p.variants.length && kit.length === 4) {
      for (const [variantKey, need] of expectedKit(value.variants)) {
        const has = kit.filter((s) => (s.variantKey ?? '') === variantKey).length
        if (has !== need) p.kit.push(`${variantKey ? variantName(catalog, variantKey) : 'Sem variante'}: precisa de ${need} skill(s) do kit, tem ${has}.`)
      }
      const strays = kit.filter((s) => !expectedKit(value.variants).has((s.variantKey as string | null) ?? ''))
      for (const s of strays) p.kit.push(`“${s.name}” usa uma variante que o personagem não tem.`)
    }
  }
  return p
}

const variantName = (catalog: AdminCatalog, key: string) => catalog.variants.find((v) => v.key === key)?.name ?? key

/** Skills do kit do modelo: key começando por "modelo:" e com classe do kit. */
const kitSkills = (catalog: AdminCatalog, templateKey: string) =>
  templateKey ? catalog.skills.filter((s) => s.key.startsWith(`${templateKey}:`) && s.kitClass) : []

export function TemplateForm(props: FormProps<TemplateBody>) {
  const { value, onChange, catalog, rules, itemKey, isNew, keyError, onSubmit, saving } = props
  const [step, setStep] = useState<StepId>(isNew ? 'identity' : 'review')
  const problems = findProblems(value, catalog, itemKey, keyError, rules)

  return (
    <Wizard
      steps={steps}
      current={step}
      onStep={setStep}
      problems={problems}
      submitLabel={isNew ? 'Criar personagem' : 'Salvar personagem'}
      onSubmit={onSubmit}
      saving={saving}
    >
      {step === 'identity' && <IdentityStep {...props} />}
      {step === 'variants' && <VariantsStep {...props} />}
      {step === 'family' && <FamilyStep {...props} />}
      {step === 'stats' && <StatsStep {...props} />}
      {step === 'passive' && <PassiveStep {...props} />}
      {step === 'kit' && <KitStep {...props} />}
      {step === 'review' && (
        <ReviewStep value={value} catalog={catalog} itemKey={itemKey} problems={problems} onGo={setStep} onClearFamily={() => onChange({ ...value, familyTraitKey: null })} />
      )}
    </Wizard>
  )
}

// ---------------------------------------------------------------------------
// Passos
// ---------------------------------------------------------------------------

function IdentityStep({ value, onChange, itemKey, isNew, onKeyChange, keyError }: FormProps<TemplateBody>) {
  const set = <K extends keyof TemplateBody>(field: K, v: TemplateBody[K]) => onChange({ ...value, [field]: v })
  return (
    <>
      <StepIntro title="Quem é o personagem">
        O <b className="text-fg">modelo</b> é a ficha do personagem: todo jogador que tiver o “Kael Vaz” recebe uma cópia
        dele. Aqui vão o nome, a classe (o papel no time) e de onde ele vem. A <b className="text-fg">key</b> é o
        identificador interno: as skills do personagem usam ela no começo da key delas, então escolha antes de seguir.
      </StepIntro>
      <FormGrid>
        <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Kael Vaz" hint="O nome que o jogador vê." required />
        {isNew ? (
          <TextField
            label="Key"
            value={itemKey}
            onChange={(v) => onKeyChange?.(v)}
            placeholder="ex.: kael-vaz"
            mono
            error={keyError}
            hint="Sai do nome. Só minúsculas, números e “-”. Não muda depois."
            required
          />
        ) : (
          <Field label="Key" hint="Não muda depois de criado.">
            <p className="flex h-10 items-center font-mono text-sm text-fg-muted">{itemKey}</p>
          </Field>
        )}
        <SelectField
          label="Classe"
          value={value.characterClass}
          onChange={(v) => v && set('characterClass', v as TemplateBody['characterClass'])}
          options={Object.entries(classLabels).map(([v, l]) => ({ value: v, label: l, hint: `${classHints[v as CharacterClass]} Define o orçamento de atributos e o papel “Função” do kit.` }))}
          required
        />
        <Segmented
          label="Raridade"
          value={value.rarity}
          onChange={(v) => set('rarity', v as TemplateBody['rarity'])}
          options={toOptions(rarityLabels)}
          hint="Só o quanto é difícil de conseguir (E comum, SS raríssimo). Não muda a força."
          required
        />
        <SelectField
          label="Periculosidade inicial"
          value={value.initialDanger}
          onChange={(v) => v && set('initialDanger', v as TemplateBody['initialDanger'])}
          options={toOptions(dangerLabels)}
          hint="O nível de ameaça com que o personagem começa. Sobe com ele ao longo do jogo."
          required
        />
        <SelectField
          label="Exclusividade"
          value={value.exclusivity}
          onChange={(v) => v && set('exclusivity', v as TemplateBody['exclusivity'])}
          options={toOptions(exclusivityLabels)}
          hint="Nenhuma = sai em baú e pode ser vendido. Evento/Ranqueado = só como prêmio, não vende."
          required
        />
        <Toggle
          label="Personagem inicial"
          checked={value.isStarter ?? false}
          onChange={(checked) => set('isStarter', checked)}
          hint="Marcado: toda conta nova já começa com ele. Desmarcado: só sai de baú."
        />
        <TextAreaField
          label="Descrição"
          value={value.description}
          onChange={(v) => set('description', v)}
          placeholder="Ex.: Ex-soldado que transforma a raiva em explosões controladas."
          hint="Opcional. A história curta que aparece na ficha."
        />
      </FormGrid>
    </>
  )
}

function VariantsStep({ value, onChange, catalog, rules }: FormProps<TemplateBody>) {
  const [creating, setCreating] = useState(false)
  const set = (variants: TemplateBody['variants']) => onChange({ ...value, variants })
  const max = rules?.maxTemplateVariants ?? 3
  // o modelo só aceita variante comum: a despertada é do personagem, mais tarde
  const base = catalog.variants.filter((v) => !v.awakensFromKey)
  const full = value.variants.length >= max

  return (
    <>
      <StepIntro title="O poder do personagem" optional>
        A <b className="text-fg">variante</b> é o poder (Explosão, Gelo, Tempo...). Ela diz de que tipo são as skills e
        qual atributo o <b className="text-fg">Desgaste</b> (o cansaço de usar poder) consome, pela linhagem. Um
        personagem tem de 0 a {max} variantes: com uma, todas as skills do kit são dela; com mais, o kit se divide entre
        elas e cada skill cansa um pouco mais. Sem variante, o personagem luta com skills “sem variante”.
        <br />
        Escolha uma que já existe ou crie uma nova aqui mesmo.
      </StepIntro>

      <div className="space-y-2">
        {value.variants.map((variant, index) => {
          const taken = value.variants.filter((_, i) => i !== index).map((v) => v.variantKey)
          const lineage = catalog.variants.find((v) => v.key === variant.variantKey)?.lineage as keyof typeof lineageLabels | undefined
          return (
            <div key={index} className="flex flex-wrap items-end gap-2 rounded-control border border-line bg-bg/40 p-3">
              <div className="min-w-56 flex-1">
                <SelectField
                  label={`Variante ${index + 1}`}
                  value={variant.variantKey || null}
                  onChange={(v) => set(value.variants.map((x, i) => (i === index ? { ...x, variantKey: v ?? '' } : x)))}
                  options={keyOptions(base.filter((v) => !taken.includes(v.key)))}
                  hint={lineage && `Linhagem ${lineageLabels[lineage]}.`}
                  required
                />
              </div>
              {value.variants.length > 1 && (
                <Button
                  size="sm"
                  variant={variant.isPrimary ? 'secondary' : 'ghost'}
                  className="mb-6"
                  title="A principal fica com mais skills do kit quando há 3 variantes"
                  onClick={() => set(value.variants.map((x, i) => ({ ...x, isPrimary: i === index })))}
                >
                  <Star className={cn('size-3.5', variant.isPrimary && 'fill-primary-soft text-primary-soft')} />
                  {variant.isPrimary ? 'Principal' : 'Tornar principal'}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="mb-6 text-fg-subtle hover:text-danger-hover"
                aria-label="Tirar variante"
                onClick={() => {
                  const rest = value.variants.filter((_, i) => i !== index)
                  // sempre sobra uma principal
                  set(rest.length && !rest.some((v) => v.isPrimary) ? rest.map((v, i) => ({ ...v, isPrimary: i === 0 })) : rest)
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        })}

        {value.variants.length === 0 && !creating && (
          <p className="rounded-control border border-dashed border-line px-3 py-4 text-center text-sm text-fg-muted">
            Sem variante por enquanto. Escolha uma existente ou crie uma nova.
          </p>
        )}

        {creating ? (
          <InlineEntry<VariantBody>
            collection="variants"
            title="Nova variante"
            description="Ela fica salva no catálogo e já entra neste personagem."
            initial={emptyBodies.variants() as VariantBody}
            catalog={catalog}
            rules={rules}
            render={(p) => <VariantForm {...p} baseOnly />}
            onCancel={() => setCreating(false)}
            onDone={(key) => {
              setCreating(false)
              set([...value.variants, { variantKey: key, isPrimary: value.variants.length === 0 }])
            }}
          />
        ) : (
          !full && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => set([...value.variants, { variantKey: '', isPrimary: value.variants.length === 0 }])}>
                <Plus className="size-3.5" /> Escolher variante existente
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> Criar variante nova
              </Button>
            </div>
          )
        )}
        {full && <p className="text-xs text-fg-subtle">Máximo de {max} variantes.</p>}
      </div>
    </>
  )
}

function FamilyStep({ value, onChange, catalog, rules }: FormProps<TemplateBody>) {
  const [creating, setCreating] = useState(false)
  const variantKeys = value.variants.map((v) => v.variantKey).filter(Boolean)
  // traço de família, solto ou de uma das variantes do personagem
  const options = catalog.traits.filter((t) => t.source === 'TEMPLATE' && (!t.variantKey || variantKeys.includes(t.variantKey as string)))
  const chosen = catalog.traits.find((t) => t.key === value.familyTraitKey)

  return (
    <>
      <StepIntro title="O que vem de família" optional>
        Um <b className="text-fg">traço</b> é um bônus fixo pequeno (ex.: +3% de Vontade). O traço de{' '}
        <b className="text-fg">família</b> já vem com todo personagem deste modelo e fica com ele mesmo se for vendido.
        Além do bônus, os <b className="text-fg">campos de batalha</b> dão vantagem a quem tem certos traços. Se o traço
        for ligado a uma variante, o personagem precisa ter essa variante.
      </StepIntro>

      <FormGrid>
        <SelectField
          label="Traço de família"
          value={value.familyTraitKey}
          onChange={(v) => onChange({ ...value, familyTraitKey: v })}
          options={keyOptions(options)}
          emptyLabel="Nenhum"
          hint="Só aparecem traços de origem “Família”."
          wide
        />
      </FormGrid>
      {chosen && (
        <div className="mt-3 rounded-control border border-line bg-bg/40 px-3 py-2.5 text-xs text-fg-muted">
          <p className="font-medium text-fg">{chosen.name}</p>
          {(chosen.description as string | null) && <p>{chosen.description as string}</p>}
        </div>
      )}

      <div className="mt-4">
        {creating ? (
          <InlineEntry<TraitBody>
            collection="traits"
            title="Novo traço de família"
            description="Fica salvo no catálogo (outros modelos podem usar) e já entra neste personagem."
            initial={{ ...(emptyBodies.traits() as TraitBody), source: 'TEMPLATE', category: 'ORIGIN' }}
            catalog={catalog}
            rules={rules}
            render={(p) => <TraitForm {...p} family={{ variantKeys }} />}
            onCancel={() => setCreating(false)}
            onDone={(key) => {
              setCreating(false)
              onChange({ ...value, familyTraitKey: key })
            }}
          />
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> Criar traço novo
          </Button>
        )}
      </div>
    </>
  )
}

function StatsStep({ value, onChange, catalog, rules, itemKey }: FormProps<TemplateBody>) {
  const set = (stats: StatBlock) => onChange({ ...value, stats })
  const budget = statBudget(value.stats)
  const target = rules?.classBudget[value.characterClass]
  const tolerance = target && rules ? Math.round(target * rules.classBudgetTolerance) : 0
  const budgetOk = target === undefined || Math.abs(budget - target) <= tolerance
  const sameClass = catalog.templates.filter((t) => t.characterClass === value.characterClass && t.key !== itemKey)

  return (
    <>
      <StepIntro title="Atributos">
        Os números do personagem no <b className="text-fg">nível 100</b>; o jogo calcula os níveis de baixo sozinho. Cada
        classe tem um <b className="text-fg">orçamento</b> (a soma dos pontos, com o HP valendo 1/5), para ninguém ficar
        forte demais: distribua os pontos para dar o jeito do personagem, mas mantenha a soma perto do alvo. O jeito mais
        fácil é copiar de outro personagem da mesma classe e ajustar.
      </StepIntro>

      {sameClass.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-muted">Copiar de outro {classLabels[value.characterClass]}:</span>
          {sameClass.map((t) => (
            <Button key={t.key} size="sm" variant="ghost" onClick={() => set({ ...(t.stats as StatBlock) })}>
              {t.name}
            </Button>
          ))}
        </div>
      )}

      <FormGrid cols={4}>
        {statOrder.map((stat) => (
          <NumberField
            key={stat}
            label={statLabels[stat]}
            value={value.stats[stat]}
            onChange={(v) => set({ ...value.stats, [stat]: v ?? 0 })}
            min={0}
            hint={statHints[stat]}
            required
          />
        ))}
        <div className={cn('flex flex-col justify-center rounded-control border px-3 py-2', budgetOk ? 'border-success/30 bg-success/5' : 'border-danger/40 bg-danger-dim')}>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">Orçamento</span>
          <span className={cn('font-mono text-lg font-bold', budgetOk ? 'text-success' : 'text-danger-hover')}>
            {Math.round(budget)}
            {target !== undefined && <span className="text-xs font-normal text-fg-muted"> / {target} ±{tolerance}</span>}
          </span>
          <span className="text-[11px] text-fg-subtle">{budgetOk ? 'Dentro do alvo.' : budget > (target ?? 0) ? 'Acima: tire pontos.' : 'Abaixo: ponha pontos.'}</span>
        </div>
      </FormGrid>
    </>
  )
}

function PassiveStep({ value, onChange }: FormProps<TemplateBody>) {
  const setPassive = (passive: Partial<TemplateBody['passive']>) => onChange({ ...value, passive: { ...value.passive, ...passive } })
  const trigger = passiveTriggerSpecs[value.passive.trigger.type]

  return (
    <>
      <StepIntro title="Passiva">
        A <b className="text-fg">passiva</b> é uma habilidade que funciona sozinha, sem o jogador escolher. Ela tem um{' '}
        <b className="text-fg">gatilho</b> (quando dispara: ao ser atingido, a cada 3 turnos, sempre...) e um ou mais{' '}
        <b className="text-fg">efeitos</b> (o que acontece). Ex.: “Couraça”: ao ser atingido, reduz em 15% o dano
        recebido.
      </StepIntro>
      <div className="space-y-5">
        <FormGrid>
          <TextField label="Nome da passiva" value={value.passive.name} onChange={(v) => setPassive({ name: v })} placeholder="Ex.: Couraça" required />
          <SelectField
            label="Gatilho (quando dispara)"
            value={value.passive.trigger.type}
            onChange={(type) => {
              if (!type) return
              const spec = passiveTriggerSpecs[type]
              setPassive({ trigger: Object.fromEntries([['type', type], ...spec.fields.map((f) => [f.name, f.default])]) as TemplateBody['passive']['trigger'] })
            }}
            options={Object.entries(passiveTriggerSpecs).map(([v, s]) => ({ value: v, label: s.label, hint: s.description }))}
            required
          />
          <TextAreaField
            label="Descrição da passiva"
            value={value.passive.description}
            onChange={(v) => setPassive({ description: v ?? '' })}
            placeholder="Ex.: Ao ser atingido, reduz em 15% o dano recebido."
            hint="O texto que o jogador lê. Descreva o gatilho e o efeito com os números."
            required
          />
        </FormGrid>
        {trigger && <EffectFields effect={value.passive.trigger} spec={trigger} onChange={(t) => setPassive({ trigger: t })} />}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">
            Efeitos (o que acontece)
            <RequiredMark />
          </p>
          <EffectsEditor
            effects={value.passive.effects}
            onChange={(effects) => setPassive({ effects })}
            specs={passiveEffectSpecs}
            emptyText="A passiva ainda não faz nada: adicione um efeito."
          />
        </div>
      </div>
    </>
  )
}

function KitStep({ value, catalog, rules, itemKey }: FormProps<TemplateBody>) {
  const [editing, setEditing] = useState<{ slot: SkillKitSlot; item?: CatalogItem } | null>(null)
  const kit = kitSkills(catalog, itemKey)
  const variantKeys = value.variants.map((v) => v.variantKey).filter(Boolean)
  const expected = expectedKit(value.variants)
  const pool = itemKey ? catalog.skills.filter((s) => s.key.startsWith(`${itemKey}:`) && !s.kitClass) : []

  // a variante que mais precisa de skill vai de sugestão na próxima
  const suggestVariant = () => {
    let best: string | null = null
    let gap = -Infinity
    for (const [k, need] of expected) {
      const g = need - kit.filter((s) => (s.variantKey ?? '') === k).length
      if (g > gap) [best, gap] = [k, g]
    }
    return best || null
  }

  const newSkill = (slot: SkillKitSlot): SkillBody => ({
    ...(emptyBodies.skills() as SkillBody),
    tier: slot === 'BASIC' ? 'BASIC' : 'STANDARD',
    cooldown: slot === 'BASIC' ? 0 : 1,
    minLevel: 0,
    variantKey: suggestVariant(),
    kitClass: value.characterClass,
    kitSlot: slot,
    effects: [{ type: 'DAMAGE', power: 0.8 }],
  })

  return (
    <>
      <StepIntro title="Skills do kit">
        Todo personagem nasce com <b className="text-fg">4 skills</b>, uma de cada papel: Básica, Padrão, Função e
        Assinatura. Elas são a build inicial; as outras skills ele aprende subindo de nível. As skills de um personagem
        têm a key começando pela dele (<code className="font-mono text-fg">{itemKey || 'key-do-personagem'}:...</code>),
        e o servidor só aceita criar o personagem quando as 4 já existem. Por isso elas são criadas aqui, antes de salvar
        o personagem.
      </StepIntro>

      {!itemKey ? (
        <Note tone="warning">Defina a key no passo 1 (Identidade) antes de criar as skills.</Note>
      ) : (
        <div className="space-y-5">
          {/* divisão pelas variantes */}
          <div className="rounded-control border border-line bg-bg/40 p-3">
            <p className="mb-2 text-xs text-fg-muted">
              Quantas skills do kit cada variante precisa {value.variants.length > 1 && '(o kit se divide entre as variantes)'}:
            </p>
            <div className="flex flex-wrap gap-2">
              {[...expected].map(([k, need]) => {
                const has = kit.filter((s) => (s.variantKey ?? '') === k).length
                return (
                  <Badge key={k || 'none'} tone={has === need ? 'success' : 'warning'}>
                    {k ? variantName(catalog, k) : 'Sem variante'} · {has}/{need}
                  </Badge>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {KIT_SLOTS.map((slot) => {
              const skills = kit.filter((s) => s.kitSlot === slot)
              const skill = skills[0]
              const wrongClass = skill && skill.kitClass !== value.characterClass
              return (
                <div key={slot} className={cn('space-y-2 rounded-control border p-3', skill && !wrongClass ? 'border-success/30 bg-success/5' : 'border-line bg-bg/40')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 font-display text-base font-bold uppercase tracking-wide text-silver-bright">
                        {skill && !wrongClass ? <Check className="size-4 text-success" /> : <AlertCircle className="size-4 text-warning" />}
                        {kitSlotLabels[slot]}
                      </p>
                      <p className="text-xs text-fg-subtle">{kitSlotHints[slot]}</p>
                    </div>
                  </div>
                  {skill ? (
                    <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-bg px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-fg">{skill.name}</p>
                        <p className="truncate font-mono text-[11px] text-fg-subtle">
                          {skill.variantKey ? variantName(catalog, skill.variantKey as string) : 'sem variante'} · {tierLabels[skill.tier as SkillBody['tier']]}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ slot, item: skill })}>
                        <Pencil className="size-3.5" /> Editar
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setEditing({ slot })}>
                      <Plus className="size-3.5" /> Criar skill de {kitSlotLabels[slot]}
                    </Button>
                  )}
                  {wrongClass && <p className="text-xs text-warning">É do kit de {classLabels[skill.kitClass as CharacterClass]}: edite e troque a classe.</p>}
                  {skills.length > 1 && <p className="text-xs text-warning">Há {skills.length} skills neste papel; deixe só uma.</p>}
                </div>
              )
            })}
          </div>

          {editing && (
            <InlineEntry<SkillBody>
              key={`${editing.slot}-${editing.item?.key ?? 'new'}`}
              collection="skills"
              item={editing.item}
              title={`Skill de ${kitSlotLabels[editing.slot]}`}
              description={kitSlotHints[editing.slot]}
              initial={newSkill(editing.slot)}
              keyPrefix={`${itemKey}:`}
              catalog={catalog}
              rules={rules}
              render={(p) => <SkillForm {...p} kit={{ characterClass: value.characterClass, variantKeys }} />}
              onCancel={() => setEditing(null)}
              onDone={() => setEditing(null)}
            />
          )}

          {pool.length > 0 && (
            <p className="text-xs text-fg-subtle">
              Fora do kit, este personagem tem {pool.length} skill(s) para aprender subindo de nível (edite em Skills).
            </p>
          )}
          <p className="text-xs text-fg-subtle">
            As skills ficam salvas no catálogo assim que você clica em “Criar e usar”, mesmo que o personagem ainda não
            tenha sido criado.
          </p>
        </div>
      )}
    </>
  )
}

function ReviewStep({ value, catalog, itemKey, problems, onGo, onClearFamily }: {
  value: TemplateBody
  catalog: AdminCatalog
  itemKey: string
  problems: Record<StepId, string[]>
  onGo: (id: StepId) => void
  onClearFamily: () => void
}) {
  const family = catalog.traits.find((t) => t.key === value.familyTraitKey)
  const kit = kitSkills(catalog, itemKey)

  const rows: { id: StepId; label: string; value: ReactNode }[] = [
    { id: 'identity', label: 'Personagem', value: `${value.name || '—'} · ${classLabels[value.characterClass]} · raridade ${value.rarity} · ${value.isStarter ? 'inicial' : 'de baú'}` },
    {
      id: 'variants',
      label: 'Variantes',
      value: value.variants.length
        ? value.variants.map((v) => `${variantName(catalog, v.variantKey)}${v.isPrimary && value.variants.length > 1 ? ' (principal)' : ''}`).join(', ')
        : 'Nenhuma',
    },
    { id: 'family', label: 'Traço de família', value: family?.name ?? 'Nenhum' },
    { id: 'stats', label: 'Atributos', value: `orçamento ${Math.round(statBudget(value.stats))}` },
    { id: 'passive', label: 'Passiva', value: value.passive.name || '—' },
    { id: 'kit', label: 'Kit', value: kit.length ? kit.map((s) => s.name).join(', ') : 'Nenhuma skill ainda' },
  ]

  return (
    <>
      <FormSection index="✓" title="Revisão" description="Confira tudo antes de salvar. Clique numa linha para voltar ao passo.">
        <ReviewList rows={rows} problems={problems} onGo={onGo} />
        {problems.family.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearFamily}>
            Tirar o traço de família
          </Button>
        )}
        <ReviewStatus steps={steps} problems={problems} />
      </FormSection>
    </>
  )
}

import { useState, type ReactNode } from 'react'
import { Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSkillReference, type SkillReference } from '@/features/admin/admin-api'
import { keyOptions, skillEffectSpecs, slugify, type FormProps, type SkillBody } from '@/features/admin/admin-schema'
import { EffectsEditor } from '@/features/admin/effects-editor'
import {
  ChoiceCards,
  Field,
  FormGrid,
  FormSection,
  Note,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/features/admin/form-fields'
import { ReviewList, ReviewStatus, StepIntro, Wizard, type WizardStep } from '@/features/admin/wizard'
import { classLabels, type CharacterClass, type SkillEffect, type SkillKitSlot } from '@/features/game/game-api'
import { kitSlotLabels, lineageLabels, rangeLabels, targetLabels, tierLabels } from '@/features/game/game-labels'
import { describeTargeting, explainEffect, skillFacts } from '@/features/game/skill-text'
import { cn } from '@/lib/cn'

// Assistente da skill: um passo por decisão, cada uma explicada para quem não conhece o combate. As checagens daqui
// espelham o `validate` de ../origin-game/src/domain/skills/entities/skill.ts só para orientar; quem decide é o servidor.

const POWER_EFFECTS = ['DAMAGE', 'HEAL', 'SHIELD']

/** Skill do kit criada de dentro do modelo: classe e papel fixos, variante entre as do modelo. */
export type KitLock = { characterClass: CharacterClass; variantKeys: string[] }

type StepId = 'identity' | 'variant' | 'tier' | 'target' | 'effects' | 'cost' | 'kit' | 'review'

const steps: WizardStep<StepId>[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'variant', title: 'Variante', optional: true },
  { id: 'tier', title: 'Força' },
  { id: 'target', title: 'Alvo' },
  { id: 'effects', title: 'Efeitos' },
  { id: 'cost', title: 'Custo' },
  { id: 'kit', title: 'Kit ou nível' },
  { id: 'review', title: 'Revisão' },
]

const tierText: Record<SkillBody['tier'], string> = {
  BASIC: 'O golpe do dia a dia: fraco, barato e quase sem recarga. Todo kit tem uma.',
  STANDARD: 'O golpe principal do começo do jogo, com força e custo equilibrados.',
  REINFORCED: 'Uma versão mais forte, para o meio do jogo.',
  STRONG: 'Golpe pesado, com recarga longa e custo alto.',
  FINAL: 'O mais forte do personagem: custa caro e demora a voltar.',
}

const targetText: Record<SkillBody['target'], string> = {
  ENEMY: 'Ataca o time adversário. Tem alcance (quem dá para alcançar) e pode errar.',
  ALLY: 'Ajuda o próprio time: cura, escudo, bônus. Sempre acerta.',
  SELF: 'Só em quem usou. Sempre acerta e é sempre um alvo só.',
}

const areaNames: Record<SkillBody['area'], string> = { SINGLE: 'Alvo único', LINE: 'Fileira', COLUMN: 'Coluna', GRID: 'Grade inteira' }

const areaText: Record<SkillBody['area'], string> = {
  SINGLE: 'Um alvo só. É a mais forte por alvo.',
  LINE: 'A fileira inteira do alvo, da frente até o fundo.',
  COLUMN: 'A mesma profundidade nas 3 fileiras (ex.: todos da frente).',
  GRID: 'Todo o lado alvo. A mais fraca por alvo.',
}

const rangeText: Record<NonNullable<SkillBody['range']>, string> = {
  MELEE: 'Só alcança o primeiro da fileira (quem está exposto na frente).',
  RANGED: 'Alcança qualquer um, mas quem está atrás de alguém tem cobertura (leva 70%).',
  PIERCING: 'Atravessa a fileira inteira, sem bloqueio. Custa mais.',
  FLANK: 'Ignora a frente: alcança o último da fileira (o mais protegido).',
}

const kitSlotText: Record<SkillKitSlot, string> = {
  BASIC: 'Golpe simples e barato, sem recarga: o que sobra quando o resto está recarregando.',
  STANDARD: 'O golpe principal do começo do jogo.',
  ROLE: 'O que a classe faz no time: proteger, curar, controlar, marcar...',
  SIGNATURE: 'A marca do personagem: o golpe que mostra o poder (a variante) dele.',
}

// ---------------------------------------------------------------------------
// Desenho da grade: 3 fileiras x 3 profundidades de um lado, a frente à esquerda (como o inimigo na batalha)
// ---------------------------------------------------------------------------

/** Casas marcadas de cada área e alcance ([fileira, profundidade]; profundidade 0 = frente). */
const areaCells: Record<SkillBody['area'], [number, number][]> = {
  SINGLE: [[1, 0]],
  LINE: [[1, 0], [1, 1], [1, 2]],
  COLUMN: [[0, 0], [1, 0], [2, 0]],
  GRID: [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => [r, c] as [number, number])),
}

const rangeCells: Record<NonNullable<SkillBody['range']>, [number, number][]> = {
  MELEE: [[1, 0]],
  RANGED: [[1, 1]],
  PIERCING: [[1, 0], [1, 1], [1, 2]],
  FLANK: [[1, 2]],
}

function GridDiagram({ cells, tone = 'danger' }: { cells: [number, number][]; tone?: 'danger' | 'primary' }) {
  const on = new Set(cells.map(([r, c]) => `${r}:${c}`))
  return (
    <span className="mt-1 flex items-center gap-2" aria-hidden>
      <span className="grid grid-cols-3 gap-0.5">
        {[0, 1, 2].flatMap((r) =>
          [0, 1, 2].map((c) => (
            <span
              key={`${r}:${c}`}
              className={cn(
                'size-3.5 border',
                on.has(`${r}:${c}`) ? (tone === 'danger' ? 'border-danger-hover bg-danger/50' : 'border-primary-soft bg-primary/50') : 'border-line-strong bg-bg',
              )}
            />
          )),
        )}
      </span>
      <span className="font-mono text-[9px] uppercase leading-tight tracking-[0.12em] text-fg-subtle">
        ← frente
        <br />
        fundo →
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// O que falta em cada passo
// ---------------------------------------------------------------------------

function findProblems(props: FormProps<SkillBody> & { kit?: KitLock }, ownerClass: CharacterClass | undefined): Record<StepId, string[]> {
  const { value, catalog, rules, itemKey, isNew, onKeyChange, keyError } = props
  const p: Record<StepId, string[]> = { identity: [], variant: [], tier: [], target: [], effects: [], cost: [], kit: [], review: [] }
  const awakened = !!catalog.variants.find((v) => v.key === value.variantKey)?.awakensFromKey
  const inKit = value.kitClass !== null
  const enemy = value.target === 'ENEMY'

  if (!value.name.trim()) p.identity.push('Dê um nome à skill.')
  if (isNew && onKeyChange) {
    if (!itemKey.includes(':')) p.identity.push('Escolha o personagem dono.')
    if (!itemKey.split(':')[1]) p.identity.push('Preencha o nome curto (a key).')
    if (keyError) p.identity.push(keyError)
  }

  if (awakened && inKit) p.variant.push('Variante despertada não entra no kit: escolha outra ou mude para "Por nível".')

  if (value.target === 'SELF' && value.area !== 'SINGLE') p.target.push('Skill em si mesmo é sempre de um alvo só.')
  if (enemy && !value.range) p.target.push('Escolha o alcance.')
  if (enemy && !(value.baseHitChance! > 0 && value.baseHitChance! <= 1)) p.target.push('Chance de acerto entre 0 e 1 (ex.: 0,8).')

  const max = rules?.maxSkillPower
  if (value.effects.length === 0) p.effects.push('A skill precisa de ao menos um efeito.')
  for (const e of value.effects) {
    const n = (k: string) => e[k] as number
    const name = skillEffectSpecs[e.type]?.label ?? e.type
    if (POWER_EFFECTS.includes(e.type) && (!(n('power') > 0) || (max !== undefined && n('power') > max)))
      p.effects.push(`${name}: Poder maior que 0${max !== undefined ? ` e até ${max}` : ''}.`)
    if ((e.type === 'PROTECT' || e.type === 'GRANT_TURN') && (value.target !== 'ALLY' || value.area !== 'SINGLE'))
      p.effects.push(`${name} só funciona em um aliado (alvo Aliado, área Alvo único).`)
    if (e.type === 'EXPLOIT' && (!enemy || !value.effects.some((x) => x.type === 'DAMAGE') || !(n('multiplier') > 1)))
      p.effects.push(`${name}: alvo Inimigo, junto com um efeito de Dano e multiplicador acima de 1.`)
    if (e.type === 'RECOVER' && enemy) p.effects.push(`${name} só em aliado ou em si mesmo.`)
    if (e.type === 'APPLY_STATUS' && !(n('baseChance') > 0 && n('baseChance') <= 1)) p.effects.push(`${name}: chance entre 0 e 1.`)
    if ('duration' in e && !(n('duration') >= 1)) p.effects.push(`${name}: duração de pelo menos 1 turno.`)
  }

  if (!Number.isInteger(value.cooldown) || value.cooldown < 0) p.cost.push('Recarga: número inteiro, 0 ou mais.')
  if (value.desgastePercent < 0) p.cost.push('Desgaste não pode ser negativo.')
  const tierMin = rules?.skillTierReference[value.tier]?.minLevel ?? 0
  if (inKit) {
    if (tierMin > 0) p.tier.push(`Skill do kit tem nível 0, e o tipo ${tierLabels[value.tier]} pede nível ${tierMin}+: use Básica ou Padrão.`)
  } else {
    if (value.minLevel < 0 || value.minLevel > 100) p.cost.push('Nível mínimo entre 0 e 100.')
    if (value.minLevel < tierMin) p.cost.push(`O tipo ${tierLabels[value.tier]} pede nível mínimo ${tierMin} ou mais.`)
    if (awakened && rules && value.minLevel < rules.awakenedMinLevel) p.cost.push(`Skill de variante despertada pede nível mínimo ${rules.awakenedMinLevel} ou mais.`)
  }

  if (inKit && !value.kitSlot) p.kit.push('Escolha o papel no kit.')
  if (inKit && ownerClass && value.kitClass !== ownerClass) p.kit.push(`A classe do kit precisa ser a do personagem (${classLabels[ownerClass]}).`)
  return p
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

export function SkillForm(props: FormProps<SkillBody> & { kit?: KitLock }) {
  const { value, catalog, itemKey, isNew, kit, onSubmit, saving } = props
  // dentro do modelo (kit) a skill é sempre montada do começo; uma existente abre na revisão
  const [step, setStep] = useState<StepId>(isNew || kit ? 'identity' : 'review')

  const owner = catalog.templates.find((t) => itemKey.startsWith(`${t.key}:`))
  const ownerClass = kit?.characterClass ?? (owner?.characterClass as CharacterClass | undefined)
  const variant = catalog.variants.find((v) => v.key === value.variantKey)
  const isNone = !variant || variant.lineage === 'NONE'
  const reference = useSkillReference({ tier: value.tier, target: value.target, range: value.range, area: value.area, isNone })
  const problems = findProblems(props, ownerClass)
  const shared: StepProps = { ...props, ownerClass, reference: reference.data }

  return (
    <Wizard
      steps={steps}
      current={step}
      onStep={setStep}
      problems={problems}
      submitLabel={isNew ? 'Criar skill' : 'Salvar skill'}
      onSubmit={onSubmit}
      saving={saving}
    >
      {step === 'identity' && <IdentityStep {...shared} />}
      {step === 'variant' && <VariantStep {...shared} />}
      {step === 'tier' && <TierStep {...shared} />}
      {step === 'target' && <TargetStep {...shared} />}
      {step === 'effects' && <EffectsStep {...shared} />}
      {step === 'cost' && <CostStep {...shared} />}
      {step === 'kit' && <KitStep {...shared} />}
      {step === 'review' && <ReviewStep {...shared} problems={problems} onGo={setStep} />}
    </Wizard>
  )
}

type StepProps = FormProps<SkillBody> & { kit?: KitLock; ownerClass: CharacterClass | undefined; reference: SkillReference | undefined }

function IdentityStep({ value, onChange, catalog, itemKey, isNew, onKeyChange, keyError, kit }: StepProps) {
  const [typingOwner, setTypingOwner] = useState(false)
  const [owner, slug] = itemKey.includes(':') ? itemKey.split(':', 2) : ['', itemKey]
  const ownerExists = catalog.templates.some((t) => t.key === owner)
  const setKey = (o: string, s: string) => onKeyChange?.(o ? `${o}:${s}` : s)
  // o nome curto acompanha o nome até ser mexido à mão
  const setName = (name: string) => {
    if (isNew && onKeyChange && (slug === '' || slug === slugify(value.name))) setKey(owner, slugify(name))
    onChange({ ...value, name })
  }

  return (
    <>
      <StepIntro title="Qual é a skill">
        Uma <b className="text-fg">skill</b> é um golpe ou habilidade que o jogador escolhe na batalha. Toda skill
        pertence a <b className="text-fg">um personagem</b>: a key dela começa pela key dele (
        <code className="font-mono text-fg">kael-vaz:detonacao</code>), e é assim que o jogo sabe de quem ela é.
        {kit && ' Aqui ela já está ligada ao personagem que você está montando.'}
      </StepIntro>
      <FormGrid>
        <TextField label="Nome" value={value.name} onChange={setName} placeholder="Ex.: Detonação" hint="O nome que o jogador vê na barra de skills." required />
        {isNew && onKeyChange ? (
          <>
            {typingOwner || (owner && !ownerExists) ? (
              <TextField
                label="Personagem dono (key)"
                value={owner}
                onChange={(v) => setKey(v.toLowerCase().replace(/[^a-z0-9-]/g, ''), slug)}
                placeholder="ex.: draxler"
                mono
                hint="A key do personagem que ainda vai ser criado. Crie as 4 skills do kit e depois o personagem com essa key."
                required
              />
            ) : (
              <SelectField
                label="Personagem dono"
                value={ownerExists ? owner : null}
                onChange={(v) => setKey(v ?? '', slug)}
                options={keyOptions(catalog.templates)}
                hint="O personagem que vai usar a skill. Ela entra na lista de skills dele."
                required
              />
            )}
            <Field label="Nome curto (key)" required error={keyError} hint="Sai do nome. Só minúsculas, números e “-”. Não muda depois.">
              <div className="flex h-10 items-center rounded-control border border-line bg-bg focus-within:border-primary">
                <span className="pl-3 font-mono text-sm text-fg-subtle">{owner || 'dono'}:</span>
                <input
                  value={slug}
                  onChange={(e) => setKey(owner, e.target.value)}
                  placeholder="ex.: detonacao"
                  className="h-full w-full min-w-0 bg-transparent px-1.5 font-mono text-sm text-fg outline-none placeholder:text-fg-subtle"
                />
              </div>
            </Field>
            <div className="flex items-end pb-1">
              <button type="button" onClick={() => setTypingOwner((t) => !t)} className="text-xs text-primary-soft underline-offset-2 hover:underline">
                {typingOwner ? 'Escolher um personagem que já existe' : 'O personagem ainda não existe? Digite a key dele'}
              </button>
            </div>
          </>
        ) : (
          !kit && (
            <Field label="Key" hint="Não muda depois de criada.">
              <p className="flex h-10 items-center font-mono text-sm text-fg-muted">{itemKey}</p>
            </Field>
          )
        )}
        <TextAreaField
          label="Descrição"
          value={value.description}
          onChange={(v) => onChange({ ...value, description: v })}
          placeholder="Ex.: Uma explosão concentrada no inimigo da frente."
          hint="Opcional. O jogo já explica sozinho o que a skill faz (alvo, efeitos); aqui vai o sabor da skill."
        />
      </FormGrid>
    </>
  )
}

function VariantStep({ value, onChange, catalog, itemKey, kit, rules }: StepProps) {
  const owner = catalog.templates.find((t) => itemKey.startsWith(`${t.key}:`))
  const ownerKeys = kit?.variantKeys ?? ((owner?.variants as { variantKey: string }[] | undefined) ?? []).map((x) => x.variantKey)
  const options = kit
    ? catalog.variants.filter((v) => kit.variantKeys.includes(v.key))
    : owner
      ? catalog.variants.filter((v) => ownerKeys.some((k) => k === v.key || v.awakensFromKey === k))
      : catalog.variants
  const variant = catalog.variants.find((v) => v.key === value.variantKey)

  return (
    <>
      <StepIntro title="De que poder ela é" optional>
        A <b className="text-fg">variante</b> é o poder do personagem (Explosão, Gelo, Tempo...). Ela diz de que{' '}
        <b className="text-fg">linhagem</b> a skill é, e a linhagem diz qual atributo o <b className="text-fg">Desgaste</b>{' '}
        (o cansaço de usar poder) consome. Escolha uma das variantes do dono.
        <br />
        <b className="text-fg">Sem variante</b>: skill de quem luta sem poder; um pouco mais fraca e cansa menos.{' '}
        <b className="text-fg">Despertada</b>: a forma evoluída de uma variante; só aparece em nível alto e nunca no kit.
      </StepIntro>
      <FormGrid>
        <SelectField
          label="Variante"
          value={value.variantKey}
          onChange={(v) => onChange({ ...value, variantKey: v })}
          options={keyOptions(options, (v) => (v.awakensFromKey ? 'Variante despertada: só em nível alto, nunca no kit.' : undefined))}
          emptyLabel="Nenhuma (skill sem variante)"
          hint={owner || kit ? 'Só aparecem as variantes do personagem dono (e as despertadas delas).' : 'Escolha o dono no passo 1 para filtrar.'}
          wide
        />
      </FormGrid>
      {variant && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-control border border-line bg-bg/40 px-3 py-2.5 text-xs text-fg-muted">
          <span className="font-medium text-fg">{variant.name}</span>
          <Badge>Linhagem {lineageLabels[variant.lineage as keyof typeof lineageLabels] ?? String(variant.lineage)}</Badge>
          {variant.awakensFromKey ? <Badge tone="warning">Despertada · nível {rules?.awakenedMinLevel ?? '?'}+</Badge> : null}
        </div>
      )}
    </>
  )
}

function TierStep({ value, onChange, rules }: StepProps) {
  const tiers = Object.keys(tierLabels) as SkillBody['tier'][]
  return (
    <>
      <StepIntro title="Quão forte ela é">
        O <b className="text-fg">tipo</b> define o tamanho da skill. Cada tipo tem uma <b className="text-fg">referência</b>:
        o Poder (força do efeito: 1,0 = golpe padrão), a recarga e o nível a partir do qual ela pode aparecer. Mais forte
        = mais cara e mais tarde no jogo. Os números voltam no passo Custo, com um botão que preenche tudo de uma vez.
      </StepIntro>
      <ChoiceCards
        label="Tipo (força)"
        value={value.tier}
        onChange={(v) => onChange({ ...value, tier: v as SkillBody['tier'] })}
        cols={5}
        required
        options={tiers.map((t) => {
          const r = rules?.skillTierReference[t]
          return {
            value: t,
            label: tierLabels[t],
            description: tierText[t],
            extra: r && (
              <span className="mt-1 font-mono text-[10px] text-primary-soft">
                Poder {r.power} · recarga {r.cooldown} · nível {r.minLevel}+
              </span>
            ),
          }
        })}
      />
    </>
  )
}

function TargetStep({ value, onChange }: StepProps) {
  const enemy = value.target === 'ENEMY'
  // alcance e chance de acerto só existem em skill de inimigo; em si mesmo, sempre alvo único
  const changeTarget = (target: SkillBody['target']) =>
    onChange({
      ...value,
      target,
      area: target === 'SELF' ? 'SINGLE' : value.area,
      range: target === 'ENEMY' ? (value.range ?? 'MELEE') : null,
      baseHitChance: target === 'ENEMY' ? (value.baseHitChance ?? 0.8) : null,
    })

  return (
    <>
      <StepIntro title="Em quem ela pega">
        Cada time fica numa grade de <b className="text-fg">3 fileiras × 3 profundidades</b> (frente, meio e fundo). Aqui
        você diz de que lado a skill pega (<b className="text-fg">alvo</b>), quantas casas (<b className="text-fg">área</b>)
        e, contra o inimigo, quem dá para alcançar (<b className="text-fg">alcance</b>). Área maior e alcance mais livre
        deixam a skill mais fraca por alvo, para equilibrar.
      </StepIntro>
      <div className="space-y-6">
        <ChoiceCards
          label="Alvo"
          value={value.target}
          onChange={(v) => changeTarget(v as SkillBody['target'])}
          options={(Object.keys(targetLabels) as SkillBody['target'][]).map((t) => ({ value: t, label: targetLabels[t], description: targetText[t] }))}
          required
        />
        <ChoiceCards
          label="Área"
          value={value.area}
          onChange={(v) => onChange({ ...value, area: v as SkillBody['area'] })}
          cols={4}
          required
          hint={value.target === 'SELF' ? 'Em si mesmo, só Alvo único.' : undefined}
          options={(Object.keys(areaText) as SkillBody['area'][]).map((a) => ({
            value: a,
            label: areaNames[a],
            description: areaText[a],
            disabled: value.target === 'SELF' && a !== 'SINGLE',
            extra: <GridDiagram cells={areaCells[a]} tone={enemy ? 'danger' : 'primary'} />,
          }))}
        />
        {enemy && (
          <>
            <ChoiceCards
              label="Alcance"
              value={value.range}
              onChange={(v) => onChange({ ...value, range: v as SkillBody['range'] })}
              cols={4}
              required
              hint="Quem a skill consegue alcançar na grade inimiga. O desenho mostra quem é atingido numa fileira cheia."
              options={(Object.keys(rangeText) as NonNullable<SkillBody['range']>[]).map((r) => ({
                value: r,
                label: rangeLabels[r],
                description: rangeText[r],
                extra: <GridDiagram cells={rangeCells[r]} />,
              }))}
            />
            <FormGrid>
              <NumberField
                label="Chance de acerto"
                value={value.baseHitChance}
                onChange={(v) => onChange({ ...value, baseHitChance: v })}
                step={0.05}
                min={0}
                max={1}
                hint="De 0 a 1 (0,8 = 80%). É a base: a Precisão de quem ataca aumenta, a Esquiva do alvo diminui. O normal é 0,8."
                required
              />
            </FormGrid>
          </>
        )}
        <Note>
          Como o jogador vai ler: <b className="text-fg">{describeTargeting(value)}</b>
        </Note>
      </div>
    </>
  )
}

function EffectsStep({ value, onChange, reference, rules }: StepProps) {
  return (
    <>
      <StepIntro title="O que ela faz">
        Os <b className="text-fg">efeitos</b> acontecem na ordem da lista, em cada alvo. A maioria das skills começa por{' '}
        <b className="text-fg">Dano</b>, <b className="text-fg">Cura</b> ou <b className="text-fg">Escudo</b>, que têm{' '}
        <b className="text-fg">Poder</b>: 1,0 é um golpe padrão, 2,0 é o dobro
        {reference && (
          <>
            {' '}
            (para o tipo e a forma escolhidos, a referência é <b className="text-fg">{reference.power}</b>)
          </>
        )}
        {rules && <>; nenhuma skill passa de {rules.maxSkillPower}</>}. Depois podem vir status (atordoar, marcar...),
        bônus e mudanças de posição. Em cada efeito, “Em quem” pode mandar ele para quem usou (ex.: bate no inimigo e
        ganha escudo). Passe o mouse no ícone de info do Tipo para ver o que cada efeito faz.
      </StepIntro>
      <div className="space-y-5">
        <EffectsEditor effects={value.effects} onChange={(effects) => onChange({ ...value, effects })} specs={skillEffectSpecs} emptyText="A skill ainda não faz nada: adicione um efeito." />
        {value.effects.length > 0 && <PlayerText value={value} />}
      </div>
    </>
  )
}

/** As frases que o jogador lê na batalha, montadas dos dados (as mesmas do painel da skill). */
function PlayerText({ value }: { value: SkillBody }) {
  const effects = value.effects as unknown as SkillEffect[]
  return (
    <div className="space-y-1.5 rounded-control border border-line bg-bg/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">Como o jogador vai ler</p>
      <p className="text-sm font-medium text-fg">{describeTargeting(value)}</p>
      <ul className="space-y-1">
        {effects.map((e, i) => (
          <li key={i} className="flex gap-2 text-[13px] text-fg-muted">
            <span className="mt-1.5 size-1 shrink-0 bg-primary-soft" />
            {explainEffect(e)}
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap gap-x-3 font-mono text-[10px] text-fg-subtle">
        {skillFacts({ ...value, effects }).map((f) => (
          <span key={f}>{f}</span>
        ))}
      </p>
    </div>
  )
}

function CostStep({ value, onChange, reference, rules, catalog }: StepProps) {
  const inKit = value.kitClass !== null
  const awakened = !!catalog.variants.find((v) => v.key === value.variantKey)?.awakensFromKey

  const applyReference = () => {
    if (!reference) return
    let powered = false
    onChange({
      ...value,
      cooldown: reference.cooldown,
      desgastePercent: reference.desgastePercent,
      // skill do kit fica no nível 0 (o personagem nasce com ela)
      minLevel: inKit ? 0 : Math.max(value.minLevel, reference.minLevel),
      // o primeiro efeito de Poder recebe a referência
      effects: value.effects.map((e) => {
        if (powered || !POWER_EFFECTS.includes(e.type)) return e
        powered = true
        return { ...e, power: reference.power }
      }),
    })
  }

  return (
    <>
      <StepIntro title="Quanto ela custa">
        Toda skill tem um preço, para não ser usada toda vez. <b className="text-fg">Recarga</b>: quantas vezes do
        personagem até poder usar de novo (0 = sempre disponível). <b className="text-fg">Desgaste</b>: o cansaço de usar o
        poder; cada uso tira essa porcentagem do atributo da linhagem, e o personagem enfraquece ao longo da luta.{' '}
        <b className="text-fg">Nível mínimo</b>: a partir de que nível a skill pode ser oferecida ao personagem.
        <br />
        Na dúvida, clique em <b className="text-fg">Usar referência</b>: preenche tudo com os valores equilibrados do tipo,
        do alvo e da área escolhidos.
      </StepIntro>
      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <FormGrid cols={inKit ? 2 : 3}>
          <NumberField
            label="Recarga"
            value={value.cooldown}
            onChange={(v) => onChange({ ...value, cooldown: Math.round(v ?? 0) })}
            min={0}
            unit="turnos"
            hint={`Vezes do personagem até poder usar de novo.${reference ? ` Referência: ${reference.cooldown}.` : ''}`}
            required
          />
          <NumberField
            label="Desgaste"
            value={value.desgastePercent}
            onChange={(v) => onChange({ ...value, desgastePercent: v ?? 0 })}
            step={0.1}
            min={0}
            unit="%"
            hint={`Quanto cansa a cada uso.${reference ? ` Referência: ${reference.desgastePercent}%.` : ''}`}
            required
          />
          {!inKit && (
            <NumberField
              label="Nível mínimo"
              value={value.minLevel}
              onChange={(v) => onChange({ ...value, minLevel: Math.round(v ?? 0) })}
              min={0}
              max={100}
              hint={`De 0 a 100.${reference ? ` Referência: ${reference.minLevel}.` : ''}${awakened && rules ? ` Despertada: ${rules.awakenedMinLevel}+.` : ''}`}
              required
            />
          )}
        </FormGrid>
        <div className="space-y-2 rounded-card border border-primary/30 bg-primary-dim/40 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">Referência</p>
          {reference ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
              <dt className="text-fg-subtle">Poder</dt>
              <dd className="text-right text-fg">{reference.power}</dd>
              <dt className="text-fg-subtle">Desgaste</dt>
              <dd className="text-right text-fg">{reference.desgastePercent}%</dd>
              <dt className="text-fg-subtle">Recarga</dt>
              <dd className="text-right text-fg">{reference.cooldown}</dd>
              <dt className="text-fg-subtle">Nível</dt>
              <dd className="text-right text-fg">{inKit ? '0 (kit)' : reference.minLevel}</dd>
            </dl>
          ) : (
            <p className="text-xs text-fg-subtle">Carregando...</p>
          )}
          <Button size="sm" variant="secondary" className="w-full" onClick={applyReference} disabled={!reference}>
            <Wand2 className="size-3.5" /> Usar referência
          </Button>
          <p className="text-[11px] text-fg-subtle">Preenche recarga, Desgaste, nível e o Poder do primeiro Dano, Cura ou Escudo.</p>
        </div>
      </div>
      {inKit && <p className="mt-3 text-xs text-fg-subtle">Skill do kit: o nível mínimo é sempre 0 (o personagem já nasce com ela).</p>}
    </>
  )
}

function KitStep({ value, onChange, kit, ownerClass }: StepProps) {
  const inKit = value.kitClass !== null

  return (
    <>
      <StepIntro title="Como o personagem ganha">
        Há dois jeitos de um personagem ter uma skill. <b className="text-fg">Kit básico</b>: as 4 com que ele já nasce,
        uma de cada papel (Básica, Padrão, Função e Assinatura). <b className="text-fg">Por nível</b>: todas as outras; a
        cada 5 níveis ele recebe um bloco de skills sorteadas para escolher, entre as que já atingiram o nível mínimo.
      </StepIntro>
      {kit ? (
        <Note>
          Esta skill é do kit: papel <b className="text-fg">{value.kitSlot && kitSlotLabels[value.kitSlot]}</b>, classe{' '}
          <b className="text-fg">{classLabels[kit.characterClass]}</b> e nível 0.
        </Note>
      ) : (
        <div className="space-y-6">
          <ChoiceCards
            label="Como ganha"
            value={inKit ? 'KIT' : 'POOL'}
            onChange={(v) =>
              onChange(
                v === 'KIT'
                  ? { ...value, kitClass: ownerClass ?? 'VANGUARD', kitSlot: value.kitSlot ?? 'BASIC', minLevel: 0 }
                  : { ...value, kitClass: null, kitSlot: null },
              )
            }
            cols={2}
            required
            options={[
              { value: 'POOL', label: 'Por nível', description: 'Aparece nos blocos de skill a partir do nível mínimo. É o caso da maioria.' },
              { value: 'KIT', label: 'Kit básico', description: 'Uma das 4 com que o personagem nasce. Cada personagem tem exatamente uma de cada papel.' },
            ]}
          />
          {inKit && (
            <>
              <ChoiceCards
                label="Papel no kit"
                value={value.kitSlot}
                onChange={(v) => onChange({ ...value, kitSlot: v as SkillKitSlot })}
                cols={4}
                required
                options={(Object.keys(kitSlotText) as SkillKitSlot[]).map((s) => ({ value: s, label: kitSlotLabels[s], description: kitSlotText[s] }))}
              />
              <FormGrid>
                <SelectField
                  label="Classe do kit"
                  value={value.kitClass}
                  onChange={(v) => v && onChange({ ...value, kitClass: v as CharacterClass })}
                  options={Object.entries(classLabels).map(([v, l]) => ({ value: v, label: l }))}
                  hint={ownerClass ? `Precisa ser a do personagem dono (${classLabels[ownerClass]}).` : 'A classe do personagem dono.'}
                  required
                />
              </FormGrid>
            </>
          )}
        </div>
      )}
    </>
  )
}

function ReviewStep({ value, catalog, itemKey, problems, onGo }: StepProps & { problems: Record<StepId, string[]>; onGo: (id: StepId) => void }) {
  const variant = catalog.variants.find((v) => v.key === value.variantKey)
  const owner = catalog.templates.find((t) => itemKey.startsWith(`${t.key}:`))
  const rows: { id: StepId; label: string; value: ReactNode }[] = [
    { id: 'identity', label: 'Skill', value: `${value.name || '—'}${owner ? ` · de ${owner.name}` : ''}` },
    { id: 'variant', label: 'Variante', value: variant?.name ?? 'Nenhuma' },
    { id: 'tier', label: 'Força', value: tierLabels[value.tier] },
    { id: 'target', label: 'Alvo', value: describeTargeting(value) },
    { id: 'effects', label: 'Efeitos', value: value.effects.map((e) => skillEffectSpecs[e.type]?.label ?? e.type).join(', ') || 'Nenhum' },
    { id: 'cost', label: 'Custo', value: `recarga ${value.cooldown} · Desgaste ${value.desgastePercent}% · nível ${value.minLevel}` },
    { id: 'kit', label: 'Como ganha', value: value.kitSlot ? `Kit básico · ${kitSlotLabels[value.kitSlot]}` : 'Por nível' },
  ]

  return (
    <FormSection index="✓" title="Revisão" description="Confira tudo antes de salvar. Clique numa linha para voltar ao passo.">
      <ReviewList rows={rows} problems={problems} onGo={onGo} />
      {value.effects.length > 0 && <PlayerText value={value} />}
      <ReviewStatus steps={steps} problems={problems} />
    </FormSection>
  )
}

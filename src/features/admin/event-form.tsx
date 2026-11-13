import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { keyOptions, rarityLabels, toOptions, type EventBody, type EventStageBody, type FormProps, type Option, type Rarity } from '@/features/admin/admin-schema'
import { ChoiceCards, DateTimeField, FormGrid, FormSection, Note, NumberField, Segmented, SelectField, TextAreaField, TextField, Toggle } from '@/features/admin/form-fields'
import { ReviewList, ReviewStatus, StepIntro, Wizard } from '@/features/admin/wizard'
import { firstStep, type WizardStep } from '@/features/admin/wizard-steps'
import { beastGradeLabels } from '@/features/beasts/beast-labels'
import { fragmentLabels, fragmentTypes } from '@/features/economy/economy-labels'
import type { EventKind, EventModifier, EventRequirement, EventReward, EventSquadMode } from '@/features/events/event-api'
import { useRewardText } from '@/features/events/event-hooks'
import {
  eventKindLabels,
  eventKindOrder,
  eventKindText,
  formatDuration,
  modifierLabels,
  modifierText,
  requirementText,
  requirementTypeLabels,
  rewardTypeLabels,
  squadModeLabels,
  squadModeText,
} from '@/features/events/event-labels'
import { EventEmblem } from '@/features/events/event-ui'
import { classLabels, difficultyLabels, type AiDifficulty, type CharacterClass, type DangerLevel, type Lineage } from '@/features/game/game-api'
import { dangerLabels, lineageLabels } from '@/features/game/game-labels'

// Assistente do evento (D155, D156; ../origin-game/docs/events_brief.md 10). As checagens espelham `EventTemplate` e
// `catalogIntegrityError` do backend só para orientar; quem decide é o servidor.

type StepId = 'identity' | 'kind' | 'dates' | 'entry' | 'attempts' | 'rules' | 'stages' | 'rewards' | 'review'

const steps: WizardStep<StepId>[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'kind', title: 'Tipo' },
  { id: 'dates', title: 'Datas' },
  { id: 'entry', title: 'Requisitos', optional: true },
  { id: 'attempts', title: 'Tentativas e squad' },
  { id: 'rules', title: 'Campo e regras' },
  { id: 'stages', title: 'Etapas' },
  { id: 'rewards', title: 'Prêmios do evento', optional: true },
  { id: 'review', title: 'Revisão' },
]

// espelhos de constantes do servidor (level-curve, squad, battle-end), só para as dicas
const MAX_LEVEL = 100
const SQUAD_SIZE = 4
const EXHAUSTION_AFTER_ROUND = 3

/** Os limites de `GET /admin/options` (`rules.event.limits`), com os do servidor de hoje enquanto carrega. */
const fallbackLimits = { maxStages: 30, maxRewardsPerList: 10, maxRequirements: 10, maxAttempts: 100, maxCoins: 1_000_000, maxFragments: 500 }

const classes = Object.keys(classLabels) as CharacterClass[]
const dangers = Object.keys(dangerLabels) as DangerLevel[]
const rarities = Object.keys(rarityLabels) as Rarity[]

const newRequirement = (type: EventRequirement['type']): EventRequirement => {
  switch (type) {
    case 'MIN_LEVEL':
      return { type, level: 20 }
    case 'CLASS_COUNT':
      return { type, characterClass: 'SUPPORT', min: 1 }
    case 'LINEAGE':
      return { type, lineage: 'ELEMENTAL', min: 1 }
    case 'FAMILY':
      return { type, traitKey: '', min: 1 }
    case 'MIN_DANGER':
      return { type, level: 'CONTINUOUS' }
    case 'MAX_RARITY':
      return { type, rarity: 'C' }
  }
}

const newReward = (type: EventReward['type']): EventReward => {
  switch (type) {
    case 'COINS':
      return { type, amount: 100 }
    case 'FRAGMENTS':
      return { type, lineage: 'NONE', amount: 5 }
    case 'CHEST':
      return { type, tier: 'C' }
    case 'CHARACTER':
      return { type, templateKey: '' }
    case 'GEAR':
      return { type, gearKey: '' }
    case 'BEAST':
      return { type, beastKey: '' }
  }
}

const newModifier = (type: EventModifier['type']): EventModifier => {
  switch (type) {
    case 'LEVELED_STATS':
      return { type, level: 30 }
    case 'EARLY_EXHAUSTION':
      return { type, afterRound: 1 }
    case 'NO_HEALING':
    case 'EQUAL_SPEED':
      return { type }
  }
}

const modifierTypes: EventModifier['type'][] = ['LEVELED_STATS', 'EARLY_EXHAUSTION', 'NO_HEALING', 'EQUAL_SPEED']

/** Erro de uma lista de prêmios (espelho de `rewardsError` + as ligações do catálogo). */
function rewardsProblems(rewards: EventReward[], where: string, limits: typeof fallbackLimits, has: (kind: 'templates' | 'gear' | 'beasts', key: string) => boolean): string[] {
  const out: string[] = []
  if (rewards.length > limits.maxRewardsPerList) out.push(`${where}: no máximo ${limits.maxRewardsPerList} prêmios.`)
  rewards.forEach((r, i) => {
    const at = `${where}, prêmio ${i + 1}`
    if (r.type === 'COINS' && (r.amount < 1 || r.amount > limits.maxCoins)) out.push(`${at}: moeda de 1 a ${limits.maxCoins}.`)
    if (r.type === 'FRAGMENTS' && (r.amount < 1 || r.amount > limits.maxFragments)) out.push(`${at}: fragmentos de 1 a ${limits.maxFragments}.`)
    if (r.type === 'CHARACTER' && !has('templates', r.templateKey)) out.push(`${at}: escolha o personagem.`)
    if (r.type === 'GEAR' && !has('gear', r.gearKey)) out.push(`${at}: escolha o equipamento.`)
    if (r.type === 'BEAST' && !has('beasts', r.beastKey)) out.push(`${at}: escolha a besta.`)
  })
  return out
}

export function EventForm({ value, onChange, catalog, rules, isNew, onSubmit, saving }: FormProps<EventBody>) {
  const [step, setStep] = useState(firstStep(steps, isNew))
  const rewardText = useRewardText()
  const set = <K extends keyof EventBody>(field: K, v: EventBody[K]) => onChange({ ...value, [field]: v })
  const limits = rules?.event?.limits ?? fallbackLimits
  const capture = rules?.event?.huntCaptureChance
  const hunt = value.kind === 'HUNT'
  const boss = value.kind === 'UNIQUE_BOSS'

  const has = (kind: 'templates' | 'gear' | 'beasts' | 'npcSquads' | 'fields' | 'traits', key: string) => !!key && catalog[kind].some((i) => i.key === key)
  const huntBeasts = catalog.beasts.filter((b) => b.grade !== 'SACRED')
  const traitName = (key: string) => catalog.traits.find((t) => t.key === key)?.name ?? key

  /** Trocar o tipo ajusta o resto: o chefe é 1 etapa com 1 tentativa no evento; só a caça tem besta a capturar. */
  function setKind(kind: EventKind) {
    const next: EventBody = { ...value, kind }
    if (kind === 'UNIQUE_BOSS') {
      next.stages = value.stages.slice(0, 1)
      next.attemptLimit = { count: 1, per: 'EVENT' }
    }
    if (kind !== 'HUNT') next.stages = next.stages.map((s) => ({ ...s, captureBeastKey: null }))
    onChange(next)
  }

  const setStage = (i: number, patch: Partial<EventStageBody>) => set('stages', value.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const moveStage = (i: number, by: number) => {
    const list = [...value.stages]
    ;[list[i], list[i + by]] = [list[i + by], list[i]]
    set('stages', list)
  }
  const setRequirement = (i: number, r: EventRequirement) => set('requirements', value.requirements.map((q, j) => (j === i ? r : q)))
  const modifierOf = (type: EventModifier['type']) => value.modifiers.find((m) => m.type === type)
  const setModifier = (m: EventModifier) => set('modifiers', value.modifiers.map((x) => (x.type === m.type ? m : x)))
  const toggleModifier = (type: EventModifier['type'], on: boolean) =>
    set('modifiers', on ? [...value.modifiers, newModifier(type)] : value.modifiers.filter((m) => m.type !== type))

  // problemas (espelho do domínio)
  const problems: Record<StepId, string[]> = { identity: [], kind: [], dates: [], entry: [], attempts: [], rules: [], stages: [], rewards: [], review: [] }
  if (!value.name.trim()) problems.identity.push('Dê um nome ao evento.')

  const [announce, start, end] = [value.announceAt, value.startsAt, value.endsAt].map((d) => new Date(d).getTime())
  if ([announce, start, end].some(Number.isNaN)) problems.dates.push('Preencha as três datas.')
  else {
    if (announce > start) problems.dates.push('O anúncio vem antes (ou junto) do início.')
    if (start >= end) problems.dates.push('O fim vem depois do início: o evento sempre tem fim.')
  }

  if (value.requirements.length > limits.maxRequirements) problems.entry.push(`No máximo ${limits.maxRequirements} requisitos.`)
  value.requirements.forEach((r, i) => {
    if (r.type === 'MIN_LEVEL' && (r.level < 1 || r.level > MAX_LEVEL)) problems.entry.push(`Requisito ${i + 1}: nível de 1 a ${MAX_LEVEL}.`)
    if ('min' in r && (r.min < 1 || r.min > SQUAD_SIZE)) problems.entry.push(`Requisito ${i + 1}: quantidade de 1 a ${SQUAD_SIZE}.`)
    if (r.type === 'FAMILY' && !has('traits', r.traitKey)) problems.entry.push(`Requisito ${i + 1}: escolha o traço de família.`)
  })

  const limit = value.attemptLimit
  if (limit && (limit.count < 1 || limit.count > limits.maxAttempts)) problems.attempts.push(`Tentativas de 1 a ${limits.maxAttempts}.`)
  if (boss && (limit?.count !== 1 || limit.per !== 'EVENT')) problems.attempts.push('O chefe único tem uma tentativa só no evento (1, no evento).')

  if (value.fieldKey && !has('fields', value.fieldKey)) problems.rules.push('O campo escolhido não existe mais.')
  for (const m of value.modifiers) {
    if (m.type === 'LEVELED_STATS' && (m.level < 1 || m.level > MAX_LEVEL)) problems.rules.push(`Stats nivelados: nível de 1 a ${MAX_LEVEL}.`)
    if (m.type === 'EARLY_EXHAUSTION' && (m.afterRound < 0 || m.afterRound >= EXHAUSTION_AFTER_ROUND))
      problems.rules.push(`Exaustão mais cedo: depois da rodada 0 a ${EXHAUSTION_AFTER_ROUND - 1}.`)
  }
  if (value.kind === 'RESEARCH' && value.modifiers.length === 0 && !value.fieldKey) problems.rules.push('A pesquisa tem ao menos um modificador ou o campo fixo.')

  if (value.stages.length < 1 || value.stages.length > limits.maxStages) problems.stages.push(`De 1 a ${limits.maxStages} etapas.`)
  if (boss && value.stages.length !== 1) problems.stages.push('O chefe único é uma etapa só.')
  value.stages.forEach((s, i) => {
    if (!s.name.trim()) problems.stages.push(`Etapa ${i + 1}: dê um nome.`)
    if (!has('npcSquads', s.npcSquadKey)) problems.stages.push(`Etapa ${i + 1}: escolha o squad de NPC.`)
    if (hunt && !s.captureBeastKey) problems.stages.push(`Etapa ${i + 1}: na caça, toda etapa tem a besta a capturar.`)
    if (s.captureBeastKey && !huntBeasts.some((b) => b.key === s.captureBeastKey)) problems.stages.push(`Etapa ${i + 1}: a besta não existe ou é sagrada (sagrada só de chefe único).`)
    problems.stages.push(...rewardsProblems(s.rewards, `Etapa ${i + 1}`, limits, has))
  })

  problems.rewards.push(...rewardsProblems(value.completionRewards, 'Conclusão', limits, has), ...rewardsProblems(value.participationRewards, 'Participação', limits, has))
  if (value.kind === 'CHARACTER_LAUNCH' && ![...value.completionRewards, ...value.stages.flatMap((s) => s.rewards)].some((r) => r.type === 'CHARACTER'))
    problems.rewards.push('O lançamento dá o personagem: um prêmio "Personagem" na conclusão ou numa etapa.')

  const npcOptions = keyOptions(catalog.npcSquads, (n) => `${difficultyLabels[n.difficulty as AiDifficulty] ?? ''} · LV ${n.level ?? '?'}`)
  const attemptMode = !limit ? 'FREE' : limit.per

  return (
    <Wizard steps={steps} current={step} onStep={setStep} problems={problems} submitLabel={`${isNew ? 'Criar' : 'Salvar'} evento`} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="O que é o evento">
            Um <b className="text-fg">momento raro</b> que sempre tem fim. O jogador vê o evento a partir do anúncio, entra entre o início e o
            fim e joga as <b className="text-fg">etapas</b> em sequência, cada uma uma batalha contra um squad de NPC (com XP e loot normais).
          </StepIntro>
          <FormGrid>
            <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Torre do Eco" hint="O nome que o jogador vê." required />
            <div />
            <TextAreaField
              label="Descrição"
              value={value.description}
              onChange={(v) => set('description', v)}
              placeholder="Ex.: Cinco pisos de ecos do passado. Quem chega ao topo leva a Égide Cinzenta."
              hint="Opcional. O convite do evento."
            />
          </FormGrid>
        </>
      )}

      {step === 'kind' && (
        <>
          <StepIntro title="Que tipo de evento">
            O tipo muda as regras: o <b className="text-fg">chefe único</b> é uma etapa com uma tentativa só; a <b className="text-fg">caça</b> tem uma
            besta a capturar em cada etapa; a <b className="text-fg">pesquisa</b> precisa de um modificador ou de campo fixo; o{' '}
            <b className="text-fg">lançamento</b> dá um personagem.
          </StepIntro>
          <ChoiceCards
            label="Tipo"
            value={value.kind}
            onChange={(v) => setKind(v as EventKind)}
            cols={5}
            required
            options={eventKindOrder.map((k) => ({ value: k, label: eventKindLabels[k], description: eventKindText[k], extra: <EventEmblem kind={k} size="xs" /> }))}
          />
        </>
      )}

      {step === 'dates' && (
        <>
          <StepIntro title="Quando acontece">
            <b className="text-fg">Anúncio</b>: a partir daqui o jogador vê ("começa em..."), sem entrar. <b className="text-fg">Início</b> e{' '}
            <b className="text-fg">fim</b>: a janela em que dá para jogar. O que a pessoa venceu até o fim fica com ela.
          </StepIntro>
          <FormGrid cols={3}>
            <DateTimeField label="Anúncio" value={value.announceAt} onChange={(v) => set('announceAt', v)} required />
            <DateTimeField label="Início" value={value.startsAt} onChange={(v) => set('startsAt', v)} required />
            <DateTimeField label="Fim" value={value.endsAt} onChange={(v) => set('endsAt', v)} required />
          </FormGrid>
          <Note>
            As datas aparecem na hora deste aparelho e vão para o servidor em UTC.
            {!Number.isNaN(start) && !Number.isNaN(end) && end > start && (
              <>
                {' '}
                O evento fica aberto por <b className="text-fg">{formatDuration(end - start)}</b>
                {announce < start && <> e é anunciado {formatDuration(start - announce)} antes</>}.
              </>
            )}{' '}
            Mudar as datas vale na hora.
          </Note>
        </>
      )}

      {step === 'entry' && (
        <>
          <StepIntro title="Quem pode entrar" optional>
            Condições do <b className="text-fg">esquadrão</b>, conferidas a cada batalha do evento. "Todos" vale para cada um dos {SQUAD_SIZE}; "pelo
            menos" conta no esquadrão. Para "uma linhagem só", use Linhagem com {SQUAD_SIZE}. Sem requisitos, qualquer esquadrão entra.
          </StepIntro>
          <ul className="space-y-2">
            {value.requirements.map((r, i) => (
              <li key={i} className="flex flex-wrap items-end gap-3 rounded-control border border-line bg-bg/40 p-3">
                <span className="pb-2 font-mono text-[11px] text-primary-soft">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-44">
                  <SelectField
                    label="Requisito"
                    value={r.type}
                    onChange={(v) => v && setRequirement(i, newRequirement(v as EventRequirement['type']))}
                    options={toOptions(requirementTypeLabels)}
                    required
                  />
                </div>
                <RequirementFields requirement={r} onChange={(next) => setRequirement(i, next)} traitOptions={keyOptions(catalog.traits, (t) => String(t.category ?? ''))} />
                <p className="min-w-40 flex-1 pb-2.5 text-xs text-fg-muted">{requirementText(r, traitName)}</p>
                <Button variant="ghost" size="sm" aria-label={`Tirar o requisito ${i + 1}`} onClick={() => set('requirements', value.requirements.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          {value.requirements.length < limits.maxRequirements && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => set('requirements', [...value.requirements, newRequirement('MIN_LEVEL')])}>
              <Plus className="size-4" /> Requisito
            </Button>
          )}
        </>
      )}

      {step === 'attempts' && (
        <>
          <StepIntro title="Quantas vezes e com quem">
            A <b className="text-fg">tentativa</b> conta quando a batalha começa. Por dia, ela volta à meia-noite UTC. No{' '}
            <b className="text-fg">squad fixo</b>, os 4 personagens da primeira batalha ficam travados até o fim (a posição pode mudar).
          </StepIntro>
          <FormGrid>
            <Segmented
              label="Tentativas"
              value={attemptMode}
              onChange={(v) => set('attemptLimit', v === 'FREE' ? null : { count: limit?.count ?? 3, per: v as 'DAY' | 'EVENT' })}
              options={[
                { value: 'FREE', label: 'À vontade' },
                { value: 'DAY', label: 'Por dia' },
                { value: 'EVENT', label: 'No evento' },
              ]}
              required
            />
            {limit && (
              <NumberField
                label="Quantas"
                value={limit.count}
                onChange={(v) => set('attemptLimit', { ...limit, count: Math.max(1, Math.round(v ?? 1)) })}
                min={1}
                max={limits.maxAttempts}
                unit={limit.per === 'DAY' ? 'por dia' : 'no evento'}
                required
              />
            )}
          </FormGrid>
          {boss && <Note tone="warning">O chefe único tem sempre 1 tentativa no evento: perdeu, acabou.</Note>}
          <ChoiceCards
            label="Esquadrão"
            value={value.squadMode}
            onChange={(v) => set('squadMode', v as EventSquadMode)}
            cols={2}
            required
            options={(['FREE', 'FIXED'] as const).map((m) => ({ value: m, label: squadModeLabels[m], description: squadModeText[m] }))}
          />
        </>
      )}

      {step === 'rules' && (
        <>
          <StepIntro title="Onde e com que regras">
            O <b className="text-fg">campo fixo</b> vale em toda batalha do evento (vazio = sorteado, como no PvE). Os{' '}
            <b className="text-fg">modificadores</b> mudam a batalha para os dois lados e valem em qualquer tipo; a pesquisa precisa de pelo menos
            um (ou do campo fixo).
          </StepIntro>
          <FormGrid>
            <SelectField
              label="Campo"
              value={value.fieldKey}
              onChange={(v) => set('fieldKey', v)}
              options={keyOptions(catalog.fields)}
              emptyLabel="Sorteado"
              hint="Os campos do catálogo. Vazio = sorteado a cada batalha."
            />
          </FormGrid>
          <div className="mt-4 space-y-2">
            {modifierTypes.map((type) => {
              const m = modifierOf(type)
              return (
                <div key={type} className="space-y-3 rounded-control border border-line bg-bg/40 p-3">
                  <Toggle label={modifierLabels[type]} checked={!!m} onChange={(on) => toggleModifier(type, on)} hint={modifierText(newModifier(type))} />
                  {m?.type === 'LEVELED_STATS' && (
                    <NumberField label="Nível" value={m.level} onChange={(v) => setModifier({ ...m, level: Math.round(v ?? 1) })} min={1} max={MAX_LEVEL} hint="Os dois lados jogam com os stats deste nível." required />
                  )}
                  {m?.type === 'EARLY_EXHAUSTION' && (
                    <NumberField
                      label="Depois da rodada"
                      value={m.afterRound}
                      onChange={(v) => setModifier({ ...m, afterRound: Math.round(v ?? 0) })}
                      min={0}
                      max={EXHAUSTION_AFTER_ROUND - 1}
                      hint={`O normal é depois da rodada ${EXHAUSTION_AFTER_ROUND}. 0 = desde a primeira.`}
                      required
                    />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {step === 'stages' && (
        <>
          <StepIntro title="As batalhas, em ordem">
            Cada <b className="text-fg">etapa</b> é uma batalha contra um squad de NPC; só se joga a próxima depois de vencer a anterior, e perder não
            volta. O prêmio da etapa é pequeno perto do principal.
            {hunt && (
              <>
                {' '}
                Na caça, vencer rola a <b className="text-fg">captura</b> da besta da etapa
                {capture && (
                  <>
                    {' '}
                    ({(Object.keys(capture) as (keyof typeof capture)[]).map((g) => `${beastGradeLabels[g]} ${Math.round(capture[g] * 100)}%`).join(', ')}, +
                    {Math.round((rules?.event?.huntFailureBonus ?? 0) * 100)} por falha)
                  </>
                )}
                ; falhou, a etapa não conta. Sagradas não saem de caça.
              </>
            )}
          </StepIntro>
          <div className="space-y-4">
            {value.stages.map((s, i) => (
              <FormSection
                key={i}
                index={String(i + 1).padStart(2, '0')}
                title={s.name || `Etapa ${i + 1}`}
                actions={
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" aria-label="Subir" disabled={i === 0} onClick={() => moveStage(i, -1)}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label="Descer" disabled={i === value.stages.length - 1} onClick={() => moveStage(i, 1)}>
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Tirar a etapa ${i + 1}`} disabled={value.stages.length === 1} onClick={() => set('stages', value.stages.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                }
              >
                <FormGrid>
                  <TextField label="Nome" value={s.name} onChange={(v) => setStage(i, { name: v })} placeholder={`Ex.: Piso ${i + 1}`} required />
                  <SelectField label="Squad de NPC" value={s.npcSquadKey || null} onChange={(v) => setStage(i, { npcSquadKey: v ?? '' })} options={npcOptions} hint="O adversário desta etapa." required />
                  {hunt && (
                    <SelectField
                      label="Besta a capturar"
                      value={s.captureBeastKey}
                      onChange={(v) => setStage(i, { captureBeastKey: v })}
                      options={keyOptions(huntBeasts, (b) => beastGradeLabels[b.grade as keyof typeof beastGradeLabels])}
                      hint="Sem as sagradas (só de chefe único)."
                      required
                    />
                  )}
                </FormGrid>
                <div className="mt-4">
                  <RewardsEditor label="Prêmio da etapa" rewards={s.rewards} onChange={(rewards) => setStage(i, { rewards })} catalog={catalog} max={limits.maxRewardsPerList} />
                </div>
              </FormSection>
            ))}
          </div>
          {!boss && value.stages.length < limits.maxStages && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() =>
                set('stages', [
                  ...value.stages,
                  { name: `${value.kind === 'TOWER' ? 'Piso' : 'Etapa'} ${value.stages.length + 1}`, npcSquadKey: value.stages.at(-1)?.npcSquadKey ?? '', rewards: [], captureBeastKey: null },
                ])
              }
            >
              <Plus className="size-4" /> Etapa
            </Button>
          )}
        </>
      )}

      {step === 'rewards' && (
        <>
          <StepIntro title="O prêmio principal e o de participação" optional>
            <b className="text-fg">Conclusão</b>: quem vence a última etapa. <b className="text-fg">Participação</b>: a primeira batalha terminada no
            evento, vença ou perca (desistir não conta). Personagem repetido vira moeda; equipamento e besta sem espaço vão para a caixa de
            recompensas ({rules?.event?.rewardBoxDays ?? 14} dias).
          </StepIntro>
          <div className="space-y-5">
            <RewardsEditor label="Conclusão" rewards={value.completionRewards} onChange={(v) => set('completionRewards', v)} catalog={catalog} max={limits.maxRewardsPerList} />
            <RewardsEditor label="Participação" rewards={value.participationRewards} onChange={(v) => set('participationRewards', v)} catalog={catalog} max={limits.maxRewardsPerList} />
          </div>
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Evento', value: value.name || '—' },
              { id: 'kind', label: 'Tipo', value: eventKindLabels[value.kind] },
              {
                id: 'dates',
                label: 'Datas',
                value: [value.announceAt, value.startsAt, value.endsAt].map((d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })).join(' → '),
              },
              { id: 'entry', label: 'Requisitos', value: value.requirements.map((r) => requirementText(r, traitName)).join('; ') || 'Nenhum' },
              {
                id: 'attempts',
                label: 'Tentativas e squad',
                value: `${limit ? `${limit.count} ${limit.per === 'DAY' ? 'por dia' : 'no evento'}` : 'À vontade'} · ${squadModeLabels[value.squadMode]}`,
              },
              {
                id: 'rules',
                label: 'Campo e regras',
                value: [value.fieldKey ? `Campo ${catalog.fields.find((f) => f.key === value.fieldKey)?.name ?? value.fieldKey}` : 'Campo sorteado', ...value.modifiers.map((m) => modifierLabels[m.type])].join(', '),
              },
              { id: 'stages', label: 'Etapas', value: value.stages.map((s) => s.name || '—').join(', ') },
              {
                id: 'rewards',
                label: 'Prêmios',
                value:
                  [
                    value.completionRewards.length && `Conclusão: ${value.completionRewards.map(rewardText).join(', ')}`,
                    value.participationRewards.length && `Participação: ${value.participationRewards.map(rewardText).join(', ')}`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Só os das etapas',
              },
            ]}
          />
          <ReviewStatus steps={steps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

/** Os campos de cada tipo de requisito. */
function RequirementFields({ requirement: r, onChange, traitOptions }: { requirement: EventRequirement; onChange: (r: EventRequirement) => void; traitOptions: Option[] }) {
  const count = 'min' in r && (
    <div className="w-28">
      <NumberField label="Pelo menos" value={r.min} onChange={(v) => onChange({ ...r, min: Math.round(v ?? 1) })} min={1} max={SQUAD_SIZE} required />
    </div>
  )
  switch (r.type) {
    case 'MIN_LEVEL':
      return (
        <div className="w-32">
          <NumberField label="Nível" value={r.level} onChange={(v) => onChange({ ...r, level: Math.round(v ?? 1) })} min={1} max={MAX_LEVEL} required />
        </div>
      )
    case 'CLASS_COUNT':
      return (
        <>
          <div className="min-w-40">
            <SelectField label="Classe" value={r.characterClass} onChange={(v) => v && onChange({ ...r, characterClass: v as CharacterClass })} options={classes.map((c) => ({ value: c, label: classLabels[c] }))} required />
          </div>
          {count}
        </>
      )
    case 'LINEAGE':
      return (
        <>
          <div className="min-w-40">
            <SelectField label="Linhagem" value={r.lineage} onChange={(v) => v && onChange({ ...r, lineage: v as Lineage })} options={toOptions(lineageLabels)} required />
          </div>
          {count}
        </>
      )
    case 'FAMILY':
      return (
        <>
          <div className="min-w-56">
            <SelectField label="Traço de família" value={r.traitKey || null} onChange={(v) => onChange({ ...r, traitKey: v ?? '' })} options={traitOptions} required />
          </div>
          {count}
        </>
      )
    case 'MIN_DANGER':
      return (
        <div className="min-w-44">
          <SelectField label="Periculosidade" value={r.level} onChange={(v) => v && onChange({ ...r, level: v as DangerLevel })} options={dangers.map((d) => ({ value: d, label: dangerLabels[d] }))} required />
        </div>
      )
    case 'MAX_RARITY':
      return (
        <div className="w-28">
          <SelectField label="Raridade" value={r.rarity} onChange={(v) => v && onChange({ ...r, rarity: v as Rarity })} options={rarities.map((x) => ({ value: x, label: x }))} required />
        </div>
      )
  }
}

/** Lista de prêmios: o tipo e o que ele pede (quantidade, fragmento, nível do baú ou o item do catálogo). */
function RewardsEditor({ label, rewards, onChange, catalog, max }: {
  label: string
  rewards: EventReward[]
  onChange: (rewards: EventReward[]) => void
  catalog: FormProps<EventBody>['catalog']
  max: number
}) {
  const set = (i: number, r: EventReward) => onChange(rewards.map((x, j) => (j === i ? r : x)))
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">{label}</p>
      {rewards.length === 0 && <p className="text-xs text-fg-subtle">Sem prêmio.</p>}
      <ul className="space-y-2">
        {rewards.map((r, i) => (
          <li key={i} className="flex flex-wrap items-end gap-3 rounded-control border border-line bg-bg/40 p-3">
            <div className="w-40">
              <SelectField label="Prêmio" value={r.type} onChange={(v) => v && set(i, newReward(v as EventReward['type']))} options={toOptions(rewardTypeLabels)} required />
            </div>
            {r.type === 'COINS' && (
              <div className="w-36">
                <NumberField label="Quantia" value={r.amount} onChange={(v) => set(i, { ...r, amount: Math.round(v ?? 0) })} min={1} unit="M" required />
              </div>
            )}
            {r.type === 'FRAGMENTS' && (
              <>
                <div className="min-w-40">
                  <SelectField label="Fragmento" value={r.lineage} onChange={(v) => v && set(i, { ...r, lineage: v as Lineage })} options={fragmentTypes.map((t) => ({ value: t, label: fragmentLabels[t] }))} required />
                </div>
                <div className="w-28">
                  <NumberField label="Quantos" value={r.amount} onChange={(v) => set(i, { ...r, amount: Math.round(v ?? 0) })} min={1} required />
                </div>
              </>
            )}
            {r.type === 'CHEST' && (
              <div className="w-28">
                <SelectField label="Baú" value={r.tier} onChange={(v) => v && set(i, { ...r, tier: v as Rarity })} options={rarities.map((x) => ({ value: x, label: x }))} required />
              </div>
            )}
            {r.type === 'CHARACTER' && (
              <div className="min-w-64 flex-1">
                <SelectField
                  label="Personagem"
                  value={r.templateKey || null}
                  onChange={(v) => set(i, { ...r, templateKey: v ?? '' })}
                  options={keyOptions(catalog.templates, (t) => `${t.rarity ?? ''}${t.exclusivity && t.exclusivity !== 'NONE' ? ' · exclusivo' : ''}`)}
                  hint="Repetido vira moeda pela raridade."
                  required
                />
              </div>
            )}
            {r.type === 'GEAR' && (
              <div className="min-w-64 flex-1">
                <SelectField label="Equipamento" value={r.gearKey || null} onChange={(v) => set(i, { ...r, gearKey: v ?? '' })} options={keyOptions(catalog.gear, (g) => String(g.grade ?? ''))} hint="Sem espaço, vai para a caixa de recompensas." required />
              </div>
            )}
            {r.type === 'BEAST' && (
              <div className="min-w-64 flex-1">
                <SelectField label="Besta" value={r.beastKey || null} onChange={(v) => set(i, { ...r, beastKey: v ?? '' })} options={keyOptions(catalog.beasts, (b) => String(b.grade ?? ''))} hint="Sem espaço, vai para a caixa de recompensas." required />
              </div>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" aria-label={`Tirar o prêmio ${i + 1}`} onClick={() => onChange(rewards.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      {rewards.length < max && (
        <Button variant="secondary" size="sm" onClick={() => onChange([...rewards, newReward('COINS')])}>
          <Plus className="size-4" /> Prêmio
        </Button>
      )}
    </div>
  )
}

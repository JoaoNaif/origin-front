import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminOptions } from '@/features/admin/admin-api'
import type { FormProps, GearBody } from '@/features/admin/admin-schema'
import { ChoiceCards, FormGrid, FormSection, MultiPick, Note, NumberField, Segmented, SelectField, TextAreaField, TextField } from '@/features/admin/form-fields'
import { ReviewList, ReviewStatus, StepIntro, Wizard } from '@/features/admin/wizard'
import { firstStep, type WizardStep } from '@/features/admin/wizard-steps'
import { formatCoins } from '@/features/economy/economy-labels'
import type { Stat } from '@/features/game/game-api'
import { lineageLabels, statLabels, statOrder } from '@/features/game/game-labels'
import { useGearRules, type GearGrade, type GearLineage } from '@/features/gear/gear-api'
import { fmt, gradeLabels, gradeOrder, kindLabels, lineageCostTarget, passiveLabels, passiveText, requirementLevelLabels } from '@/features/gear/gear-labels'
import { GearEmblem } from '@/features/gear/gear-ui'

// Assistente do equipamento vivo (D153, ../origin-game/docs/living_gear_brief.md 10). As checagens espelham
// `GearTemplate.create` do backend só para orientar; quem decide é o servidor.

type StepId = 'identity' | 'grade' | 'lineage' | 'bonus' | 'requirements' | 'titles' | 'review'

const steps: WizardStep<StepId>[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'grade', title: 'Grau' },
  { id: 'lineage', title: 'Linhagem e passiva' },
  { id: 'bonus', title: 'Bônus' },
  { id: 'requirements', title: 'Requisitos do elo' },
  { id: 'titles', title: 'Títulos' },
  { id: 'review', title: 'Revisão' },
]

const lineages: GearLineage[] = ['FUNDAMENTAL', 'ELEMENTAL', 'MATERIAL', 'VECTORIAL', 'PSYCHIC', 'BIOLOGICAL']

/** A partir do Mestre, pelo menos 1 requisito "baixo" (espelho de `GEAR_LOW_REQUIRED_FROM`). */
const LOW_REQUIRED_FROM: GearGrade = 'MASTER'
/** No máximo 2 altos e 2 baixos (alto e baixo são os 2 maiores e os 2 menores). */
const MAX_PER_LEVEL = 2

export function GearForm({ value, onChange, rules, isNew, onSubmit, saving }: FormProps<GearBody>) {
  const [step, setStep] = useState(firstStep(steps, isNew))
  const options = useAdminOptions()
  const gearRules = useGearRules()
  const titles = (options.data?.titles as string[] | undefined) ?? []
  const set = <K extends keyof GearBody>(field: K, v: GearBody[K]) => onChange({ ...value, [field]: v })
  const setPercent = (field: 'primaryPercent' | 'secondaryPercent', v: number | null) => {
    const next = { ...value }
    if (v === null) delete next[field]
    else next[field] = v
    onChange(next)
  }

  const r = rules?.gear
  const base = r?.statPercents[value.grade]
  const tuning = r?.adminTuning ?? 0
  const range = (n: number) => `${fmt(n * (1 - tuning))}% a ${fmt(n * (1 + tuning))}%`
  const within = (v: number | undefined, n: number | undefined) => v === undefined || n === undefined || Math.abs(v - n) <= n * tuning + 1e-9
  const count = r?.requirementCount[value.grade]
  const gradeInfo = gearRules.data?.gearRules.grades.find((g) => g.grade === value.grade)
  const passives = gearRules.data?.gearRules.lineagePassives
  const reqs = value.requirements

  // problemas (espelho do domínio)
  const problems: Record<StepId, string[]> = { identity: [], grade: [], lineage: [], bonus: [], requirements: [], titles: [], review: [] }
  if (!value.name.trim()) problems.identity.push('Dê um nome ao equipamento.')
  if (value.primaryStat === value.secondaryStat) problems.bonus.push('Os dois bônus precisam ser em atributos diferentes.')
  if (base && (!within(value.primaryPercent, base.primary) || !within(value.secondaryPercent, base.secondary)))
    problems.bonus.push(`No ${gradeLabels[value.grade]}, o principal vai de ${range(base.primary)} e o secundário de ${range(base.secondary)}.`)
  if (count !== undefined && reqs.length !== count) problems.requirements.push(`O ${gradeLabels[value.grade]} pede ${count} requisitos (tem ${reqs.length}).`)
  if (new Set(reqs.map((q) => q.stat)).size !== reqs.length) problems.requirements.push('Cada atributo aparece uma vez só.')
  for (const level of ['HIGH', 'LOW'] as const) {
    const n = reqs.filter((q) => q.level === level).length
    if (n > MAX_PER_LEVEL) problems.requirements.push(`No máximo ${MAX_PER_LEVEL} requisitos "${requirementLevelLabels[level]}" (tem ${n}).`)
  }
  if (gradeOrder.indexOf(value.grade) >= gradeOrder.indexOf(LOW_REQUIRED_FROM) && !reqs.some((q) => q.level === 'LOW'))
    problems.requirements.push(`Do ${gradeLabels[LOW_REQUIRED_FROM]} para cima, pelo menos 1 requisito "baixo".`)
  if (r && (value.titles.length < r.titles.min || value.titles.length > r.titles.max))
    problems.titles.push(`Escolha de ${r.titles.min} a ${r.titles.max} títulos (tem ${value.titles.length}).`)

  const setReq = (i: number, patch: Partial<GearBody['requirements'][number]>) => set('requirements', reqs.map((q, j) => (j === i ? { ...q, ...patch } : q)))
  const freeStat = statOrder.find((s) => !reqs.some((q) => q.stat === s))
  const statOptions = statOrder.map((s) => ({ value: s, label: statLabels[s] }))
  const percentText = (field: 'primaryPercent' | 'secondaryPercent', key: 'primary' | 'secondary') => `${fmt(value[field] ?? base?.[key] ?? 0)}%`

  return (
    <Wizard steps={steps} current={step} onStep={setStep} problems={problems} submitLabel={`${isNew ? 'Criar' : 'Salvar'} equipamento`} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="O que é o equipamento vivo">
            Uma <b className="text-fg">arma ou armadura</b> feita de minério vivo, com vontade própria. O jogador ganha uma
            cópia (de baú ou dada pelo admin) e escolhe quem usa: <b className="text-fg">um por personagem</b>. Com elo pleno,
            dá bônus e uma passiva; sem elo, cobra caro na batalha. Arma e armadura funcionam igual e dividem o mesmo slot.
          </StepIntro>
          <FormGrid>
            <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Lâmina de Brasa" hint="O nome que o jogador vê." required />
            <div />
            <TextAreaField
              label="Descrição"
              value={value.description}
              onChange={(v) => set('description', v)}
              placeholder="Ex.: Ferro com um fio de fogo preso dentro: aquece a cada golpe."
              hint="Opcional. O minério e o que mora nele."
            />
          </FormGrid>
          <div className="mt-5">
            <ChoiceCards
              label="Tipo"
              value={value.kind}
              onChange={(v) => set('kind', v as GearBody['kind'])}
              cols={2}
              required
              options={[
                { value: 'WEAPON', label: kindLabels.WEAPON, description: 'Espada, lança, arco... Só muda o ícone e o nome.' },
                { value: 'ARMOR', label: kindLabels.ARMOR, description: 'Couraça, manto, elmo... Mesmo slot da arma.' },
              ]}
            />
          </div>
        </>
      )}

      {step === 'grade' && (
        <>
          <StepIntro title="Quão forte ele é">
            O <b className="text-fg">grau</b> é fixo no modelo e decide tudo de uma vez: o bônus, quantos requisitos o elo pede, o
            custo do elo pleno, o tamanho da queda sem elo, a raridade em que ele sai do baú e o preço de venda. O{' '}
            <b className="text-fg">Divino</b> nunca sai de baú nem se vende: só o admin dá (evento único).
          </StepIntro>
          <ChoiceCards
            label="Grau"
            value={value.grade}
            onChange={(v) => set('grade', v as GearGrade)}
            cols={5}
            required
            options={gradeOrder.map((g) => {
              const info = gearRules.data?.gearRules.grades.find((x) => x.grade === g)
              return {
                value: g,
                label: gradeLabels[g],
                description: info
                  ? `+${fmt(info.statPercents.primary)}% / +${fmt(info.statPercents.secondary)}% · ${info.requirements} requisitos · ${info.rarity ? `baú ${info.rarity} · ${formatCoins(info.saleValue ?? 0)} M` : 'fora do baú'}`
                  : '',
                extra: <GearEmblem kind={value.kind} grade={g} size="xs" />,
              }
            })}
          />
          {count !== undefined && reqs.length !== count && (
            <Note tone="warning">Este grau pede {count} requisitos e o equipamento tem {reqs.length}: ajuste no passo "Requisitos do elo".</Note>
          )}
        </>
      )}

      {step === 'lineage' && (
        <>
          <StepIntro title="Qual poder mora no minério">
            A <b className="text-fg">linhagem</b> é a da variante que habita o material (nunca "sem linhagem"). Ela decide a{' '}
            <b className="text-fg">passiva</b> e onde cai o custo do elo pleno (o Desgaste da linhagem). Os números abaixo são os do
            Rei com elo pleno; cada grau multiplica
            {gradeInfo && <> (o {gradeLabels[value.grade]}, ×{fmt(gradeInfo.passiveFactor)})</>}.
          </StepIntro>
          <ChoiceCards
            label="Linhagem"
            value={value.lineage}
            onChange={(v) => set('lineage', v as GearLineage)}
            cols={3}
            required
            options={lineages.map((l) => ({
              value: l,
              label: `${lineageLabels[l]}${passives ? ` · ${passiveLabels[passives[l].type]}` : ''}`,
              description: `${passives ? `${passiveText(passives[l])}. ` : ''}Custo no ${lineageCostTarget[l]}.`,
            }))}
          />
        </>
      )}

      {step === 'bonus' && (
        <>
          <StepIntro title="Quais atributos ele dá">
            Com elo pleno, o equipamento dá <b className="text-fg">dois bônus</b>: um principal e um secundário, em atributos
            diferentes, fora do teto dos traços. Deixe vazio para o padrão do grau
            {base && (
              <>
                {' '}
                (<b className="text-fg">{fmt(base.primary)}%</b> e <b className="text-fg">{fmt(base.secondary)}%</b>)
              </>
            )}
            ; dá para ajustar até ±{fmt(tuning * 100)}%. O elo parcial e o sem elo rendem menos.
          </StepIntro>
          <FormGrid cols={4}>
            <SelectField label="Atributo principal" value={value.primaryStat} onChange={(v) => v && set('primaryStat', v as Stat)} options={statOptions} required />
            <NumberField
              label="Bônus principal"
              value={value.primaryPercent}
              onChange={(v) => setPercent('primaryPercent', v)}
              step={0.1}
              unit="%"
              allowEmpty
              placeholder={base ? String(base.primary) : undefined}
              hint={base && `Vazio = ${fmt(base.primary)}%. Faixa: ${range(base.primary)}.`}
            />
            <SelectField label="Atributo secundário" value={value.secondaryStat} onChange={(v) => v && set('secondaryStat', v as Stat)} options={statOptions} required />
            <NumberField
              label="Bônus secundário"
              value={value.secondaryPercent}
              onChange={(v) => setPercent('secondaryPercent', v)}
              step={0.1}
              unit="%"
              allowEmpty
              placeholder={base ? String(base.secondary) : undefined}
              hint={base && `Vazio = ${fmt(base.secondary)}%. Faixa: ${range(base.secondary)}.`}
            />
          </FormGrid>
        </>
      )}

      {step === 'requirements' && (
        <>
          <StepIntro title="Com quem ele se dá bem">
            Os <b className="text-fg">requisitos</b> decidem o elo. "Alto" = o atributo está entre os 2 maiores do portador (em
            relação à média das classes); "baixo" = entre os 2 menores. Todos cumpridos = elo pleno; metade ou mais = parcial;
            menos = sem elo. O {gradeLabels[value.grade]} pede <b className="text-fg">{count ?? '?'}</b>, sem repetir atributo, no
            máximo {MAX_PER_LEVEL} altos e {MAX_PER_LEVEL} baixos
            {gradeOrder.indexOf(value.grade) >= gradeOrder.indexOf(LOW_REQUIRED_FROM) && ', com pelo menos 1 baixo'}. Combine com o
            bônus: uma lâmina de Ataque pede Ataque alto.
          </StepIntro>
          <ul className="space-y-2">
            {reqs.map((q, i) => (
              <li key={i} className="flex flex-wrap items-end gap-3 rounded-control border border-line bg-bg/40 p-3">
                <span className="pb-2 font-mono text-[11px] text-primary-soft">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-48 flex-1">
                  <SelectField label="Atributo" value={q.stat} onChange={(v) => v && setReq(i, { stat: v as Stat })} options={statOptions} required />
                </div>
                <Segmented
                  label="Nível"
                  value={q.level}
                  onChange={(v) => setReq(i, { level: v as 'HIGH' | 'LOW' })}
                  options={[
                    { value: 'HIGH', label: 'Alto' },
                    { value: 'LOW', label: 'Baixo' },
                  ]}
                  required
                />
                <Button variant="ghost" size="sm" aria-label={`Tirar ${statLabels[q.stat]}`} onClick={() => set('requirements', reqs.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          {freeStat && (count === undefined || reqs.length < count) && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => set('requirements', [...reqs, { stat: freeStat, level: 'HIGH' }])}>
              <Plus className="size-4" /> Requisito
            </Button>
          )}
        </>
      )}

      {step === 'titles' && (
        <>
          <StepIntro title="Quem ele respeita">
            Um <b className="text-fg">título</b> da lista vale 1 requisito cumprido para quem o tem (o traço Prodígio também, com
            teto de 1 somando os dois). Hoje os títulos são os do DOM avançado.
            {r && (
              <>
                {' '}
                Escolha de <b className="text-fg">{r.titles.min} a {r.titles.max}</b>.
              </>
            )}
          </StepIntro>
          {titles.length === 0 ? (
            <p className="text-xs text-fg-subtle">Carregando os títulos...</p>
          ) : (
            <MultiPick
              label="Títulos"
              values={value.titles}
              onChange={(v) => set('titles', v)}
              options={titles.map((t) => ({ value: t, label: t }))}
              max={r?.titles.max}
              required
            />
          )}
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Equipamento', value: `${value.name || '—'} · ${kindLabels[value.kind]}` },
              { id: 'grade', label: 'Grau', value: gradeLabels[value.grade] },
              { id: 'lineage', label: 'Linhagem', value: `${lineageLabels[value.lineage]}${passives ? ` · ${passiveLabels[passives[value.lineage].type]}` : ''}` },
              {
                id: 'bonus',
                label: 'Bônus',
                value: `+${percentText('primaryPercent', 'primary')} ${statLabels[value.primaryStat]} · +${percentText('secondaryPercent', 'secondary')} ${statLabels[value.secondaryStat]}`,
              },
              { id: 'requirements', label: 'Requisitos', value: reqs.map((q) => `${statLabels[q.stat]} ${requirementLevelLabels[q.level]}`).join(', ') || '—' },
              { id: 'titles', label: 'Títulos', value: value.titles.join(', ') || 'Nenhum' },
            ]}
          />
          <ReviewStatus steps={steps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

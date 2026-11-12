import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminOptions } from '@/features/admin/admin-api'
import { lineageText, newBeastSkill, skillEffectSpecs, toOptions, type BeastBody, type BeastSkillBody, type FormProps } from '@/features/admin/admin-schema'
import { EffectsEditor } from '@/features/admin/effects-editor'
import { ChoiceCards, FormGrid, FormSection, MultiPick, Note, NumberField, Segmented, SelectField, TextAreaField, TextField } from '@/features/admin/form-fields'
import { ReviewList, ReviewStatus, StepIntro, Wizard } from '@/features/admin/wizard'
import { firstStep, type WizardStep } from '@/features/admin/wizard-steps'
import { useBeastRules, type BeastContract, type BeastGrade } from '@/features/beasts/beast-api'
import { beastGradeLabels, beastGradeOrder, contractLabels, contractOrder, contractText } from '@/features/beasts/beast-labels'
import { BeastEmblem } from '@/features/beasts/beast-ui'
import { formatCoins } from '@/features/economy/economy-labels'
import type { SkillArea, SkillRange, SkillTarget, SkillTier, Stat } from '@/features/game/game-api'
import { areaLabels, lineageLabels, rangeLabels, statLabels, statOrder, targetLabels, tierLabels } from '@/features/game/game-labels'
import type { GearLineage } from '@/features/gear/gear-api'
import { fmt, requirementLevelLabels } from '@/features/gear/gear-labels'

// Assistente da besta (D154, ../origin-game/docs/beast_contracts_brief.md 10). As checagens espelham `BeastTemplate`
// do backend só para orientar; quem decide é o servidor.

type StepId = 'identity' | 'contract' | 'grade' | 'lineage' | 'skills' | 'requirements' | 'titles' | 'review'

const lineages: GearLineage[] = ['FUNDAMENTAL', 'ELEMENTAL', 'MATERIAL', 'VECTORIAL', 'PSYCHIC', 'BIOLOGICAL']

/** A besta não usa recuperar nem trocar o campo (D154). */
const beastEffectSpecs = Object.fromEntries(Object.entries(skillEffectSpecs).filter(([type]) => type !== 'RECOVER' && type !== 'CHANGE_FIELD'))

/** A partir do Mestre, pelo menos 1 requisito "baixo"; no máximo 2 altos e 2 baixos (régua do equipamento). */
const LOW_REQUIRED_FROM: BeastGrade = 'MASTER'
const MAX_PER_LEVEL = 2

export function BeastForm({ value, onChange, rules, isNew, onSubmit, saving }: FormProps<BeastBody>) {
  const [step, setStep] = useState(firstStep(stepsOf(value.contract), isNew))
  const options = useAdminOptions()
  const beastRules = useBeastRules()
  const titles = (options.data?.titles as string[] | undefined) ?? []
  const set = <K extends keyof BeastBody>(field: K, v: BeastBody[K]) => onChange({ ...value, [field]: v })

  const steps = stepsOf(value.contract)
  const master = value.contract === 'MASTER'
  const equality = value.contract === 'EQUALITY'
  const skillCount = rules?.beast?.skillCount ?? 2
  const reqCount = rules?.beast?.masterRequirementCount[value.grade]
  const reqs = value.requirements ?? []
  const gradeInfo = (g: BeastGrade) => beastRules.data?.beastRules.grades.find((x) => x.grade === g)

  /** Trocar o contrato ajusta o resto: a Igualdade não tem skills; só o Mestre tem requisitos e títulos. */
  function setContract(contract: BeastContract) {
    const next: BeastBody = { ...value, contract }
    if (contract === 'EQUALITY') next.skills = []
    else if (next.skills.length === 0) next.skills = [newBeastSkill('Golpe', 0.8, 0), newBeastSkill('Investida', 1.2, 2)]
    if (contract === 'MASTER') {
      next.requirements = value.requirements ?? []
      next.titles = value.titles ?? []
    } else {
      delete next.requirements
      delete next.titles
    }
    onChange(next)
  }

  const setSkill = (i: number, patch: Partial<BeastSkillBody>) => set('skills', value.skills.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const setReq = (i: number, patch: Partial<NonNullable<BeastBody['requirements']>[number]>) =>
    set('requirements', reqs.map((q, j) => (j === i ? { ...q, ...patch } : q)))

  // problemas (espelho do domínio)
  const problems: Record<StepId, string[]> = { identity: [], contract: [], grade: [], lineage: [], skills: [], requirements: [], titles: [], review: [] }
  if (!value.name.trim()) problems.identity.push('Dê um nome à besta.')
  if (!equality && value.skills.length !== skillCount) problems.skills.push(`Dominância e Mestre têm ${skillCount} skills em campo (tem ${value.skills.length}).`)
  value.skills.forEach((s, i) => {
    if (!s.name.trim()) problems.skills.push(`Dê um nome à skill ${i + 1}.`)
    if (s.effects.length === 0) problems.skills.push(`A skill ${i + 1} precisa de pelo menos 1 efeito.`)
  })
  if (master) {
    if (reqCount !== undefined && reqs.length !== reqCount) problems.requirements.push(`O ${beastGradeLabels[value.grade]} pede ${reqCount} requisitos (tem ${reqs.length}).`)
    if (new Set(reqs.map((q) => q.stat)).size !== reqs.length) problems.requirements.push('Cada atributo aparece uma vez só.')
    for (const level of ['HIGH', 'LOW'] as const) {
      const n = reqs.filter((q) => q.level === level).length
      if (n > MAX_PER_LEVEL) problems.requirements.push(`No máximo ${MAX_PER_LEVEL} requisitos "${requirementLevelLabels[level]}" (tem ${n}).`)
    }
    if (beastGradeOrder.indexOf(value.grade) >= beastGradeOrder.indexOf(LOW_REQUIRED_FROM) && !reqs.some((q) => q.level === 'LOW'))
      problems.requirements.push(`Do ${beastGradeLabels[LOW_REQUIRED_FROM]} para cima, pelo menos 1 requisito "baixo".`)
  }

  const statOptions = statOrder.map((s) => ({ value: s, label: statLabels[s] }))
  const freeStat = statOrder.find((s) => !reqs.some((q) => q.stat === s))

  return (
    <Wizard steps={steps} current={step} onStep={setStep} problems={problems} submitLabel={`${isNew ? 'Criar' : 'Salvar'} besta`} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="O que é a besta">
            Uma criatura que se liga a um personagem por <b className="text-fg">contrato</b>. A invocação toma um slot da build; na
            batalha, gasta a ação inteira e põe a besta em campo (ou, na Igualdade, vira um escudo no dono). Não sai de baú: o admin dá a
            besta na aba Contas.
          </StepIntro>
          <FormGrid>
            <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Lobo de Cinzas" hint="O nome que o jogador vê." required />
            <div />
            <TextAreaField
              label="Descrição"
              value={value.description}
              onChange={(v) => set('description', v)}
              placeholder="Ex.: Nasceu do incêndio da Floresta Velha e ainda cheira a fumaça."
              hint="Opcional. Quem é a besta."
            />
          </FormGrid>
        </>
      )}

      {step === 'contract' && (
        <>
          <StepIntro title="Como ela ajuda">
            O <b className="text-fg">contrato</b> vem fixo na besta e muda tudo: quem joga com ela, o que custa e se ela entra em campo.
          </StepIntro>
          <ChoiceCards
            label="Contrato"
            value={value.contract}
            onChange={(v) => setContract(v as BeastContract)}
            cols={3}
            required
            options={contractOrder.map((c) => ({ value: c, label: contractLabels[c], description: contractText[c] }))}
          />
        </>
      )}

      {step === 'grade' && (
        <>
          <StepIntro title="Quão forte ela é">
            O <b className="text-fg">grau</b> fixa a força (em % dos atributos do dono), o custo da Dominância, o escudo da Igualdade, os
            requisitos do Mestre e o preço de venda. A <b className="text-fg">Sagrada</b> é ×1,25 do Rei, não se vende e cada personagem
            só tem uma.
          </StepIntro>
          <ChoiceCards
            label="Grau"
            value={value.grade}
            onChange={(v) => set('grade', v as BeastGrade)}
            cols={5}
            required
            options={beastGradeOrder.map((g) => {
              const info = gradeInfo(g)
              const detail = !info
                ? ''
                : value.contract === 'EQUALITY'
                  ? `escudo ${fmt(info.equality.bufferPercent)}% · +${fmt(info.equality.bonusPercent)}%`
                  : value.contract === 'DOMINANCE'
                    ? `${fmt(info.statPercent.DOMINANCE)}% dos stats · −${fmt(info.dominanceWillCost)}% Vontade`
                    : `${fmt(info.statPercent.MASTER)}% dos stats · ${info.masterRequirements} requisitos`
              return {
                value: g,
                label: beastGradeLabels[g],
                description: `${detail}${info ? ` · ${info.saleValue !== null ? `${formatCoins(info.saleValue)} M` : 'não se vende'}` : ''}`,
                extra: <BeastEmblem grade={g} contract={value.contract} size="xs" />,
              }
            })}
          />
          {master && reqCount !== undefined && reqs.length !== reqCount && (
            <Note tone="warning">Este grau pede {reqCount} requisitos e a besta tem {reqs.length}: ajuste no passo "Requisitos".</Note>
          )}
        </>
      )}

      {step === 'lineage' && (
        <>
          <StepIntro title="De que poder ela nasceu">
            A <b className="text-fg">linhagem</b> da besta (nunca "sem linhagem"). Aparece no catálogo e nas skills dela; a besta não
            paga Desgaste.
          </StepIntro>
          <ChoiceCards
            label="Linhagem"
            value={value.lineage}
            onChange={(v) => set('lineage', v as GearLineage)}
            cols={3}
            required
            options={lineages.map((l) => ({ value: l, label: lineageLabels[l], description: lineageText[l].what }))}
          />
        </>
      )}

      {step === 'skills' && (
        <>
          <StepIntro title="O que ela faz em campo">
            Dominância e Mestre têm <b className="text-fg">{skillCount} skills</b> próprias, com as mesmas regras da skill do catálogo
            (alvo, alcance, Poder, efeitos), mas <b className="text-fg">sem Desgaste</b> e sem recuperar nem trocar o campo. Na Dominância,
            a máquina escolhe entre elas; no Mestre, o jogador.
          </StepIntro>
          <div className="space-y-4">
            {value.skills.map((s, i) => (
              <FormSection
                key={i}
                index={String(i + 1).padStart(2, '0')}
                title={s.name || `Skill ${i + 1}`}
                actions={
                  <Button variant="ghost" size="sm" aria-label={`Tirar a skill ${i + 1}`} onClick={() => set('skills', value.skills.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                }
              >
                <FormGrid cols={3}>
                  <TextField label="Nome" value={s.name} onChange={(v) => setSkill(i, { name: v })} placeholder="Ex.: Mordida" required />
                  <SelectField label="Tipo" value={s.tier} onChange={(v) => v && setSkill(i, { tier: v as SkillTier })} options={toOptions(tierLabels)} required />
                  <NumberField label="Recarga" value={s.cooldown} onChange={(v) => setSkill(i, { cooldown: Math.max(0, Math.round(v ?? 0)) })} unit="turnos" min={0} required />
                </FormGrid>
                <div className="mt-4">
                  <FormGrid cols={3}>
                    <Segmented
                      label="Alvo"
                      value={s.target}
                      onChange={(v) => setSkill(i, { target: v as SkillTarget, ...(v === 'SELF' ? { range: null, area: 'SINGLE' as SkillArea } : {}) })}
                      options={toOptions(targetLabels)}
                      required
                    />
                    {s.target !== 'SELF' && (
                      <SelectField label="Área" value={s.area} onChange={(v) => v && setSkill(i, { area: v as SkillArea })} options={toOptions(areaLabels)} required />
                    )}
                    {s.target === 'ENEMY' && s.area === 'SINGLE' && (
                      <SelectField
                        label="Alcance"
                        value={s.range}
                        onChange={(v) => setSkill(i, { range: (v as SkillRange | null) ?? null })}
                        options={toOptions(rangeLabels)}
                        emptyLabel="Sem alcance"
                      />
                    )}
                    {s.target === 'ENEMY' && (
                      <NumberField
                        label="Acerto base"
                        value={s.baseHitChance}
                        onChange={(v) => setSkill(i, { baseHitChance: v })}
                        step={0.05}
                        allowEmpty
                        placeholder="Sempre acerta"
                        hint="0 a 1 (0,9 = 90%). Vazio = sempre acerta."
                      />
                    )}
                  </FormGrid>
                </div>
                <div className="mt-4">
                  <TextAreaField label="Descrição" value={s.description} onChange={(v) => setSkill(i, { description: v })} placeholder="Opcional." rows={2} />
                </div>
                <div className="mt-4">
                  <EffectsEditor
                    effects={s.effects}
                    onChange={(effects) => setSkill(i, { effects })}
                    specs={beastEffectSpecs}
                    emptyText="Sem efeito: a skill não faz nada."
                  />
                </div>
              </FormSection>
            ))}
          </div>
          {value.skills.length < skillCount && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => set('skills', [...value.skills, newBeastSkill()])}>
              <Plus className="size-4" /> Skill
            </Button>
          )}
        </>
      )}

      {step === 'requirements' && (
        <>
          <StepIntro title="Com quem ela aceita lutar">
            O Mestre pede <b className="text-fg">todos</b> os requisitos (régua do equipamento: "alto" = entre os 2 maiores atributos do
            dono, "baixo" = entre os 2 menores). Sem todos, o contrato não se firma e a batalha não começa. O{' '}
            {beastGradeLabels[value.grade]} pede <b className="text-fg">{reqCount ?? '?'}</b>, sem repetir atributo, no máximo {MAX_PER_LEVEL}{' '}
            altos e {MAX_PER_LEVEL} baixos
            {beastGradeOrder.indexOf(value.grade) >= beastGradeOrder.indexOf(LOW_REQUIRED_FROM) && ', com pelo menos 1 baixo'}.
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
          {freeStat && (reqCount === undefined || reqs.length < reqCount) && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => set('requirements', [...reqs, { stat: freeStat, level: 'HIGH' }])}>
              <Plus className="size-4" /> Requisito
            </Button>
          )}
        </>
      )}

      {step === 'titles' && (
        <>
          <StepIntro title="Quem ela respeita" optional>
            Um <b className="text-fg">título</b> da lista vale 1 requisito para quem o tem (no máximo 1). O Prodígio não conta nas bestas.
          </StepIntro>
          {titles.length === 0 ? (
            <p className="text-xs text-fg-subtle">Carregando os títulos...</p>
          ) : (
            <MultiPick label="Títulos" values={value.titles ?? []} onChange={(v) => set('titles', v)} options={titles.map((t) => ({ value: t, label: t }))} />
          )}
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Besta', value: value.name || '—' },
              { id: 'contract', label: 'Contrato', value: contractLabels[value.contract] },
              { id: 'grade', label: 'Grau', value: beastGradeLabels[value.grade] },
              { id: 'lineage', label: 'Linhagem', value: lineageLabels[value.lineage] },
              ...(equality ? [] : [{ id: 'skills' as const, label: 'Skills', value: value.skills.map((s) => s.name || '—').join(', ') || '—' }]),
              ...(master
                ? [
                    { id: 'requirements' as const, label: 'Requisitos', value: reqs.map((q) => `${statLabels[q.stat]} ${requirementLevelLabels[q.level]}`).join(', ') || '—' },
                    { id: 'titles' as const, label: 'Títulos', value: (value.titles ?? []).join(', ') || 'Nenhum' },
                  ]
                : []),
            ]}
          />
          <ReviewStatus steps={steps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

/** Os passos mudam com o contrato: a Igualdade não tem skills; só o Mestre tem requisitos e títulos. */
function stepsOf(contract: BeastContract): WizardStep<StepId>[] {
  return [
    { id: 'identity', title: 'Identidade' },
    { id: 'contract', title: 'Contrato' },
    { id: 'grade', title: 'Grau' },
    { id: 'lineage', title: 'Linhagem' },
    ...(contract === 'EQUALITY' ? [] : [{ id: 'skills' as const, title: 'Skills em campo' }]),
    ...(contract === 'MASTER'
      ? [
          { id: 'requirements' as const, title: 'Requisitos' },
          { id: 'titles' as const, title: 'Títulos', optional: true },
        ]
      : []),
    { id: 'review', title: 'Revisão' },
  ]
}

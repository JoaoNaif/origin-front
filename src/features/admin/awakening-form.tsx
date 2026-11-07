import { useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminOptions } from '@/features/admin/admin-api'
import {
  type AwakeningBody,
  type AwakeningMissionCategory,
  type AwakeningMissionKind,
  type AwakeningMissionKinds,
  type AdminRules,
  type FormProps,
} from '@/features/admin/admin-schema'
import { ChoiceCards, FormGrid, FormSection, Note, NumberField, Segmented, SelectField, TextAreaField, TextField } from '@/features/admin/form-fields'
import { ReviewList, ReviewStatus, StepIntro, Wizard } from '@/features/admin/wizard'
import { firstStep, type WizardStep } from '@/features/admin/wizard-steps'
import type { Lineage, Stat } from '@/features/game/game-api'
import { lineageLabels, statLabels, statOrder } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'

// Assistente do despertar (D151, ../origin-game/docs/awakening_brief.md 7). As checagens espelham
// `Awakening.create` e `catalog-integrity.ts` do backend só para orientar; quem decide é o servidor.

type StepId = 'identity' | 'variant' | 'profile' | 'missions' | 'review'

const steps: WizardStep<StepId>[] = [
  { id: 'identity', title: 'Identidade' },
  { id: 'variant', title: 'Variante despertada' },
  { id: 'profile', title: 'Perfil do sorteio' },
  { id: 'missions', title: 'Missões ocultas' },
  { id: 'review', title: 'Revisão' },
]

const categoryInfo: Record<AwakeningMissionCategory, { label: string; text: string; unit: string }> = {
  ACCUMULATIVE: { label: 'Acumulativa', text: 'Soma eventos ao longo das batalhas.', unit: 'eventos' },
  REPEATED: { label: 'Condição repetida', text: 'Conta as batalhas em que a condição foi cumprida.', unit: 'batalhas' },
  MILESTONE: { label: 'Marco único', text: 'Uma batalha só basta, se o limiar for 1.', unit: 'vezes' },
}

const categoryOrder: AwakeningMissionCategory[] = ['ACCUMULATIVE', 'REPEATED', 'MILESTONE']

/** Categoria de cada tipo, espelho de `AWAKENING_MISSION_KINDS` (o limiar padrão vem de `GET /admin/options`). */
const missionCategory: Record<AwakeningMissionKind, AwakeningMissionCategory> = {
  KILLS: 'ACCUMULATIVE',
  STATUS_APPLIED: 'ACCUMULATIVE',
  HEAVY_HITS: 'ACCUMULATIVE',
  SUPPORT_ACTIONS: 'ACCUMULATIVE',
  DAMAGE_SHARE: 'REPEATED',
  SUPPORT_SHARE: 'REPEATED',
  LAST_ALIVE_WIN: 'REPEATED',
  MULTI_KILL: 'REPEATED',
  SOLE_SURVIVOR_WIN: 'MILESTONE',
  ENEMY_HP_SHARE: 'MILESTONE',
  TRIPLE_KILL: 'MILESTONE',
}

type MissionRules = NonNullable<AdminRules['awakeningMissionRules']>

const pct = (n: number | undefined) => (n === undefined ? '?' : `${Math.round(n * 100)}%`)

/** Nome e o que conta, com as frações de `rules.awakeningMissionRules`. */
function missionText(kind: AwakeningMissionKind, r: MissionRules | undefined): { label: string; text: string } {
  switch (kind) {
    case 'KILLS':
      return { label: 'Abates', text: 'Inimigos abatidos (o último golpe é dele).' }
    case 'STATUS_APPLIED':
      return { label: 'Status aplicados', text: 'Status aplicados num inimigo que pegaram.' }
    case 'HEAVY_HITS':
      return { label: 'Golpes pesados', text: 'Usos de skill Forte ou Final que causaram dano num inimigo.' }
    case 'SUPPORT_ACTIONS':
      return { label: 'Apoio', text: 'Curas e escudos em aliados (cada alvo conta).' }
    case 'DAMAGE_SHARE':
      return { label: 'Dano da squad', text: `Batalhas com ${pct(r?.damageShare)} ou mais do dano da squad.` }
    case 'SUPPORT_SHARE':
      return { label: 'Apoio da squad', text: `Batalhas com ${pct(r?.supportShare)} ou mais da cura e escudo da squad.` }
    case 'LAST_ALIVE_WIN':
      return { label: 'Último de pé', text: 'Vitórias em que ele é o último vivo.' }
    case 'MULTI_KILL':
      return { label: 'Abates múltiplos', text: `Batalhas com ${r?.multiKill ?? '?'} abates ou mais.` }
    case 'SOLE_SURVIVOR_WIN':
      return { label: 'Sobrevivente único', text: 'Vencer sendo o único vivo.' }
    case 'ENEMY_HP_SHARE':
      return { label: 'Devastação', text: `Causar ${pct(r?.enemyHpShare)} ou mais do HP total inimigo numa batalha.` }
    case 'TRIPLE_KILL':
      return { label: 'Abate triplo', text: `Abater ${r?.tripleKill ?? '?'} numa batalha.` }
  }
}

const levelLabels = { HIGH: 'Alto', LOW: 'Baixo' } as const

export function AwakeningForm({ value, onChange, catalog, rules, itemKey, isNew, onSubmit, saving }: FormProps<AwakeningBody>) {
  const [step, setStep] = useState(firstStep(steps, isNew))
  const options = useAdminOptions()
  const kinds = options.data?.awakeningMissionKinds as AwakeningMissionKinds | undefined
  const set = <K extends keyof AwakeningBody>(field: K, v: AwakeningBody[K]) => onChange({ ...value, [field]: v })

  const limits = rules?.awakeningRequirements
  const missionRules = rules?.awakeningMissionRules
  const minLevel = rules?.awakenedMinLevel

  // variante: só as despertadas; cada uma vem de um despertar só
  const takenBy = new Map(catalog.awakenings.filter((a) => a.key !== itemKey).map((a) => [a.variantKey as string, a.name]))
  const awakenedVariants = catalog.variants.filter((v) => v.awakensFromKey)
  const variant = catalog.variants.find((v) => v.key === value.variantKey)
  const base = catalog.variants.find((v) => v.key === variant?.awakensFromKey)
  // quem pode sortear: modelos com exatamente 1 variante, a base
  const eligible = base
    ? catalog.templates.filter((t) => {
        const list = (t.variants as { variantKey: string }[] | undefined) ?? []
        return list.length === 1 && list[0].variantKey === base.key
      })
    : []
  const skills = catalog.skills
    .filter((s) => s.variantKey === value.variantKey)
    .sort((a, b) => (a.minLevel as number) - (b.minLevel as number))
  const siblings = catalog.awakenings.filter((a) => a.key !== itemKey && a.baseVariantKey === base?.key)

  // problemas (espelho do domínio)
  const problems: Record<StepId, string[]> = { identity: [], variant: [], profile: [], missions: [], review: [] }
  if (!value.name.trim()) problems.identity.push('Dê um nome ao despertar.')
  if (!variant) problems.variant.push('Escolha a variante despertada.')
  else if (takenBy.has(variant.key)) problems.variant.push(`Essa variante já é do despertar ${takenBy.get(variant.key)}.`)

  const reqs = value.requirements
  if (limits && (reqs.length < limits.min || reqs.length > limits.max)) problems.profile.push(`O perfil tem de ${limits.min} a ${limits.max} requisitos (tem ${reqs.length}).`)
  if (new Set(reqs.map((r) => r.stat)).size !== reqs.length) problems.profile.push('Cada atributo aparece uma vez só.')
  if (limits) {
    for (const level of ['HIGH', 'LOW'] as const) {
      const n = reqs.filter((r) => r.level === level).length
      if (n > limits.maxPerLevel) problems.profile.push(`No máximo ${limits.maxPerLevel} requisitos "${levelLabels[level].toLowerCase()}" (tem ${n}).`)
    }
  }

  const chosen = new Map(value.missions.map((m) => [m.kind, m.threshold]))
  for (const c of categoryOrder) {
    if (!value.missions.some((m) => missionCategory[m.kind] === c)) problems.missions.push(`Inclua ao menos uma missão ${categoryInfo[c].label.toLowerCase()}.`)
  }
  if (value.missions.some((m) => !Number.isInteger(m.threshold) || m.threshold < 1)) problems.missions.push('Todo limiar é um número inteiro, 1 ou mais.')

  const toggleMission = (kind: AwakeningMissionKind) =>
    set(
      'missions',
      chosen.has(kind) ? value.missions.filter((m) => m.kind !== kind) : [...value.missions, { kind, threshold: kinds?.[kind].defaultThreshold ?? 1 }],
    )
  const setThreshold = (kind: AwakeningMissionKind, threshold: number) =>
    set(
      'missions',
      value.missions.map((m) => (m.kind === kind ? { ...m, threshold } : m)),
    )

  const setReq = (i: number, patch: Partial<AwakeningBody['requirements'][number]>) =>
    set(
      'requirements',
      reqs.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    )
  const freeStat = statOrder.find((s) => !reqs.some((r) => r.stat === s))

  const profileText = reqs.map((r) => `${statLabels[r.stat]} ${levelLabels[r.level].toLowerCase()}`).join(', ')

  return (
    <Wizard steps={steps} current={step} onStep={setStep} problems={problems} submitLabel={`${isNew ? 'Criar' : 'Salvar'} despertar`} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="O que é o despertar">
            O <b className="text-fg">despertar</b> é a evolução da variante de um personagem (fogo vira plasma). Ele é todo{' '}
            <b className="text-fg">oculto</b>: a partir do nível {minLevel ?? '?'}, o servidor sorteia um despertar para o
            personagem e abre 3 missões que o jogador não vê. Cumpridas as 3, ele desperta e as skills da variante despertada
            entram nos blocos de skill. O jogador só recebe uma dica vaga ("algo desperta", "está perto").
          </StepIntro>
          <FormGrid>
            <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Plasma" hint="Para o admin; o jogador vê o nome da variante despertada." required />
            <div />
            <TextAreaField
              label="Descrição"
              value={value.description}
              onChange={(v) => set('description', v)}
              placeholder="Ex.: A combustão passa do ponto: fogo que corta metal."
              hint="Opcional. O que muda no poder."
            />
          </FormGrid>
        </>
      )}

      {step === 'variant' && (
        <>
          <StepIntro title="Qual variante ele dá">
            Cada despertar dá uma <b className="text-fg">variante despertada</b> (criada em Variantes, com "Desperta de").
            Quem pode sortear é todo personagem com <b className="text-fg">exatamente 1 variante</b>, a base dela. Uma base
            pode ter vários despertares (o sorteio escolhe um), mas cada variante despertada pertence a um despertar só.
          </StepIntro>
          {awakenedVariants.length === 0 ? (
            <Note tone="warning">Nenhuma variante despertada no catálogo. Crie uma em Variantes (passo "Comum ou despertada") e volte aqui.</Note>
          ) : (
            <ChoiceCards
              label="Variante despertada"
              value={value.variantKey || null}
              onChange={(v) => set('variantKey', v)}
              cols={3}
              required
              options={awakenedVariants.map((v) => {
                const from = catalog.variants.find((b) => b.key === v.awakensFromKey)
                const owner = takenBy.get(v.key)
                return {
                  value: v.key,
                  label: v.name,
                  description: `Desperta de ${from?.name ?? v.awakensFromKey} · ${lineageLabels[v.lineage as Lineage] ?? String(v.lineage)}`,
                  extra: owner ? <Badge tone="warning">Já é de {owner}</Badge> : undefined,
                  disabled: !!owner,
                }
              })}
            />
          )}

          {variant && base && (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <InfoBox title="Quem pode sortear">
                {eligible.length ? (
                  <ul className="space-y-1">
                    {eligible.map((t) => (
                      <li key={t.key} className="text-sm text-fg">
                        {t.name} <span className="font-mono text-[11px] text-fg-subtle">{t.key}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-warning">Nenhum modelo tem só a variante {base.name}: ninguém sorteia este despertar ainda.</p>
                )}
              </InfoBox>
              <InfoBox title={`Skills de ${variant.name}`}>
                {skills.length ? (
                  <ul className="space-y-1">
                    {skills.map((s) => (
                      <li key={s.key} className="flex items-baseline justify-between gap-2 text-sm text-fg">
                        <span className="truncate">{s.name}</span>
                        <span className={cn('shrink-0 font-mono text-[11px]', minLevel && (s.minLevel as number) < minLevel ? 'text-warning' : 'text-fg-subtle')}>
                          nível {s.minLevel as number}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-warning">Nenhuma skill nesta variante. Crie em Skills: o padrão é 5 por despertar, uma a cada 5 níveis a partir do {minLevel ?? '?'}.</p>
                )}
              </InfoBox>
              <InfoBox title={`Outros despertares de ${base.name}`}>
                {siblings.length ? (
                  <ul className="space-y-1">
                    {siblings.map((a) => (
                      <li key={a.key} className="text-sm text-fg">
                        {a.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-fg-muted">Nenhum: quem sortear, recebe este.</p>
                )}
              </InfoBox>
            </div>
          )}
        </>
      )}

      {step === 'profile' && (
        <>
          <StepIntro title="Quem combina com ele">
            O <b className="text-fg">perfil</b> diz quais atributos combinam com o despertar. Quando a base tem vários
            despertares, o que mais combina com o personagem tem <b className="text-fg">mais chance</b> no sorteio, nunca
            garantida. "Alto" = o atributo está entre os 2 maiores do personagem (em relação à média das classes); "baixo" =
            entre os 2 menores.
            {limits && (
              <>
                {' '}
                De <b className="text-fg">{limits.min} a {limits.max}</b> requisitos, sem repetir atributo, no máximo{' '}
                {limits.maxPerLevel} altos e {limits.maxPerLevel} baixos.
              </>
            )}
          </StepIntro>
          <ul className="space-y-2">
            {reqs.map((r, i) => (
              <li key={i} className="flex flex-wrap items-end gap-3 rounded-control border border-line bg-bg/40 p-3">
                <span className="pb-2 font-mono text-[11px] text-primary-soft">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-48 flex-1">
                  <SelectField
                    label="Atributo"
                    value={r.stat}
                    onChange={(v) => v && setReq(i, { stat: v as Stat })}
                    options={statOrder.map((s) => ({ value: s, label: statLabels[s] }))}
                    required
                  />
                </div>
                <Segmented
                  label="Nível"
                  value={r.level}
                  onChange={(v) => setReq(i, { level: v as 'HIGH' | 'LOW' })}
                  options={[
                    { value: 'HIGH', label: 'Alto' },
                    { value: 'LOW', label: 'Baixo' },
                  ]}
                  required
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Tirar ${statLabels[r.stat]}`}
                  disabled={limits ? reqs.length <= limits.min : reqs.length <= 1}
                  onClick={() => set('requirements', reqs.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          {freeStat && (!limits || reqs.length < limits.max) && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => set('requirements', [...reqs, { stat: freeStat, level: 'HIGH' }])}>
              <Plus className="size-4" /> Requisito
            </Button>
          )}
        </>
      )}

      {step === 'missions' && (
        <>
          <StepIntro title="O pool de missões">
            Ao sortear o despertar, o personagem recebe <b className="text-fg">3 missões, uma de cada categoria</b>,
            sorteadas deste pool. Por isso o pool precisa de ao menos uma de cada. Quanto mais tipos, menos óbvio fica o
            caminho entre personagens. Sangue puro faz 30% a menos do limiar. Missões só contam a partir do Intermediário e
            contra NPC fora das últimas 5 batalhas. O personagem guarda uma cópia: mudar o pool não afeta quem já sorteou.
          </StepIntro>
          {!kinds && <p className="mb-3 text-xs text-fg-subtle">Carregando os limiares padrão...</p>}
          <div className="grid gap-4 lg:grid-cols-3">
            {categoryOrder.map((category) => {
              const info = categoryInfo[category]
              const list = (Object.keys(missionCategory) as AwakeningMissionKind[]).filter((k) => missionCategory[k] === category)
              const count = list.filter((k) => chosen.has(k)).length
              return (
                <section key={category} className={cn('space-y-2 rounded-control border p-3', count ? 'border-line-strong bg-surface' : 'border-warning/40 bg-warning/5')}>
                  <header className="flex items-baseline justify-between gap-2">
                    <h4 className="font-display text-base font-bold uppercase tracking-wide text-silver-bright">{info.label}</h4>
                    <span className={cn('font-mono text-[11px]', count ? 'text-primary-soft' : 'text-warning')}>{count} no pool</span>
                  </header>
                  <p className="text-xs text-fg-muted">{info.text}</p>
                  <ul className="space-y-1.5">
                    {list.map((kind) => {
                      const on = chosen.has(kind)
                      const text = missionText(kind, missionRules)
                      return (
                        <li key={kind} className={cn('rounded-control border p-2.5 transition-colors', on ? 'border-primary/50 bg-primary-dim/60' : 'border-line bg-bg/40')}>
                          <label className="flex cursor-pointer items-start gap-2.5">
                            <input type="checkbox" checked={on} onChange={() => toggleMission(kind)} className="mt-0.5 accent-(--color-primary)" />
                            <span className="min-w-0">
                              <span className={cn('block text-sm font-medium', on ? 'text-silver-bright' : 'text-fg')}>{text.label}</span>
                              <span className="block text-xs text-fg-muted">{text.text}</span>
                            </span>
                          </label>
                          {on && (
                            <div className="mt-2 pl-6">
                              <NumberField
                                label="Limiar"
                                value={chosen.get(kind)}
                                onChange={(v) => setThreshold(kind, v ?? 1)}
                                min={1}
                                unit={info.unit}
                                hint={kinds && `Padrão: ${kinds[kind].defaultThreshold}.`}
                                required
                              />
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Despertar', value: value.name || '—' },
              { id: 'variant', label: 'Variante', value: variant ? `${base?.name ?? '?'} → ${variant.name}` : '—' },
              { id: 'profile', label: 'Perfil', value: profileText || '—' },
              {
                id: 'missions',
                label: 'Missões',
                value: value.missions.map((m) => `${missionText(m.kind, missionRules).label} (${m.threshold})`).join(', ') || 'Nenhuma',
              },
            ]}
          />
          <ReviewStatus steps={steps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-control border border-line bg-surface p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">{title}</p>
      {children}
    </div>
  )
}

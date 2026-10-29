import { useState } from 'react'
import type { AdminCatalog, CatalogItem } from '@/features/admin/admin-api'
import { keyOptions, type AdminRules, type FormProps, type NpcMember, type NpcSquadBody } from '@/features/admin/admin-schema'
import { ChoiceCards, FormGrid, FormSection, MultiPick, Note, NumberField, SelectField, TextAreaField, TextField } from '@/features/admin/form-fields'
import { ReviewList, ReviewStatus, StepIntro, Wizard } from '@/features/admin/wizard'
import { firstStep, type WizardStep } from '@/features/admin/wizard-steps'
import { CharacterPortrait } from '@/features/game/character-art'
import { classLabels, difficultyLabels, type AiDifficulty, type AiProfile, type CharacterClass } from '@/features/game/game-api'
import { profileLabels, tierLabels } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'

// Assistente do squad de NPC (o adversário da máquina). As checagens espelham `validateMembers` e
// `skillEligibilityError` do ../origin-game só para orientar; quem decide é o servidor.

const profileText: Record<AiProfile, string> = {
  AGGRESSIVE: 'Prefere causar o máximo de dano, mesmo se expondo.',
  CAUTIOUS: 'Protege os aliados, cura cedo e evita riscos.',
  FINISHER: 'Corre atrás de quem está com pouca vida para abater.',
  BALANCED: 'Equilibra ataque e defesa conforme a situação.',
}

const difficultyText: Record<AiDifficulty, string> = {
  BEGINNER: 'Decisões simples, comete erros. Para quem está começando.',
  INTERMEDIATE: 'Joga direito, mas sem pensar muito à frente.',
  ADVANCED: 'Boas decisões e bom uso do campo.',
  MASTER: 'Pensa várias jogadas à frente e lembra das suas skills.',
  GRANDMASTER: 'O mais forte: quase não erra.',
}

// mesma orientação da formação do jogador: frente à direita (column 0)
const visualColumns = [
  { column: 2, label: 'Fundo' },
  { column: 1, label: 'Meio' },
  { column: 0, label: 'Frente' },
]

const memberLabel = (index: number) => String(index + 1).padStart(2, '0')

type StepId = 'identity' | 'behavior' | 'members' | 'formation' | 'builds' | 'review'

const steps: WizardStep<StepId>[] = [
  { id: 'identity', title: 'Adversário' },
  { id: 'behavior', title: 'Comportamento' },
  { id: 'members', title: 'Membros' },
  { id: 'formation', title: 'Formação' },
  { id: 'builds', title: 'Builds' },
  { id: 'review', title: 'Revisão' },
]

const templateVariantKeys = (template: CatalogItem | undefined) => ((template?.variants as { variantKey: string }[] | undefined) ?? []).map((v) => v.variantKey)

/** Por que a skill não pode estar na build deste membro (espelho de `skillEligibilityError`); nulo = pode. */
function skillIssue(skill: CatalogItem, member: NpcMember, catalog: AdminCatalog): string | null {
  const template = catalog.templates.find((t) => t.key === member.templateKey)
  const owned = templateVariantKeys(template)
  if ((skill.minLevel as number) > member.level) return `liberada no nível ${skill.minLevel as number}`
  const variantKey = skill.variantKey as string | null
  if (!variantKey) return owned.length === 0 ? null : 'skill sem variante é só para quem não tem variante'
  if (catalog.variants.find((v) => v.key === variantKey)?.awakensFromKey)
    return member.awakenedVariantKey === variantKey ? null : 'precisa despertar nessa variante'
  return owned.includes(variantKey) ? null : 'de outra variante'
}

function findProblems(value: NpcSquadBody, catalog: AdminCatalog, rules: AdminRules | undefined): Record<StepId, string[]> {
  const p: Record<StepId, string[]> = { identity: [], behavior: [], members: [], formation: [], builds: [], review: [] }
  const range = rules?.npcLevelRange[value.difficulty]
  const buildSize = rules?.buildSize ?? 4

  if (!value.name.trim()) p.identity.push('Dê um nome ao adversário.')

  const keys = value.members.map((m) => m.templateKey).filter(Boolean)
  if (keys.length !== value.members.length) p.members.push('Escolha o personagem de todos os membros.')
  if (new Set(keys).size !== keys.length) p.members.push('O mesmo personagem aparece duas vezes (não pode, como na conta do jogador).')

  value.members.forEach((m, i) => {
    const who = `Membro ${memberLabel(i)}`
    if (range && (m.level < range.min || m.level > range.max)) p.members.push(`${who}: nível ${m.level} fora da faixa ${range.min} a ${range.max}.`)
    if (m.awakenedVariantKey) {
      const template = catalog.templates.find((t) => t.key === m.templateKey)
      if (templateVariantKeys(template).length !== 1) p.members.push(`${who}: só desperta quem tem exatamente 1 variante.`)
      if (rules && m.level < rules.awakenedMinLevel) p.members.push(`${who}: desperta a partir do nível ${rules.awakenedMinLevel}.`)
    }
    if (!m.templateKey) return
    if (m.skillKeys.length !== buildSize || new Set(m.skillKeys).size !== m.skillKeys.length)
      p.builds.push(`${who}: a build tem ${buildSize} skills diferentes (tem ${m.skillKeys.length}).`)
    for (const key of m.skillKeys) {
      const skill = catalog.skills.find((s) => s.key === key)
      const issue = skill && skillIssue(skill, m, catalog)
      if (issue) p.builds.push(`${who}: “${skill.name}” ${issue}.`)
    }
    if (rules && (m.traitKeys ?? []).length > rules.maxTraits) p.builds.push(`${who}: no máximo ${rules.maxTraits} traços.`)
  })

  const cells = value.members.map((m) => `${m.row}:${m.column}`)
  if (new Set(cells).size !== cells.length) p.formation.push('Dois membros na mesma casa.')
  return p
}

export function NpcSquadForm({ value, onChange, catalog, rules, isNew, onSubmit, saving }: FormProps<NpcSquadBody>) {
  const [step, setStep] = useState(firstStep(steps, isNew))
  const [active, setActive] = useState(0)
  const set = <K extends keyof NpcSquadBody>(field: K, v: NpcSquadBody[K]) => onChange({ ...value, [field]: v })
  const setMember = (index: number, member: NpcMember) => set('members', value.members.map((m, i) => (i === index ? member : m)))
  const problems = findProblems(value, catalog, rules)
  const range = rules?.npcLevelRange[value.difficulty]
  const buildSize = rules?.buildSize ?? 4
  const templateName = (key: string) => catalog.templates.find((t) => t.key === key)?.name ?? 'Sem personagem'

  return (
    <Wizard steps={steps} current={step} onStep={setStep} problems={problems} submitLabel={isNew ? 'Criar adversário' : 'Salvar adversário'} onSubmit={onSubmit} saving={saving}>
      {step === 'identity' && (
        <>
          <StepIntro title="Quem é o adversário">
            Um <b className="text-fg">squad de NPC</b> é um adversário da máquina: 4 personagens controlados pela IA, que o
            jogador enfrenta na tela Batalhar. O jogador vê o nome, o perfil e o nível na lista; a formação e as skills
            ficam escondidas até a batalha começar.
          </StepIntro>
          <FormGrid>
            <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Patrulha da Fronteira" hint="O nome que aparece na lista de adversários." required />
            <div />
            <TextAreaField
              label="Descrição"
              value={value.description}
              onChange={(v) => set('description', v)}
              placeholder="Ex.: Guardas novatos que avançam juntos e batem forte na linha da frente."
              hint="Opcional. A ideia do squad."
            />
          </FormGrid>
        </>
      )}

      {step === 'behavior' && (
        <>
          <StepIntro title="Como a máquina joga">
            O <b className="text-fg">perfil</b> é a personalidade da IA: o que ela prioriza ao escolher a jogada. A{' '}
            <b className="text-fg">dificuldade</b> é o quanto ela joga bem e define a faixa de nível dos membros; os
            atributos não mudam, só a qualidade das decisões.
          </StepIntro>
          <div className="space-y-6">
            <ChoiceCards
              label="Perfil da IA"
              value={value.profile}
              onChange={(v) => set('profile', v as AiProfile)}
              cols={4}
              required
              options={(Object.keys(profileText) as AiProfile[]).map((p) => ({ value: p, label: profileLabels[p], description: profileText[p] }))}
            />
            <ChoiceCards
              label="Dificuldade"
              value={value.difficulty}
              onChange={(v) => set('difficulty', v as AiDifficulty)}
              cols={5}
              required
              options={(Object.keys(difficultyText) as AiDifficulty[]).map((d) => {
                const r = rules?.npcLevelRange[d]
                return {
                  value: d,
                  label: difficultyLabels[d],
                  description: difficultyText[d],
                  extra: r && <span className="mt-1 font-mono text-[10px] text-primary-soft">Níveis {r.min} a {r.max}</span>,
                }
              })}
            />
          </div>
        </>
      )}

      {step === 'members' && (
        <>
          <StepIntro title="Quem está no squad">
            Escolha os <b className="text-fg">4 personagens</b> (sem repetir) e o nível de cada um, dentro da faixa da
            dificuldade{range && <> ({range.min} a {range.max})</>}. Ao escolher o personagem, a build dele já vem preenchida
            com o kit básico; você ajusta no passo Builds. A <b className="text-fg">variante despertada</b> é opcional e só
            vale para quem tem uma única variante, em nível alto.
          </StepIntro>
          <div className="grid gap-3 lg:grid-cols-2">
            {value.members.map((m, i) => (
              <MemberCard
                key={i}
                index={i}
                member={m}
                onChange={(next) => setMember(i, next)}
                catalog={catalog}
                takenKeys={value.members.filter((_, j) => j !== i).map((x) => x.templateKey)}
                levelRange={range}
                buildSize={buildSize}
                awakenedMinLevel={rules?.awakenedMinLevel}
              />
            ))}
          </div>
        </>
      )}

      {step === 'formation' && (
        <>
          <StepIntro title="Onde cada um fica">
            A grade tem 3 fileiras e 3 profundidades; a <b className="text-fg">frente</b> fica à direita, de frente para o
            jogador. Quem está na frente é o primeiro alvo dos golpes corpo a corpo; quem fica atrás de alguém é mais
            protegido. Escolha um membro e clique numa casa para colocá-lo; casa ocupada, os dois trocam de lugar.
          </StepIntro>
          <Formation value={value} onChange={(members) => set('members', members)} catalog={catalog} active={active} onActive={setActive} />
        </>
      )}

      {step === 'builds' && (
        <>
          <StepIntro title="O que cada um usa">
            A <b className="text-fg">build</b> são as {buildSize} skills que o membro leva para a batalha, na ordem da barra.
            Só servem skills do próprio personagem que ele já pode usar: liberadas até o nível dele, da variante dele (ou
            sem variante, para quem não tem nenhuma) e, se for de variante despertada, só com o despertar escolhido. Os{' '}
            <b className="text-fg">traços extras</b> são opcionais; o traço de família do personagem entra sozinho.
          </StepIntro>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {value.members.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    'focus-ring flex h-10 items-center gap-2 rounded-control border px-3 text-sm transition-colors',
                    i === active ? 'border-primary bg-primary-dim text-silver-bright' : 'border-line bg-bg text-fg-muted hover:text-fg',
                  )}
                >
                  <span className="font-mono text-[11px] text-primary-soft">{memberLabel(i)}</span>
                  {templateName(m.templateKey)}
                </button>
              ))}
            </div>
            {value.members[active] && (
              <BuildEditor member={value.members[active]} onChange={(m) => setMember(active, m)} catalog={catalog} buildSize={buildSize} maxTraits={rules?.maxTraits} />
            )}
          </div>
        </>
      )}

      {step === 'review' && (
        <FormSection index="✓" title="Revisão" description="Confira antes de salvar. Clique numa linha para voltar ao passo.">
          <ReviewList
            onGo={setStep}
            problems={problems}
            rows={[
              { id: 'identity', label: 'Adversário', value: value.name || '—' },
              { id: 'behavior', label: 'Comportamento', value: `${profileLabels[value.profile]} · ${difficultyLabels[value.difficulty]}` },
              { id: 'members', label: 'Membros', value: value.members.map((m) => `${templateName(m.templateKey)} (nv ${m.level})`).join(', ') },
              { id: 'formation', label: 'Formação', value: `${value.members.filter((m) => m.column === 0).length} na frente` },
              { id: 'builds', label: 'Builds', value: `${value.members.filter((m) => m.skillKeys.length === buildSize).length} de ${value.members.length} completas` },
            ]}
          />
          <ReviewStatus steps={steps} problems={problems} />
        </FormSection>
      )}
    </Wizard>
  )
}

function MemberCard({ index, member, onChange, catalog, takenKeys, levelRange, buildSize, awakenedMinLevel }: {
  index: number
  member: NpcMember
  onChange: (member: NpcMember) => void
  catalog: AdminCatalog
  takenKeys: string[]
  levelRange: { min: number; max: number } | undefined
  buildSize: number
  awakenedMinLevel: number | undefined
}) {
  const template = catalog.templates.find((t) => t.key === member.templateKey)
  const variants = templateVariantKeys(template)
  const awakened = catalog.variants.filter((v) => variants.length === 1 && v.awakensFromKey === variants[0])
  const outOfRange = levelRange && (member.level < levelRange.min || member.level > levelRange.max)

  return (
    <div className="space-y-4 rounded-card border border-line bg-raised/40 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-bg">
          {template ? (
            <CharacterPortrait templateKey={template.key} characterClass={template.characterClass as CharacterClass} zoom={3} className="size-full" iconClassName="size-5 text-silver/60" />
          ) : (
            <span className="font-mono text-xs text-fg-subtle">{memberLabel(index)}</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">Membro {memberLabel(index)}</p>
          <p className="truncate font-display text-lg font-bold uppercase tracking-wide text-silver-bright">{template?.name ?? 'Sem personagem'}</p>
          {template && <p className="text-xs text-fg-subtle">{classLabels[template.characterClass as CharacterClass]}</p>}
        </div>
      </div>
      <FormGrid>
        <SelectField
          label="Personagem"
          value={member.templateKey || null}
          onChange={(v) => {
            if (!v) return
            // a build do personagem novo: as skills do kit (as primeiras da lista do modelo)
            const kit = (catalog.templates.find((t) => t.key === v)?.skillKeys as string[] | undefined)?.slice(0, buildSize) ?? []
            onChange({ ...member, templateKey: v, skillKeys: kit, awakenedVariantKey: null })
          }}
          options={keyOptions(catalog.templates.filter((t) => t.key === member.templateKey || !takenKeys.includes(t.key)))}
          hint="Trocar o personagem preenche a build com o kit dele."
          required
        />
        <NumberField
          label="Nível"
          value={member.level}
          onChange={(v) => onChange({ ...member, level: Math.round(v ?? 1) })}
          min={1}
          max={100}
          error={outOfRange ? `Fora da faixa da dificuldade (${levelRange.min} a ${levelRange.max}).` : undefined}
          hint={levelRange && `Faixa da dificuldade: ${levelRange.min} a ${levelRange.max}. Nível mais alto libera skills mais fortes.`}
          required
        />
        <SelectField
          label="Variante despertada"
          value={member.awakenedVariantKey}
          onChange={(v) => onChange({ ...member, awakenedVariantKey: v })}
          options={keyOptions(awakened)}
          emptyLabel="Nenhuma"
          hint={
            variants.length !== 1
              ? 'Só desperta quem tem exatamente 1 variante.'
              : awakened.length
                ? `Opcional. A partir do nível ${awakenedMinLevel ?? '?'}; libera as skills despertadas.`
                : 'A variante deste personagem não tem forma despertada.'
          }
          wide
        />
      </FormGrid>
    </div>
  )
}

function Formation({ value, onChange, catalog, active, onActive }: {
  value: NpcSquadBody
  onChange: (members: NpcMember[]) => void
  catalog: AdminCatalog
  active: number
  onActive: (index: number) => void
}) {
  const moveTo = (row: number, column: number) => {
    const other = value.members.findIndex((m) => m.row === row && m.column === column)
    const current = value.members[active]
    // casa ocupada: os dois trocam de lugar
    onChange(value.members.map((m, i) => (i === active ? { ...m, row, column } : i === other ? { ...m, row: current.row, column: current.column } : m)))
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          {visualColumns.map(({ column, label }) => (
            <span key={column} className={cn('text-center font-mono text-[10px] uppercase tracking-[0.16em]', column === 0 ? 'text-primary-soft' : 'text-fg-subtle')}>
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].flatMap((row) =>
            visualColumns.map(({ column }) => {
              const index = value.members.findIndex((m) => m.row === row && m.column === column)
              const member = value.members[index]
              const template = member && catalog.templates.find((t) => t.key === member.templateKey)
              return (
                <button
                  key={`${row}:${column}`}
                  type="button"
                  onClick={() => (index >= 0 && index !== active ? onActive(index) : moveTo(row, column))}
                  title={template ? template.name : 'Vazia: colocar o membro escolhido aqui'}
                  className={cn(
                    'focus-ring relative flex size-20 items-center justify-center overflow-hidden rounded-control border transition-colors',
                    index === active
                      ? 'border-primary bg-primary-dim shadow-glow'
                      : index >= 0
                        ? 'border-line-strong bg-raised hover:border-primary/60'
                        : 'border-dashed border-line bg-bg hover:border-primary/60',
                  )}
                >
                  {template ? <CharacterPortrait templateKey={template.key} characterClass={template.characterClass as CharacterClass} mirror className="absolute inset-0" /> : null}
                  {index >= 0 && <span className="absolute top-1 left-1 bg-bg/80 px-1 font-mono text-[10px] text-primary-soft">{memberLabel(index)}</span>}
                </button>
              )
            }),
          )}
        </div>
      </div>

      <div className="flex flex-wrap content-start gap-2">
        {value.members.map((m, index) => {
          const template = catalog.templates.find((t) => t.key === m.templateKey)
          return (
            <button
              key={index}
              type="button"
              onClick={() => onActive(index)}
              className={cn(
                'focus-ring flex h-10 items-center gap-2 rounded-control border px-3 text-sm transition-colors',
                index === active ? 'border-primary bg-primary-dim text-silver-bright' : 'border-line bg-bg text-fg-muted hover:text-fg',
              )}
            >
              <span className="font-mono text-[11px] text-primary-soft">{memberLabel(index)}</span>
              {template?.name ?? 'Sem personagem'}
              <span className="font-mono text-[10px] text-fg-subtle">Nv {m.level}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BuildEditor({ member, onChange, catalog, buildSize, maxTraits }: {
  member: NpcMember
  onChange: (member: NpcMember) => void
  catalog: AdminCatalog
  buildSize: number
  maxTraits: number | undefined
}) {
  if (!member.templateKey) return <Note>Escolha o personagem deste membro no passo Membros.</Note>

  const skills = catalog.skills.filter((s) => s.key.startsWith(`${member.templateKey}:`))
  const slots = Array.from({ length: buildSize }, (_, i): string | null => member.skillKeys[i] ?? null)
  const skillOption = (s: CatalogItem) => {
    const issue = skillIssue(s, member, catalog)
    return {
      value: s.key,
      label: `${s.name} · ${tierLabels[s.tier as keyof typeof tierLabels] ?? s.tier} · nv ${s.minLevel as number}${issue ? ` (não pode: ${issue})` : ''}`,
      hint: (s.description as string | null) ?? undefined,
    }
  }

  return (
    <div className="space-y-5">
      <FormGrid cols={buildSize === 4 ? 4 : 2}>
        {slots.map((key, i) => (
          <SelectField
            key={i}
            label={`Skill ${i + 1}`}
            value={key}
            onChange={(v) => {
              const next = [...slots]
              next[i] = v
              onChange({ ...member, skillKeys: next.filter((k): k is string => !!k) })
            }}
            // as já usadas em outro slot ficam de fora; as que não podem aparecem com o motivo
            options={skills.filter((s) => s.key === key || !member.skillKeys.includes(s.key)).map(skillOption)}
            emptyLabel="Vazio"
            required
          />
        ))}
      </FormGrid>
      <MultiPick
        label="Traços extras"
        values={(member.traitKeys ?? []).filter((k) => catalog.traits.find((t) => t.key === k)?.source === 'CONQUERED')}
        onChange={(v) => {
          // o traço de família (se veio do servidor) continua; o servidor também o põe sozinho
          const family = (member.traitKeys ?? []).filter((k) => catalog.traits.find((t) => t.key === k)?.source === 'TEMPLATE')
          onChange({ ...member, traitKeys: [...family, ...v] })
        }}
        options={catalog.traits.filter((t) => t.source === 'CONQUERED').map((t) => ({ value: t.key, label: t.name, hint: (t.description as string | null) ?? t.key }))}
        hint={`Opcional. Traços conquistados que este membro já teria. ${maxTraits ? `No máximo ${maxTraits} traços contando o de família.` : ''}`}
      />
    </div>
  )
}

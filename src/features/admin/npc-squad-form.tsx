import { useState } from 'react'
import type { CatalogItem } from '@/features/admin/admin-api'
import type { NpcMember, NpcSquadBody } from '@/features/admin/admin-schema'
import { keyOptions, type FormProps } from '@/features/admin/admin-schema'
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
import { CharacterPortrait } from '@/features/game/character-art'
import { difficultyLabels, type CharacterClass } from '@/features/game/game-api'
import { profileLabels, tierLabels } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'

const profileHints: Record<string, string> = {
  AGGRESSIVE: 'Prefere causar o máximo de dano.',
  CAUTIOUS: 'Protege os aliados e evita riscos.',
  FINISHER: 'Corre atrás de quem está com pouca vida.',
  BALANCED: 'Equilibra ataque e defesa.',
}

// mesma orientação da formação do jogador: frente à direita (column 0)
const visualColumns = [
  { column: 2, label: 'Fundo' },
  { column: 1, label: 'Meio' },
  { column: 0, label: 'Frente' },
]

const memberLabel = (index: number) => String(index + 1).padStart(2, '0')

export function NpcSquadForm({ value, onChange, catalog, rules }: FormProps<NpcSquadBody>) {
  const [active, setActive] = useState(0)
  const set = <K extends keyof NpcSquadBody>(field: K, v: NpcSquadBody[K]) => onChange({ ...value, [field]: v })
  const setMember = (index: number, member: NpcMember) =>
    set('members', value.members.map((m, i) => (i === index ? member : m)))

  const range = rules?.npcLevelRange[value.difficulty]

  const moveTo = (row: number, column: number) => {
    const other = value.members.findIndex((m) => m.row === row && m.column === column)
    const current = value.members[active]
    // célula ocupada: os dois trocam de lugar
    set(
      'members',
      value.members.map((m, i) =>
        i === active ? { ...m, row, column } : i === other ? { ...m, row: current.row, column: current.column } : m,
      ),
    )
  }

  return (
    <>
      <FormSection index="01" title="Adversário" description="Como aparece na escolha do adversário. A formação e as skills ficam escondidas do jogador até a batalha.">
        <FormGrid>
          <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Patrulha da Fronteira" />
          <div />
          <Segmented
            label="Perfil da IA"
            value={value.profile}
            onChange={(v) => set('profile', v as NpcSquadBody['profile'])}
            options={Object.entries(profileLabels).map(([v, l]) => ({ value: v, label: l, hint: profileHints[v] }))}
          />
          <Segmented
            label="Dificuldade"
            value={value.difficulty}
            onChange={(v) => set('difficulty', v as NpcSquadBody['difficulty'])}
            options={Object.entries(difficultyLabels).map(([v, l]) => {
              const r = rules?.npcLevelRange[v as NpcSquadBody['difficulty']]
              return { value: v, label: l, hint: r ? `Níveis ${r.min} a ${r.max}. Muda a qualidade das decisões, não os atributos.` : undefined }
            })}
          />
          <TextAreaField
            label="Descrição"
            value={value.description}
            onChange={(v) => set('description', v)}
            placeholder="Ex.: Guardas novatos que avançam juntos e batem forte na linha da frente."
          />
        </FormGrid>
      </FormSection>

      <FormSection index="02" title="Formação" description="Escolha um membro e clique numa casa para colocá-lo. Casa ocupada: os dois trocam.">
        <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {visualColumns.map(({ column, label }) => (
                <span
                  key={column}
                  className={cn('text-center font-mono text-[10px] uppercase tracking-[0.16em]', column === 0 ? 'text-primary-soft' : 'text-fg-subtle')}
                >
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
                      onClick={() => (index >= 0 && index !== active ? setActive(index) : moveTo(row, column))}
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
                      {template ? (
                        <CharacterPortrait
                          templateKey={template.key}
                          characterClass={template.characterClass as CharacterClass}
                          mirror
                          className="absolute inset-0"
                        />
                      ) : null}
                      {index >= 0 && (
                        <span className="absolute top-1 left-1 bg-bg/80 px-1 font-mono text-[10px] text-primary-soft">{memberLabel(index)}</span>
                      )}
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
                  onClick={() => setActive(index)}
                  className={cn(
                    'focus-ring flex h-10 items-center gap-2 rounded-control border px-3 text-sm transition-colors',
                    index === active ? 'border-primary bg-primary-dim text-silver-bright' : 'border-line bg-bg text-fg-muted hover:text-fg',
                  )}
                >
                  <span className="font-mono text-[11px] text-primary-soft">{memberLabel(index)}</span>
                  {template?.name ?? 'Sem modelo'}
                  <span className="font-mono text-[10px] text-fg-subtle">Nv {m.level}</span>
                </button>
              )
            })}
          </div>
        </div>
      </FormSection>

      {value.members[active] && (
        <MemberForm
          index={active}
          member={value.members[active]}
          onChange={(m) => setMember(active, m)}
          catalog={catalog}
          levelRange={range}
          buildSize={rules?.buildSize ?? 4}
        />
      )}
    </>
  )
}

function MemberForm({ index, member, onChange, catalog, levelRange, buildSize }: {
  index: number
  member: NpcMember
  onChange: (member: NpcMember) => void
  catalog: FormProps<unknown>['catalog']
  levelRange: { min: number; max: number } | undefined
  buildSize: number
}) {
  const set = <K extends keyof NpcMember>(field: K, v: NpcMember[K]) => onChange({ ...member, [field]: v })
  const template = catalog.templates.find((t) => t.key === member.templateKey)
  const templateVariants = ((template?.variants as { variantKey: string }[] | undefined) ?? []).map((v) => v.variantKey)
  const awakened = catalog.variants.filter((v) => templateVariants.includes(v.awakensFromKey as string))
  const skills = catalog.skills.filter((s) => s.key.startsWith(`${member.templateKey}:`))
  const skillOption = (s: CatalogItem) => ({
    value: s.key,
    label: `${s.name} · ${tierLabels[s.tier as keyof typeof tierLabels] ?? s.tier} · nv ${s.minLevel as number}${(s.minLevel as number) > member.level ? ' (nível alto demais)' : ''}`,
  })
  const outOfRange = levelRange && (member.level < levelRange.min || member.level > levelRange.max)
  const slots = Array.from({ length: buildSize }, (_, i): string | null => member.skillKeys[i] ?? null)

  return (
    <FormSection index="03" title={`Membro ${memberLabel(index)}`} description="O personagem, o nível e a build que a máquina usa.">
      <FormGrid cols={3}>
        <SelectField
          label="Modelo"
          value={member.templateKey || null}
          onChange={(v) => {
            if (!v) return
            // a build do modelo novo: as skills do kit (as primeiras da lista do modelo)
            const kit = (catalog.templates.find((t) => t.key === v)?.skillKeys as string[] | undefined)?.slice(0, buildSize) ?? []
            onChange({ ...member, templateKey: v, skillKeys: kit, awakenedVariantKey: null })
          }}
          options={keyOptions(catalog.templates)}
          hint="Trocar o modelo preenche a build com o kit dele."
        />
        <NumberField
          label="Nível"
          value={member.level}
          onChange={(v) => set('level', Math.round(v ?? 1))}
          min={1}
          max={100}
          error={outOfRange ? `Fora da faixa da dificuldade (${levelRange.min} a ${levelRange.max}).` : undefined}
          hint={levelRange && `Faixa da dificuldade: ${levelRange.min} a ${levelRange.max}.`}
        />
        <SelectField
          label="Variante despertada"
          value={member.awakenedVariantKey}
          onChange={(v) => set('awakenedVariantKey', v)}
          options={keyOptions(awakened)}
          emptyLabel="Nenhuma"
          hint={awakened.length ? 'Só para membros despertados (nível alto).' : 'Este modelo não tem variante despertada.'}
        />
      </FormGrid>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">Build ({buildSize} skills, na ordem)</p>
        {!member.templateKey ? (
          <Note>Escolha o modelo para ver as skills dele.</Note>
        ) : (
          <FormGrid cols={buildSize === 4 ? 4 : 2}>
            {slots.map((key, i) => (
              <SelectField
                key={i}
                label={`Slot ${i + 1}`}
                value={key}
                onChange={(v) => {
                  const next = [...slots]
                  next[i] = v
                  set('skillKeys', next.filter((k): k is string => !!k))
                }}
                options={skills.filter((s) => s.key === key || !member.skillKeys.includes(s.key)).map(skillOption)}
                emptyLabel="Vazio"
              />
            ))}
          </FormGrid>
        )}
        {member.templateKey && member.skillKeys.length !== buildSize && (
          <Note tone="warning">A build precisa de {buildSize} skills diferentes.</Note>
        )}
      </div>

      <MultiPick
        label="Traços extras"
        values={member.traitKeys ?? []}
        onChange={(v) => set('traitKeys', v)}
        options={catalog.traits.filter((t) => t.source === 'CONQUERED').map((t) => ({ value: t.key, label: t.name, hint: t.key }))}
        hint="Opcional. O traço de família do modelo entra sozinho."
      />
    </FormSection>
  )
}

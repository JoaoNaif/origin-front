import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSkillReference } from '@/features/admin/admin-api'
import { skillEffectSpecs, type SkillBody } from '@/features/admin/admin-schema'
import { EffectsEditor } from '@/features/admin/effects-editor'
import { keyOptions, toOptions, type FormProps } from '@/features/admin/admin-schema'
import {
  FormGrid,
  FormSection,
  Note,
  NumberField,
  Segmented,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
} from '@/features/admin/form-fields'
import { classLabels, type CharacterClass } from '@/features/game/game-api'
import { areaLabels, kitSlotLabels, rangeLabels, targetLabels, tierLabels } from '@/features/game/game-labels'

const POWER_EFFECTS = ['DAMAGE', 'HEAL', 'SHIELD']

const tierHints: Record<string, string> = {
  BASIC: 'Sem recarga, golpe do dia a dia.',
  STANDARD: 'O golpe principal do começo do jogo.',
  REINFORCED: 'Mais forte, a partir do nível 20.',
  STRONG: 'Golpe pesado, a partir do nível 40.',
  FINAL: 'O mais forte, a partir do nível 60.',
}

const areaHints: Record<string, string> = {
  SINGLE: 'Um alvo só.',
  LINE: 'A linha inteira do alvo.',
  COLUMN: 'A coluna inteira do alvo.',
  GRID: 'Todos do lado alvo.',
}

const rangeHints: Record<string, string> = {
  MELEE: 'Só atinge o primeiro ocupado da linha (o exposto).',
  RANGED: 'Qualquer célula, mas quem está atrás de alguém tem cobertura (×0,7).',
  PIERCING: 'Atravessa a linha, sem bloqueio nem queda. Custa mais.',
  FLANK: 'Ignora a frente: atinge o último ocupado da linha.',
}

export function SkillForm({ value, onChange, catalog, rules, itemKey }: FormProps<SkillBody>) {
  const set = <K extends keyof SkillBody>(field: K, v: SkillBody[K]) => onChange({ ...value, [field]: v })

  const owner = catalog.templates.find((t) => itemKey.startsWith(`${t.key}:`))
  const ownerClass = owner?.characterClass as CharacterClass | undefined
  const enemy = value.target === 'ENEMY'
  const variant = catalog.variants.find((v) => v.key === value.variantKey)
  const isNone = !variant || variant.lineage === 'NONE'
  const reference = useSkillReference({ tier: value.tier, target: value.target, range: value.range, area: value.area, isNone })
  const ref = reference.data

  // alcance e chance de acerto só existem em skill de inimigo
  const changeTarget = (target: SkillBody['target']) =>
    onChange({
      ...value,
      target,
      range: target === 'ENEMY' ? (value.range ?? 'MELEE') : null,
      baseHitChance: target === 'ENEMY' ? (value.baseHitChance ?? 0.8) : null,
    })

  const applyReference = () => {
    if (!ref) return
    let powered = false
    onChange({
      ...value,
      cooldown: ref.cooldown,
      desgastePercent: ref.desgastePercent,
      minLevel: Math.max(value.minLevel, ref.minLevel),
      // o primeiro efeito de Poder recebe a referência
      effects: value.effects.map((e) => {
        if (powered || !POWER_EFFECTS.includes(e.type)) return e
        powered = true
        return { ...e, power: ref.power }
      }),
    })
  }

  const inKit = value.kitSlot !== null || value.kitClass !== null

  return (
    <>
      <FormSection index="01" title="Identidade" description="Nome que o jogador vê e a variante (o poder) da skill.">
        <FormGrid>
          <TextField label="Nome" value={value.name} onChange={(v) => set('name', v)} placeholder="Ex.: Detonação" />
          <SelectField
            label="Variante"
            value={value.variantKey}
            onChange={(v) => set('variantKey', v)}
            options={keyOptions(
              owner
                ? catalog.variants.filter((v) =>
                    [
                      ...((owner.variants as { variantKey: string }[]) ?? []).map((x) => x.variantKey),
                    ].some((k) => k === v.key || v.awakensFromKey === k),
                  )
                : catalog.variants,
            )}
            emptyLabel="Nenhuma (skill sem variante)"
            hint={owner ? `Só as variantes de ${owner.name} (e as despertadas delas).` : 'Escolha o modelo na key para filtrar.'}
          />
          <TextAreaField
            label="Descrição"
            value={value.description}
            onChange={(v) => set('description', v)}
            placeholder="Ex.: Uma explosão concentrada no inimigo da frente."
          />
        </FormGrid>
      </FormSection>

      <FormSection index="02" title="Forma" description="Quem a skill atinge e como. Isso muda os valores de referência ao lado.">
        <FormGrid>
          <Segmented
            label="Tipo (força)"
            value={value.tier}
            onChange={(v) => set('tier', v as SkillBody['tier'])}
            options={Object.entries(tierLabels).map(([v, l]) => ({ value: v, label: l, hint: tierHints[v] }))}
            wide
          />
          <Segmented
            label="Alvo"
            value={value.target}
            onChange={(v) => changeTarget(v as SkillBody['target'])}
            options={toOptions(targetLabels)}
            hint="Aliado e si mesmo não têm teste de acerto."
          />
          <Segmented
            label="Área"
            value={value.area}
            onChange={(v) => set('area', v as SkillBody['area'])}
            options={Object.entries(areaLabels).map(([v, l]) => ({ value: v, label: l, hint: areaHints[v] }))}
          />
          {enemy && (
            <>
              <Segmented
                label="Alcance"
                value={value.range}
                onChange={(v) => set('range', v as SkillBody['range'])}
                options={Object.entries(rangeLabels).map(([v, l]) => ({ value: v, label: l, hint: rangeHints[v] }))}
              />
              <NumberField
                label="Chance de acerto"
                value={value.baseHitChance}
                onChange={(v) => set('baseHitChance', v)}
                step={0.05}
                min={0}
                max={1}
                hint="0 a 1. Ex.: 0,8 = 80% (antes da Precisão e da Esquiva)."
              />
            </>
          )}
        </FormGrid>
      </FormSection>

      <FormSection index="03" title="Custo e recarga" description="Compare com a referência do tipo e da forma escolhidos.">
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <FormGrid cols={3}>
            <NumberField
              label="Recarga"
              value={value.cooldown}
              onChange={(v) => set('cooldown', Math.round(v ?? 0))}
              min={0}
              unit="turnos"
              hint={ref && `Referência: ${ref.cooldown}`}
            />
            <NumberField
              label="Desgaste"
              value={value.desgastePercent}
              onChange={(v) => set('desgastePercent', v ?? 0)}
              step={0.1}
              min={0}
              unit="%"
              hint={ref && `Referência: ${ref.desgastePercent}%`}
            />
            <NumberField
              label="Nível mínimo"
              value={value.minLevel}
              onChange={(v) => set('minLevel', Math.round(v ?? 0))}
              min={0}
              hint={ref && `Referência: ${ref.minLevel}${variant?.awakensFromKey && rules ? ` (despertada: ${rules.awakenedMinLevel})` : ''}`}
            />
          </FormGrid>
          <div className="space-y-2 rounded-card border border-primary/30 bg-primary-dim/40 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">Referência</p>
            {ref ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
                <dt className="text-fg-subtle">Poder</dt>
                <dd className="text-right text-fg">{ref.power}</dd>
                <dt className="text-fg-subtle">Desgaste</dt>
                <dd className="text-right text-fg">{ref.desgastePercent}%</dd>
                <dt className="text-fg-subtle">Recarga</dt>
                <dd className="text-right text-fg">{ref.cooldown}</dd>
                <dt className="text-fg-subtle">Nível</dt>
                <dd className="text-right text-fg">{ref.minLevel}</dd>
              </dl>
            ) : (
              <p className="text-xs text-fg-subtle">Carregando...</p>
            )}
            <Button size="sm" variant="secondary" className="w-full" onClick={applyReference} disabled={!ref}>
              <Wand2 className="size-3.5" /> Usar referência
            </Button>
            {rules && <p className="text-[11px] text-fg-subtle">Poder máximo de qualquer skill: {rules.maxSkillPower}.</p>}
          </div>
        </div>
      </FormSection>

      <FormSection index="04" title="Kit básico" description="O personagem nasce com 4 skills do kit, uma de cada papel. As outras aparecem nos blocos de skill a cada 5 níveis.">
        <Toggle
          label="Faz parte do kit básico"
          checked={inKit}
          onChange={(on) =>
            onChange({ ...value, kitClass: on ? (ownerClass ?? 'VANGUARD') : null, kitSlot: on ? 'BASIC' : null })
          }
          hint={ownerClass && `A classe do kit tem que ser a do modelo (${classLabels[ownerClass]}).`}
        />
        {inKit && (
          <FormGrid>
            <SelectField
              label="Classe do kit"
              value={value.kitClass}
              onChange={(v) => set('kitClass', v as SkillBody['kitClass'])}
              options={toOptions(classLabels)}
            />
            <Segmented
              label="Papel no kit"
              value={value.kitSlot}
              onChange={(v) => set('kitSlot', v as SkillBody['kitSlot'])}
              options={toOptions(kitSlotLabels)}
              hint="Básica, Padrão, Função da classe e Assinatura da variante."
            />
          </FormGrid>
        )}
      </FormSection>

      <FormSection index="05" title="Efeitos" description="O que acontece ao usar, na ordem. Ex.: Dano com Poder 1,0, depois Aplicar status Atordoado.">
        {!value.effects.some((e) => POWER_EFFECTS.includes(e.type)) && value.effects.length === 0 && (
          <Note>Comece por um efeito de Dano, Cura ou Escudo. “Usar referência” preenche o Poder.</Note>
        )}
        <EffectsEditor effects={value.effects} onChange={(effects) => set('effects', effects)} specs={skillEffectSpecs} />
      </FormSection>
    </>
  )
}

import type { ReactNode } from 'react'
import { ArrowLeftRight, Footprints, Loader2, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BattleUnit, Cell, PreviewEffect, TurnOption, UnitSkill } from '@/features/battle/battle-api'
import { displayHp } from '@/features/battle/battle-events'
import { TierPips } from '@/features/characters/skill-card'
import { classLabels } from '@/features/game/game-api'
import { statLabels, statusLabels, tierLabels } from '@/features/game/game-labels'
import { SkillKindIcon, SkillShortTags, SkillTags } from '@/features/game/skill-badges'
import { describeTargeting, explainEffect, skillFacts } from '@/features/game/skill-text'
import { CharacterPortrait } from '@/features/game/character-art'
import { cn } from '@/lib/cn'

/** O que o jogador está escolhendo: uma skill, mover ou trocar. */
export type Mode = { kind: 'SKILL'; skillKey: string } | { kind: 'MOVE' } | { kind: 'SWAP' } | null

const percent = (value: number) => `${Math.round(value * 100)}%`

const repositionLabels = { PUSH: 'Empurra', PULL: 'Puxa', SWAP: 'Troca de lugar', MOVE_ALLY: 'Move aliado', DASH: 'Avança' } as const

/** Linha da prévia de um efeito (números do servidor, já com os modificadores). */
function describePreview(effect: PreviewEffect): string {
  switch (effect.type) {
    case 'DAMAGE':
      return `${Math.round(effect.amount)} de dano`
    case 'HEAL':
      return `+${Math.round(effect.amount)} de HP`
    case 'SHIELD':
      return `+${Math.round(effect.amount)} de escudo`
    case 'STAT_MODIFIER':
      return `${statLabels[effect.stat]} ${effect.percent > 0 ? '+' : ''}${effect.percent}%`
    case 'APPLY_STATUS':
      return `${statusLabels[effect.status]} · ${percent(effect.chance)}`
    case 'REPOSITION':
      return `${repositionLabels[effect.kind]} · ${percent(effect.chance)}`
    case 'TURN_SHIFT':
      return effect.percent >= 0 ? `Adianta a vez ${effect.percent}%` : `Atrasa a vez ${-effect.percent}%`
    case 'RECOVER':
      return `Alivia ${percent(effect.relieved)} do Desgaste`
    case 'CHANGE_FIELD':
      return 'Troca o campo'
    case 'PROTECT':
      return 'Protege'
    case 'GRANT_TURN':
      return 'Age em seguida'
    case 'EXPLOIT':
      return 'Aproveita o status'
  }
}

/**
 * Barra de baixo na vez do jogador: quem age, as 4 skills em slots de tamanho fixo e mover, trocar e defender.
 * O detalhe da skill (por extenso) fica no ActionDetail, à esquerda da grade.
 */
export function ActionBar({ actor, options, loading, mode, chosen, busy, onMode, onChoose, onHoverSkill }: {
  actor: BattleUnit
  options: TurnOption[]
  loading: boolean
  mode: Mode
  chosen: TurnOption | null
  busy: boolean
  onMode: (mode: Mode) => void
  onChoose: (option: TurnOption) => void
  /** Skill sob o mouse (nulo ao sair da barra): o detalhe mostra ela. */
  onHoverSkill: (key: string | null) => void
}) {
  const has = (type: TurnOption['payload']['type']) => options.some((o) => o.payload.type === type)
  const defend = options.find((o) => o.payload.type === 'DEFEND')
  const selectedKey = mode?.kind === 'SKILL' ? mode.skillKey : null

  return (
    <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_9rem]">
      {/* Quem age */}
      <div className="chamfer flex items-center gap-3 p-3 [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(139_92_246/0.5)] [--cut:12px]">
        <CharacterPortrait
          templateKey={actor.templateKey}
          characterClass={actor.characterClass}
          zoom={3.2}
          className="size-12 shrink-0 border border-primary/40 bg-bg"
          iconClassName="size-5 text-primary-soft"
        />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Sua vez</p>
          <p className="truncate font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{actor.name}</p>
          <p className="truncate font-mono text-[10px] text-fg-muted">
            {classLabels[actor.characterClass]} · {displayHp(actor.hp)}/{displayHp(actor.maxHp)} HP
          </p>
        </div>
      </div>

      {/* As 4 skills: em linha a partir de 1536px, 2 x 2 abaixo */}
      <div className="relative grid content-start gap-2 sm:grid-cols-2 2xl:grid-cols-4" onMouseLeave={() => onHoverSkill(null)}>
        {actor.skills.map((skill, i) => (
          <SkillSlot
            key={skill.key}
            skill={skill}
            hotkey={i + 1}
            usable={options.some((o) => o.payload.type === 'SKILL' && o.payload.skillKey === skill.key)}
            active={selectedKey === skill.key}
            disabled={busy || loading}
            onHover={() => onHoverSkill(skill.key)}
            onClick={() => onMode(selectedKey === skill.key ? null : { kind: 'SKILL', skillKey: skill.key })}
          />
        ))}
        {loading && (
          <span className="absolute -top-5 right-0 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
            <Loader2 className="size-3.5 animate-spin" /> Lendo opções
          </span>
        )}
      </div>

      {/* Mover, trocar, defender */}
      <div className="flex flex-wrap gap-2 lg:flex-col">
        <MinorAction icon={Footprints} label="Mover" hint="½ turno" active={mode?.kind === 'MOVE'} disabled={busy || !has('MOVE')} onClick={() => onMode(mode?.kind === 'MOVE' ? null : { kind: 'MOVE' })} />
        <MinorAction icon={ArrowLeftRight} label="Trocar" hint="aliado" active={mode?.kind === 'SWAP'} disabled={busy || !has('SWAP')} onClick={() => onMode(mode?.kind === 'SWAP' ? null : { kind: 'SWAP' })} />
        {defend && <MinorAction icon={Shield} label="Defender" hint="" active={chosen === defend} disabled={busy} onClick={() => onChoose(defend)} />}
      </div>
    </div>
  )
}

/**
 * Painel à esquerda da grade: a skill por extenso (a do mouse, ou a escolhida), a prévia do alvo, as escolhas extras e
 * o Executar.
 */
export function ActionDetail({ actor, mode, chosen, focused, group, busy, error, hoveredSkill, unitName, cellLabel, fieldName, onChoose, onExecute, onCancel }: {
  actor: BattleUnit
  mode: Mode
  chosen: TurnOption | null
  /** Opção sob o mouse (ou a escolhida). */
  focused: TurnOption | null
  /** Opções que dividem o mesmo alvo (as escolhas extras: trocar com, mover para, campo). */
  group: TurnOption[]
  busy: boolean
  error: string | null
  hoveredSkill: string | null
  unitName: (ref: string) => string
  cellLabel: (cell: Cell) => string
  fieldName: (key: string) => string
  onChoose: (option: TurnOption) => void
  onExecute: () => void
  onCancel: () => void
}) {
  const selectedKey = mode?.kind === 'SKILL' ? mode.skillKey : null
  // o detalhe segue o mouse; sem mouse em cima, fica na skill escolhida
  const shown = actor.skills.find((s) => s.key === (hoveredSkill ?? selectedKey))
  const onSelected = !hoveredSkill || hoveredSkill === selectedKey

  return (
    <div className="hud-corners flex h-full flex-col border border-line/60 bg-surface/90 p-4 [--hud-color:var(--color-primary-soft)]">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {shown ? (
          <SkillDetail skill={shown} />
        ) : !focused ? (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Sua vez · {actor.name}</p>
            <p className="text-sm leading-relaxed text-fg-muted">
              {mode?.kind === 'MOVE'
                ? 'Escolha uma célula vazia da sua grade.'
                : mode?.kind === 'SWAP'
                  ? 'Escolha o aliado para trocar de lugar.'
                  : 'Passe o mouse numa skill da barra de baixo para ver o que ela faz. Escolha com 1 a 4 e clique no alvo.'}
            </p>
          </div>
        ) : null}

        {focused && onSelected && (
          <div className="border-t border-line/70 pt-3">
            <OptionPreview option={focused} actor={actor} unitName={unitName} cellLabel={cellLabel} showTitle={!shown} />
          </div>
        )}
        {selectedKey && !focused && onSelected && (
          <p className="border-t border-line/70 pt-3 text-xs text-primary-soft">
            Escolha o alvo no campo: passe o mouse sobre ele para ver o dano e a chance de acerto.
          </p>
        )}

        {chosen && group.length > 1 && (
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Escolha</p>
            <div className="flex flex-wrap gap-1.5">
              {group.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChoose(option)}
                  aria-pressed={option === chosen}
                  className={cn(
                    'focus-ring rounded-control border px-2 py-1 text-xs transition-colors',
                    option === chosen ? 'border-primary-soft bg-primary/20 text-fg' : 'border-line-strong text-fg-muted hover:text-fg',
                  )}
                >
                  {extraLabel(option, unitName, cellLabel, fieldName)}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {(mode || chosen) && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            <X className="size-3.5" /> Esc
          </Button>
        )}
        <Button size="sm" onClick={onExecute} disabled={!chosen || busy}>
          {busy ? 'Enviando...' : 'Executar'}
        </Button>
      </div>
    </div>
  )
}

/** Texto das escolhas extras de uma opção. */
function extraLabel(option: TurnOption, unitName: (ref: string) => string, cellLabel: (cell: Cell) => string, fieldName: (key: string) => string) {
  const p = option.payload
  if (p.type !== 'SKILL') return 'Padrão'
  const parts = [
    p.swapWith && `Trocar com ${cellLabel(p.swapWith)}`,
    p.moveTo && `Ir para ${cellLabel(p.moveTo)}`,
    p.fieldKey && `Campo ${fieldName(p.fieldKey)}`,
  ].filter(Boolean)
  return parts.join(' · ') || (option.preview?.hits.map((h) => unitName(h.ref)).join(', ') ?? 'Padrão')
}

/** Slot da barra: altura fixa e uma linha de cada coisa, para não quebrar em tela nenhuma. */
function SkillSlot({ skill, hotkey, usable, active, disabled, onHover, onClick }: {
  skill: UnitSkill
  hotkey: number
  usable: boolean
  active: boolean
  disabled: boolean
  onHover: () => void
  onClick: () => void
}) {
  const off = !skill.ready || !usable
  // aria-disabled em vez de disabled: botão desabilitado não recebe o mouse, e o detalhe precisa abrir mesmo em recarga
  const blocked = disabled || off
  return (
    <button
      type="button"
      onClick={() => !blocked && onClick()}
      onMouseEnter={onHover}
      onFocus={onHover}
      aria-disabled={blocked}
      aria-pressed={active}
      aria-label={`${hotkey}: ${skill.name}${!skill.ready ? ' (em recarga)' : !usable ? ' (sem alvo)' : ''}`}
      className={cn(
        'focus-ring chamfer relative flex h-19 min-w-0 items-center gap-3 px-3 short:h-16 text-left [--cut:12px] transition-all duration-150 ease-out-soft',
        active
          ? // fundo opaco: o chanfro pinta a borda por baixo, e um fundo translúcido deixaria o roxo claro vazar
            '[--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_0_14px_rgb(139_92_246/0.45)]'
          : '[--chamfer-bg:var(--color-raised)] [--chamfer-border:var(--color-line-strong)] hover:[--chamfer-border:rgb(167_139_250/0.6)]',
        // em recarga ou sem alvo: apagado (padrão de desabilitado do tema); o mouse ainda mostra o detalhe
        blocked && 'cursor-not-allowed',
        off && 'opacity-40',
      )}
    >
      <span className="relative shrink-0">
        <SkillKindIcon skill={skill} />
        <span
          className={cn(
            'absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center border font-mono text-[10px] font-bold',
            active ? 'border-primary-soft bg-primary text-on-primary' : 'border-line-strong bg-bg text-fg',
          )}
        >
          {hotkey}
        </span>
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-display text-base leading-tight font-bold uppercase tracking-wide text-silver-bright">{skill.name}</span>
          {off && (
            <span className={cn('shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest', !skill.ready ? 'text-warning' : 'text-fg-subtle')}>
              {!skill.ready ? 'Recarga' : 'Sem alvo'}
            </span>
          )}
        </span>
        <SkillShortTags skill={skill} />
      </span>
    </button>
  )
}

/** A skill por extenso: papéis, alvo, cada efeito e os dados de uso. */
function SkillDetail({ skill }: { skill: UnitSkill }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <SkillKindIcon skill={skill} className="size-9" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-2">
            <span className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{skill.name}</span>
            <TierPips skill={skill} />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-subtle">{tierLabels[skill.tier]}</span>
            {!skill.ready && <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-warning">Em recarga</span>}
          </p>
          <SkillTags skill={skill} />
        </div>
      </div>
      <p className="text-[13px] leading-snug font-medium text-fg">{describeTargeting(skill)}</p>
      <ul className="space-y-1">
        {skill.effects.map((effect, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-fg-muted">
            <span className="mt-1.5 size-1 shrink-0 bg-primary-soft" />
            {explainEffect(effect)}
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-fg-subtle">
        {skillFacts(skill).map((fact) => (
          <span key={fact}>{fact}</span>
        ))}
      </p>
    </div>
  )
}

function MinorAction({ icon: Icon, label, hint, active, disabled, onClick }: {
  icon: typeof Shield
  label: string
  hint: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'focus-ring chamfer flex h-9 items-center gap-2 px-3 [--cut:7px] transition-all',
        active
          ? 'text-silver-bright [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:var(--color-primary-soft)]'
          : 'text-fg-muted [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:text-fg hover:[--chamfer-border:var(--color-line-strong)]',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      <Icon className="size-4" />
      <span className="font-display text-sm font-bold uppercase tracking-widest">{label}</span>
      {hint && <span className="font-mono text-[9px] text-fg-subtle">{hint}</span>}
    </button>
  )
}

function OptionPreview({ option, actor, unitName, cellLabel, showTitle }: {
  option: TurnOption
  actor: BattleUnit
  unitName: (ref: string) => string
  cellLabel: (cell: Cell) => string
  /** O nome da skill já aparece no detalhe logo acima. */
  showTitle: boolean
}) {
  const p = option.payload
  if (p.type === 'MOVE') return <PreviewTitle title="Mover" detail={`Para ${cellLabel(p.to)} · custa meio turno`} />
  if (p.type === 'SWAP') return <PreviewTitle title="Trocar" detail={`Com ${unitName(p.withRef)} · meio turno para os dois`} />
  if (p.type === 'DEFEND') return <PreviewTitle title="Defender" detail="Nenhuma skill possível nesta vez." />

  const skill = actor.skills.find((s) => s.key === p.skillKey)
  const preview = option.preview
  return (
    <div className="space-y-2">
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">
          {showTitle ? (skill?.name ?? 'Skill') : 'Prévia no alvo'}
        </span>
        {preview && (
          <span className="font-mono text-[10px] text-fg-muted">
            Força {percent(preview.potency)} · Desgaste {preview.desgaste.cost.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            {preview.desgaste.cost > preview.desgaste.slack && <span className="text-warning"> · passa do piso</span>}
          </span>
        )}
      </p>
      <ul className="space-y-1.5">
        {preview?.hits.map((hit) => (
          <li key={hit.ref} className="text-xs">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold text-fg">{unitName(hit.ref)}</span>
              <span className="shrink-0 font-mono text-[10px] text-fg-muted">
                {hit.hitChance < 1 && `${percent(hit.hitChance)} acerto`}
                {hit.falloff < 1 && ` · ${percent(hit.falloff)}`}
              </span>
            </span>
            <span className="block text-fg-muted">{hit.effects.map(describePreview).join(' · ')}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-fg-subtle">Chances são probabilidades: o resultado sai da seed do servidor.</p>
    </div>
  )
}

function PreviewTitle({ title, detail }: { title: string; detail?: ReactNode }) {
  return (
    <div>
      <p className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{title}</p>
      {detail && <p className="font-mono text-[10px] text-fg-muted">{detail}</p>}
    </div>
  )
}

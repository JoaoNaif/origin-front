import type { CSSProperties, ReactNode } from 'react'
import { ArrowLeftRight, Footprints, Loader2, PawPrint, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BattleUnit, Cell, PreviewEffect, TurnOption, UnitSkill } from '@/features/battle/battle-api'
import { displayHp } from '@/features/battle/battle-events'
import { TierPips } from '@/features/characters/skill-card'
import { classLabels } from '@/features/game/game-api'
import { statLabels, statusLabels, tierLabels } from '@/features/game/game-labels'
import { SkillKindIcon, SkillShortTags, SkillTags } from '@/features/game/skill-badges'
import { describeTargeting, explainEffect, skillFacts } from '@/features/game/skill-text'
import { CharacterPortrait } from '@/features/game/character-art'
import { domPillarColors, domPillarIcons, domPillarLabels } from '@/features/game/dom-labels'
import { contractLabels } from '@/features/beasts/beast-labels'
import { BeastEmblem } from '@/features/beasts/beast-ui'
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
    case 'CLEANSE':
      return effect.status ? `Tira ${statusLabels[effect.status]}` : 'Nada para tirar'
    case 'PROTECT':
      return 'Protege'
    case 'GRANT_TURN':
      return 'Age em seguida'
    case 'EXPLOIT':
      return 'Aproveita o status'
    case 'WEAKEN':
      return `Todos os atributos ${effect.percent}% · ${percent(effect.chance)}`
    case 'INVULNERABLE':
      return 'Anula todo o dano até o próximo turno'
  }
}

/**
 * Barra de baixo na vez do jogador: quem age, as 4 skills em slots de tamanho fixo e mover, trocar e defender.
 * O detalhe da skill (por extenso) fica no ActionDetail, à esquerda da grade.
 */
export function ActionBar({ actor, options, loading, mode, chosen, group, busy, unitName, cellLabel, fieldName, onMode, onChoose, onPreview, onHoverSkill }: {
  actor: BattleUnit
  options: TurnOption[]
  loading: boolean
  mode: Mode
  chosen: TurnOption | null
  /** Opções que dividem o alvo clicado (as escolhas extras: trocar com, mover para, campo). */
  group: TurnOption[]
  busy: boolean
  unitName: (ref: string) => string
  cellLabel: (cell: Cell) => string
  fieldName: (key: string) => string
  onMode: (mode: Mode) => void
  /** Envia a jogada. */
  onChoose: (option: TurnOption) => void
  /** Mouse numa escolha extra: a prévia mostra ela. */
  onPreview: (option: TurnOption) => void
  /** Skill sob o mouse (nulo ao sair da barra): o detalhe mostra ela. */
  onHoverSkill: (key: string | null) => void
}) {
  const has = (type: TurnOption['payload']['type']) => options.some((o) => o.payload.type === type)
  const defend = options.find((o) => o.payload.type === 'DEFEND')
  const selectedKey = mode?.kind === 'SKILL' ? mode.skillKey : null
  // a tecla é a posição na lista do servidor: as 4 da build primeiro, as únicas do DOM depois (5 em diante)
  const slots = actor.skills.map((skill, i) => ({ skill, hotkey: i + 1 }))
  // a invocação de besta é de uso único mas fica no slot dela na build; a faixa de cima é só das skills únicas do DOM
  const isDom = (skill: UnitSkill) => skill.singleUse && !!skill.domPillar
  const build = slots.filter((s) => !isDom(s.skill))
  const dom = slots.filter((s) => isDom(s.skill))
  // com a faixa do DOM na 1ª linha, o resto vai para a 2ª (senão o auto-posicionamento sobe o card para o lado dela)
  const row2 = dom.length ? 'lg:row-start-2' : undefined

  const slotProps = (skill: UnitSkill) => ({
    usable: options.some((o) => o.payload.type === 'SKILL' && o.payload.skillKey === skill.key),
    active: selectedKey === skill.key,
    disabled: busy || loading,
    onHover: () => onHoverSkill(skill.key),
    onClick: () => onMode(selectedKey === skill.key ? null : { kind: 'SKILL', skillKey: skill.key }),
  })

  // escolhas extras logo acima da skill escolhida: a jogada só sai com uma delas
  const extras = (skill: UnitSkill, align: 'left' | 'right') =>
    selectedKey === skill.key &&
    chosen &&
    group.length > 1 && (
      <ExtraChoices
        group={group}
        chosen={chosen}
        busy={busy}
        align={align}
        label={(option) => extraLabel(option, unitName, cellLabel, fieldName)}
        onChoose={onChoose}
        onPreview={onPreview}
      />
    )

  return (
    <div className="relative grid gap-x-3 gap-y-2 lg:grid-cols-[13rem_minmax(0,1fr)_9rem]">
      {/*
        Skills únicas do DOM: faixa fina acima da build (linha própria, só na coluna das skills), em chips na cor do
        pilar. Formato diferente de propósito: é um trunfo de uso único, não uma 5ª skill.
      */}
      {dom.length > 0 && (
        <div className="flex min-w-0 items-center gap-3 lg:col-start-2" onMouseLeave={() => onHoverSkill(null)}>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-fg-subtle">
            <span className="size-1.5 rotate-45 bg-silver/60" />
            DOM
            <span className="hidden text-fg-subtle/70 sm:inline">· uso único</span>
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {dom.map(({ skill, hotkey }) => (
              <div key={skill.key} className="relative">
                {extras(skill, 'left')}
                <DomChip skill={skill} hotkey={hotkey} {...slotProps(skill)} />
              </div>
            ))}
          </div>
          <span className="h-px min-w-6 flex-1 bg-linear-to-r from-line-strong to-transparent" />
        </div>
      )}

      <ActorCard actor={actor} className={row2} />

      {/* As 4 da build: em linha a partir de 1536px, 2 x 2 abaixo */}
      <div className={cn('grid content-start gap-2 sm:grid-cols-2 2xl:grid-cols-4', row2)} onMouseLeave={() => onHoverSkill(null)}>
        {build.map(({ skill, hotkey }, i) => (
          <div key={skill.key} className="relative min-w-0">
            {extras(skill, i % 2 === 0 ? 'left' : 'right')}
            <SkillSlot skill={skill} hotkey={hotkey} {...slotProps(skill)} />
          </div>
        ))}
      </div>

      {/* Mover, trocar, defender */}
      <div className={cn('flex flex-wrap gap-2 lg:flex-col', row2)}>
        <MinorAction icon={Footprints} label="Mover" hint="½ turno" active={mode?.kind === 'MOVE'} disabled={busy || !has('MOVE')} onClick={() => onMode(mode?.kind === 'MOVE' ? null : { kind: 'MOVE' })} />
        <MinorAction icon={ArrowLeftRight} label="Trocar" hint="aliado" active={mode?.kind === 'SWAP'} disabled={busy || !has('SWAP')} onClick={() => onMode(mode?.kind === 'SWAP' ? null : { kind: 'SWAP' })} />
        {defend && <MinorAction icon={Shield} label="Defender" hint="" active={chosen === defend} disabled={busy} onClick={() => onChoose(defend)} />}
      </div>

      {loading && (
        <span className="absolute -top-5 right-0 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
          <Loader2 className="size-3.5 animate-spin" /> Lendo opções
        </span>
      )}
    </div>
  )
}

/** Quem age: retrato, nome, classe e a vida em barra. */
function ActorCard({ actor, className }: { actor: BattleUnit; className?: string }) {
  const hp = actor.maxHp ? Math.max(0, Math.min(100, (actor.hp / actor.maxHp) * 100)) : 0
  const beast = actor.beast
  return (
    <div
      title={beast ? `Besta · ${contractLabels[beast.contract]}` : classLabels[actor.characterClass]}
      className={cn('chamfer flex items-center gap-3 p-3 [--chamfer-bg:var(--color-primary-dim)] [--chamfer-border:rgb(139_92_246/0.5)] [--cut:12px]', className)}
    >
      {beast ? (
        <BeastEmblem grade={beast.grade} contract={beast.contract} size="md" />
      ) : (
        <CharacterPortrait
          templateKey={actor.templateKey}
          characterClass={actor.characterClass}
          zoom={3.2}
          className="size-12 shrink-0 border border-primary/40 bg-bg"
          iconClassName="size-5 text-primary-soft"
        />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">
          {beast ? (
            <>
              Besta <span className="text-beast">· {beast.turnsLeft}t em campo</span>
            </>
          ) : (
            'Sua vez'
          )}
        </p>
        <p className="truncate font-display text-lg leading-none font-bold uppercase tracking-wide text-silver-bright">{actor.name}</p>
        <div className="flex items-center gap-2">
          <span className="h-1 flex-1 bg-overlay">
            <span className={cn('block h-full', hp > 50 ? 'bg-success' : hp > 25 ? 'bg-warning' : 'bg-danger')} style={{ width: `${hp}%` }} />
          </span>
          <span className="shrink-0 font-mono text-[10px] text-fg-muted tabular-nums">
            {displayHp(actor.hp)}/{displayHp(actor.maxHp)}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Escolhas extras de uma skill (trocar com, mover para, campo): a jogada sai no clique numa delas. */
function ExtraChoices({ group, chosen, busy, align, label, onChoose, onPreview }: {
  group: TurnOption[]
  chosen: TurnOption
  busy: boolean
  align: 'left' | 'right'
  label: (option: TurnOption) => string
  onChoose: (option: TurnOption) => void
  onPreview: (option: TurnOption) => void
}) {
  return (
    <div
      className={cn(
        'absolute bottom-full z-30 mb-2 w-max max-w-sm min-w-full space-y-2 border border-primary-soft/70 bg-primary-dim p-3 shadow-[0_0_18px_rgb(139_92_246/0.35)]',
        align === 'left' ? 'left-0' : 'right-0',
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Escolha como usar · {group.length} opções</p>
      <div className="grid max-h-52 gap-1.5 overflow-y-auto">
        {group.map((option, j) => (
          <button
            key={j}
            type="button"
            onClick={() => onChoose(option)}
            onMouseEnter={() => !busy && onPreview(option)}
            disabled={busy}
            aria-pressed={option === chosen}
            className={cn(
              'focus-ring rounded-control border px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-40',
              option === chosen ? 'border-primary-soft bg-primary/25 text-fg' : 'border-line-strong bg-surface text-fg-muted hover:border-primary-soft/60 hover:text-fg',
            )}
          >
            {label(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Painel à esquerda da grade: a skill por extenso (a do mouse, ou a escolhida) e a prévia do alvo. As escolhas extras
 * ficam acima da skill na ActionBar. Não há "Executar": o clique no alvo (ou na escolha extra) já envia a jogada.
 */
export function ActionDetail({ actor, mode, chosen, focused, busy, error, hoveredSkill, unitName, cellLabel, onCancel }: {
  actor: BattleUnit
  mode: Mode
  chosen: TurnOption | null
  /** Opção sob o mouse (ou a escolhida). */
  focused: TurnOption | null
  busy: boolean
  error: string | null
  hoveredSkill: string | null
  unitName: (ref: string) => string
  cellLabel: (cell: Cell) => string
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
                  : 'Passe o mouse numa skill da barra de baixo para ver o que ela faz. Escolha pela tecla do número e clique no alvo.'}
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

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {(busy || mode || chosen) && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {busy ? (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">
              <Loader2 className="size-3.5 animate-spin" /> Enviando
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="size-3.5" /> Esc
            </Button>
          )}
        </div>
      )}
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
        '@container focus-ring chamfer relative flex h-19 w-full min-w-0 items-center gap-3 px-3 short:h-16 text-left [--cut:12px] transition-all duration-150 ease-out-soft',
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
              {!skill.ready ? (skill.singleUse ? 'Usada' : 'Recarga') : 'Sem alvo'}
            </span>
          )}
        </span>
        <SkillShortTags skill={skill} />
      </span>
      {/* recarga e Desgaste: só quando o slot é largo (container query), para não apertar o nome */}
      <span className="hidden shrink-0 flex-col items-end gap-1 border-l border-line/70 pl-3 font-mono text-[10px] leading-none text-fg-subtle tabular-nums @[19rem]:flex">
        <span title="Recarga depois de usar">
          {skill.singleUse ? (
            <span className="text-beast">uso único</span>
          ) : skill.cooldown ? (
            <>
              <span className="text-fg-muted">{skill.cooldown}</span> {skill.cooldown === 1 ? 'turno' : 'turnos'}
            </>
          ) : (
            'sem recarga'
          )}
        </span>
        <span title="Desgaste ao usar">
          <span className="text-warning/80">{skill.desgastePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span> desg.
        </span>
      </span>
    </button>
  )
}

/**
 * Skill única do DOM na faixa acima da build: chip fino em paralelogramo, na cor do pilar (não é um slot como as
 * skills). Pronta, o losango brilha; escolhida, acende inteira; usada, fica riscada e apagada até o fim.
 */
function DomChip({ skill, hotkey, usable, active, disabled, onHover, onClick }: {
  skill: UnitSkill
  hotkey: number
  usable: boolean
  active: boolean
  disabled: boolean
  onHover: () => void
  onClick: () => void
}) {
  const pillar = skill.domPillar ?? 'MIND'
  const Icon = domPillarIcons[pillar]
  const used = !skill.ready
  const off = used || !usable
  const blocked = disabled || off

  return (
    <button
      type="button"
      onClick={() => !blocked && onClick()}
      onMouseEnter={onHover}
      onFocus={onHover}
      aria-disabled={blocked}
      aria-pressed={active}
      aria-label={`${hotkey}: ${skill.name}, skill única do DOM (${domPillarLabels[pillar]})${used ? ', usada' : !usable ? ', sem alvo' : ''}`}
      style={{ '--tone': domPillarColors[pillar] } as CSSProperties}
      className={cn('focus-ring group relative flex h-8 items-center outline-offset-4', blocked && 'cursor-not-allowed', off && 'opacity-40 grayscale')}
    >
      {/* o fundo inclinado; o conteúdo fica reto por cima */}
      <span
        className={cn(
          'absolute inset-0 -skew-x-[18deg] border transition-all duration-200 ease-out-soft',
          active
            ? 'border-(--tone) bg-(--tone)/25 shadow-[0_0_18px_color-mix(in_srgb,var(--tone)_45%,transparent)]'
            : off
              ? 'border-line bg-surface/60'
              : 'border-(--tone)/45 bg-linear-to-r from-(--tone)/15 to-(--tone)/2 group-hover:border-(--tone) group-hover:shadow-[0_0_14px_color-mix(in_srgb,var(--tone)_30%,transparent)]',
        )}
      />
      {/* filete na cor do pilar à esquerda */}
      {!off && <span className="absolute inset-y-1 left-1 w-0.5 -skew-x-[18deg] bg-(--tone)" />}

      <span className="relative flex items-center gap-2 pr-1.5 pl-4">
        <span className="relative flex size-4 items-center justify-center">
          {!off && !active && <span className="absolute inset-0 rotate-45 bg-(--tone)/25 motion-safe:animate-ping [animation-duration:2.4s]" />}
          <Icon className="relative size-3.5 text-(--tone)" />
        </span>
        <span
          className={cn(
            'font-display text-sm leading-none font-bold uppercase tracking-wider whitespace-nowrap',
            active ? 'text-white' : 'text-silver-bright',
            used && 'line-through decoration-fg-subtle',
          )}
        >
          {skill.name}
        </span>
        <span className="font-mono text-[9px] leading-none uppercase tracking-[0.16em] whitespace-nowrap text-(--tone)/80">
          {used ? 'usada' : !usable ? 'sem alvo' : domPillarLabels[pillar]}
        </span>
        <kbd
          className={cn(
            'ml-1 flex size-4.5 items-center justify-center border font-mono text-[9px] font-bold',
            active ? 'border-(--tone) bg-(--tone) text-bg' : 'border-(--tone)/50 bg-bg/80 text-fg',
          )}
        >
          {hotkey}
        </kbd>
      </span>
    </button>
  )
}

function SkillDetail({ skill }: { skill: UnitSkill }) {
  const facts = skill.singleUse ? ['Uso único na batalha', 'Sem Desgaste', 'Sempre acerta'] : skillFacts(skill)
  return (
    <div className="space-y-2">
      {skill.singleUse && skill.domPillar && (
        <p
          style={{ '--tone': domPillarColors[skill.domPillar] } as CSSProperties}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--tone)"
        >
          Skill única do DOM · {domPillarLabels[skill.domPillar]} avançado
        </p>
      )}
      {skill.beastKey && (
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-beast">
          <PawPrint className="size-3.5" /> Invocação de besta · gasta a vez inteira
        </p>
      )}
      <div className="flex items-start gap-3">
        <SkillKindIcon skill={skill} className="size-9" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-2">
            <span className="font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{skill.name}</span>
            <TierPips skill={skill} />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-subtle">{tierLabels[skill.tier]}</span>
            {!skill.ready && <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-warning">{skill.singleUse ? 'Usada' : 'Em recarga'}</span>}
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
        {facts.map((fact) => (
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

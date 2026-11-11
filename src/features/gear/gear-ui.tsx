import type { CSSProperties, ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, Crown, Flame, Link2, ShieldAlert, Sparkle, TrendingDown, TrendingUp, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Term } from '@/components/ui/term'
import type { GearBond, GearBondLevel, GearGrade, GearKind, GearLineage, GearRequirement, StatPercents } from '@/features/gear/gear-api'
import {
  bondLabels,
  bondTones,
  fmt,
  gradeColors,
  gradeLabels,
  kindIcons,
  lineageCostTarget,
  passiveLabels,
  passiveText,
  percentEntries,
  requirementLevelLabels,
} from '@/features/gear/gear-labels'
import { statLabels, statOrder, statShort } from '@/features/game/game-labels'
import { gearTerms } from '@/features/game/glossary'
import { cn } from '@/lib/cn'

// Peças visuais do equipamento vivo: emblema (sem arquivo de arte, o ícone do tipo na cor do grau), grau, elo,
// requisitos e o efeito. Usadas no Arsenal, na ficha, no baú e na batalha.

const tone = (grade: GearGrade) => ({ '--tone': gradeColors[grade] }) as CSSProperties

/** Tamanhos do emblema: a caixa com o corte do chanfro e o ícone. */
const emblemSizes = {
  xs: ['size-9 [--cut:6px]', 'size-4'],
  sm: ['size-10 [--cut:7px]', 'size-4'],
  md: ['size-12 [--cut:9px]', 'size-5'],
  lg: ['size-14 [--cut:10px]', 'size-6'],
  xl: ['size-16 [--cut:12px]', 'size-7'],
  hero: ['size-24 [--cut:16px]', 'size-11'],
} as const

/** Emblema do equipamento: chanfro na cor do grau, com o ícone de arma ou armadura. */
export function GearEmblem({ kind, grade, size = 'md', className }: { kind: GearKind; grade: GearGrade; size?: keyof typeof emblemSizes; className?: string }) {
  const Icon = kindIcons[kind]
  const [box, icon] = emblemSizes[size]
  return (
    <span
      style={tone(grade)}
      className={cn(
        'chamfer flex shrink-0 items-center justify-center [--chamfer-bg:var(--color-bg)] [--chamfer-border:color-mix(in_srgb,var(--tone)_60%,transparent)]',
        box,
        grade === 'DIVINE' && 'shadow-[0_0_24px_-6px_var(--tone)]',
        className,
      )}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-px bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--tone)_30%,transparent),transparent_70%)] [clip-path:var(--chamfer-shape)]" />
      <Icon className={cn('relative text-(--tone)', icon)} />
    </span>
  )
}

/** Etiqueta do grau, na cor dele. */
export function GradeTag({ grade, className }: { grade: GearGrade; className?: string }) {
  return (
    <span
      style={tone(grade)}
      title={`Grau ${gradeLabels[grade]}`}
      className={cn(
        'inline-flex items-center gap-1 border border-(--tone)/50 bg-(--tone)/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-(--tone)',
        className,
      )}
    >
      {grade === 'DIVINE' && <Crown className="size-3" />}
      {gradeLabels[grade]}
    </span>
  )
}

export function BondBadge({ bond, className }: { bond: GearBondLevel; className?: string }) {
  return (
    <Badge tone={bondTones[bond]} className={className}>
      <Link2 className="size-3" /> {bondLabels[bond]}
    </Badge>
  )
}

/** "+3% ATQ" por stat; `tone` = cor das quedas ou dos bônus. */
export function PercentChips({ percents, className }: { percents: StatPercents; className?: string }) {
  const entries = percentEntries(percents)
  if (entries.length === 0) return null
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {entries.map(([stat, value]) => (
        <span
          key={stat}
          title={statLabels[stat]}
          className={cn(
            'border px-1.5 py-px font-mono text-[11px] font-bold tabular-nums',
            value > 0 ? 'border-success/40 bg-success/10 text-success' : 'border-danger/40 bg-danger-dim text-danger-hover',
          )}
        >
          {value > 0 ? '+' : '−'}
          {fmt(Math.abs(value))}% {statShort[stat]}
        </span>
      ))}
    </span>
  )
}

/** Requisitos do elo; com `met`, cada um marcado como cumprido ou não. */
export function RequirementChips({ requirements, className }: { requirements: (GearRequirement & { met?: boolean })[]; className?: string }) {
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {requirements.map((r) => {
        const Icon = r.met === undefined ? null : r.met ? Check : X
        return (
          <span
            key={r.stat}
            title={`${statLabels[r.stat]} ${requirementLevelLabels[r.level]}: ${r.level === 'HIGH' ? 'entre os 2 maiores' : 'entre os 2 menores'} atributos do portador`}
            className={cn(
              'inline-flex items-center gap-1 border px-1.5 py-px font-mono text-[11px]',
              r.met === undefined
                ? 'border-line-strong bg-raised text-fg-muted'
                : r.met
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-line bg-bg/40 text-fg-subtle',
            )}
          >
            {Icon && <Icon className="size-3" />}
            {statShort[r.stat]} {requirementLevelLabels[r.level]}
          </span>
        )
      })}
    </span>
  )
}

const termText = (term: string) => gearTerms.find((t) => t.term === term)?.text ?? ''

/** Rótulo de seção do elo (mono, com a explicação do glossário no hover). */
function SectionLabel({ term, children, right }: { term?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <p className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
      {term ? (
        <Term title={term} info={termText(term)} className="uppercase">
          {children}
        </Term>
      ) : (
        <span>{children}</span>
      )}
      {right && <span className="normal-case tracking-normal">{right}</span>}
    </p>
  )
}

const meterSteps: GearBondLevel[] = ['NONE', 'PARTIAL', 'FULL']
const meterColor: Record<GearBondLevel, string> = {
  NONE: 'var(--color-danger-hover)',
  PARTIAL: 'var(--color-warning)',
  FULL: 'var(--color-success)',
}

/** Medidor do elo: as 3 faixas (sem elo, parcial, pleno), a atual acesa na cor dela. */
function BondMeter({ bond }: { bond: GearBond }) {
  const total = bond.requirements.length
  const covered = Math.min(total, bond.met + bond.waived)
  const missing = total - covered
  const current = meterSteps.indexOf(bond.bond)
  return (
    <div style={{ '--tone': meterColor[bond.bond] } as CSSProperties} className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <p className="font-display text-2xl leading-none font-extrabold uppercase italic text-(--tone)">{bondLabels[bond.bond]}</p>
        <p className="font-mono text-[11px] text-fg-muted tabular-nums">
          <span className="text-base text-fg">{covered}</span>/{total} requisitos
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {meterSteps.map((step, i) => (
          <span key={step} className="space-y-1">
            <span
              className={cn(
                'block h-1.5 -skew-x-[20deg] transition-colors',
                i <= current ? 'bg-(--tone)' : 'bg-overlay',
                i === current && 'shadow-[0_0_10px_color-mix(in_srgb,var(--tone)_60%,transparent)]',
              )}
            />
            <span className={cn('block font-mono text-[9px] uppercase tracking-[0.14em]', i === current ? 'text-(--tone)' : 'text-fg-subtle')}>
              {bondLabels[step].replace('Elo ', '')}
            </span>
          </span>
        ))}
      </div>
      <p className="text-xs leading-snug text-fg-muted">
        {bond.bond === 'FULL'
          ? 'Todos os requisitos cumpridos: bônus e passiva no máximo.'
          : `${missing > 1 ? 'Faltam' : 'Falta'} ${missing} ${missing > 1 ? 'requisitos' : 'requisito'} para o elo pleno. Sem ele, o equipamento rende menos e cobra na batalha.`}
      </p>
    </div>
  )
}

/** Os requisitos, um por linha, com o que "alto" e "baixo" querem dizer. */
function RequirementList({ bond, holder }: { bond: GearBond; holder?: string }) {
  const of = holder ? ` de ${holder}` : ''
  return (
    <ul className="divide-y divide-line/50 border border-line/60 bg-bg/40">
      {bond.requirements.map((r) => {
        const high = r.level === 'HIGH'
        const Arrow = high ? ArrowUp : ArrowDown
        return (
          <li key={r.stat} className="flex items-center gap-2.5 px-2.5 py-1.5">
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center border',
                r.met ? 'border-success/60 bg-success/15 text-success' : 'border-line-strong text-fg-subtle',
              )}
            >
              {r.met ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            <span className={cn('min-w-0 flex-1 truncate font-display text-sm font-bold uppercase tracking-wide', r.met ? 'text-fg' : 'text-fg-muted')}>
              {statLabels[r.stat]}
            </span>
            <span
              title={`${statLabels[r.stat]} precisa estar entre os 2 ${high ? 'maiores' : 'menores'} atributos${of}`}
              className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-fg-subtle"
            >
              <Arrow className={cn('size-3', high ? 'text-primary-soft' : 'text-info')} />
              entre os 2 {high ? 'maiores' : 'menores'}
            </span>
          </li>
        )
      })}
      {bond.waived > 0 && (
        <li className="flex items-center gap-2.5 px-2.5 py-1.5">
          <Crown className="size-4 shrink-0 text-primary-soft" />
          <span className="text-xs text-fg-muted">
            <span className="font-semibold text-primary-soft">+{bond.waived}</span> {bond.waived > 1 ? 'cobertos' : 'coberto'}{' '}
            {bond.matchingTitles.length ? (
              <>
                pelo título <span className="text-fg">{bond.matchingTitles.join(', ')}</span>
              </>
            ) : (
              'pelo traço Prodígio'
            )}
          </span>
        </li>
      )}
    </ul>
  )
}

/** Bloco de "o que muda": cantos na cor do tipo, rótulo com hover e o conteúdo. */
function EffectCard({ icon: Icon, label, term, color, children }: {
  icon: typeof Flame
  label: string
  term?: string
  color: string
  children: ReactNode
}) {
  return (
    <div style={{ '--hud-color': color, '--tone': color } as CSSProperties} className="hud-corners space-y-1.5 border border-line/50 bg-surface/60 p-3">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-(--tone)">
        <Icon className="size-3.5 shrink-0" />
        {term ? (
          <Term title={term} info={termText(term)} className="uppercase">
            {label}
          </Term>
        ) : (
          label
        )}
      </p>
      <div className="text-xs leading-relaxed text-fg-muted">{children}</div>
    </div>
  )
}

/** Atributos com %, por extenso ("+9,6% Ataque"); iguais nos 7 viram uma linha só. */
function StatPercentList({ percents }: { percents: StatPercents }) {
  const entries = percentEntries(percents)
  const uniform = entries.length === statOrder.length && entries.every(([, v]) => v === entries[0][1])
  if (uniform) {
    const v = entries[0][1]
    return (
      <p className={cn('font-mono text-sm font-bold tabular-nums', v > 0 ? 'text-success' : 'text-danger-hover')}>
        {v > 0 ? '+' : '−'}
        {fmt(Math.abs(v))}% <span className="font-sans text-xs font-normal text-fg-muted">em todos os atributos</span>
      </p>
    )
  }
  return (
    <ul className="space-y-0.5">
      {entries.map(([stat, v]) => (
        <li key={stat} className="flex items-baseline justify-between gap-3">
          <span className="text-fg-muted">{statLabels[stat]}</span>
          <span className={cn('font-mono text-sm font-bold tabular-nums', v > 0 ? 'text-success' : 'text-danger-hover')}>
            {v > 0 ? '+' : '−'}
            {fmt(Math.abs(v))}%
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * O elo de um personagem com o equipamento e o que ele faz, em três partes: o medidor (sem elo, parcial, pleno), os
 * requisitos linha a linha e "o que muda" em blocos (bônus de sempre, queda e custo na batalha, passiva e rebeldia).
 * Cada rótulo tem a explicação do glossário no hover. Os números vêm prontos do servidor.
 */
export function BondDetails({ bond, lineage, holder, compact }: {
  bond: GearBond
  lineage: GearLineage
  /** Nome de quem usaria, para as frases ("entre os 2 maiores de Gaia"). */
  holder?: string
  compact?: boolean
}) {
  const { effects } = bond
  const hasPenalty = percentEntries(effects.penaltyPercents).length > 0
  const hasBonus = percentEntries(effects.bonusPercents).length > 0

  return (
    <div className="@container space-y-5">
      <BondMeter bond={bond} />

      <div className="space-y-2">
        <SectionLabel term="Elo" right="pleno = todos · parcial = metade">
          Requisitos
        </SectionLabel>
        <RequirementList bond={bond} holder={holder} />
      </div>

      <div className="space-y-2">
        <SectionLabel>O que muda</SectionLabel>
        <div className="grid gap-2 @md:grid-cols-2">
          {hasBonus && (
            <EffectCard icon={TrendingUp} label="Bônus · sempre" color="var(--color-success)">
              <StatPercentList percents={effects.bonusPercents} />
            </EffectCard>
          )}
          {hasPenalty && (
            <EffectCard icon={TrendingDown} label="Queda · na batalha" term="Custo e rebeldia" color="var(--color-danger-hover)">
              <StatPercentList percents={effects.penaltyPercents} />
              <p className="mt-1 text-[11px] text-fg-subtle">Por não ter elo pleno.</p>
            </EffectCard>
          )}
          {effects.initialDesgastePercent > 0 && (
            <EffectCard icon={Flame} label="Custo · início da batalha" term="Custo e rebeldia" color="var(--color-warning)">
              Desgaste de <b className="font-mono text-warning">{fmt(effects.initialDesgastePercent)}%</b> no {lineageCostTarget[lineage]}.
            </EffectCard>
          )}
          <EffectCard icon={Sparkle} label={`Passiva · ${passiveLabels[effects.passive.type]}`} term="Passiva" color="var(--color-primary-soft)">
            {passiveText(effects.passive)}.
          </EffectCard>
          {effects.loseAction && (
            <EffectCard icon={ShieldAlert} label="Rebeldia · age sozinho" term="Custo e rebeldia" color="var(--color-danger-hover)">
              <p>Pode tirar a vez de quem usa:</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] tabular-nums">
                <span>
                  <b className="text-danger-hover">{fmt(effects.loseAction.start)}%</b> no 1º turno
                </span>
                <span className="text-fg-subtle">→</span>
                <span>
                  <b className="text-danger-hover">+{fmt(effects.loseAction.step)}%</b> por turno
                </span>
                <span className="text-fg-subtle">→</span>
                <span>
                  até <b className="text-danger-hover">{fmt(effects.loseAction.max)}%</b>
                </span>
              </p>
            </EffectCard>
          )}
        </div>
      </div>

      {!compact && bond.bond !== 'FULL' && (
        <p className="text-[11px] leading-snug text-fg-subtle">
          O elo sai dos atributos do personagem (nível, pontos livres, traços e DOM): mudou os pontos livres, o elo muda. Na batalha vale o do
          início.
        </p>
      )}
    </div>
  )
}

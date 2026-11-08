import { useState, type CSSProperties } from 'react'
import { AlertTriangle, ChevronDown, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { difficultyLabels, useDomRules, type AiDifficulty, type CharacterDom, type DomChange, type DomPillarState, type DomRules } from '@/features/game/game-api'
import {
  domLevelLabels,
  domLevelOrder,
  domLevelRank,
  domPillarColors,
  domPillarIcons,
  domPillarLabels,
  domPillarThemes,
  domRoleLabels,
  domRoleOrder,
} from '@/features/game/dom-labels'
import { statLabels } from '@/features/game/game-labels'
import { cn } from '@/lib/cn'

// DOM na ficha (D152): visível, é treino e não segredo. Os números vêm do personagem (`dom`) e de `GET /dom-rules`.
// Só mostra: quem conta feitos, sobe e derruba pilar é o servidor, no fim da batalha.

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

/** Os 4 pilares, com a janela de batalhas no topo. */
export function DomPanel({ dom }: { dom: CharacterDom }) {
  const rules = useDomRules()
  const window = rules.data?.window
  const fill = window ? Math.min(100, (dom.windowWeight / window) * 100) : 0

  return (
    <div className="space-y-4">
      {/* janela: quanto já jogou das últimas batalhas que contam */}
      <div className="chamfer relative overflow-hidden px-4 py-3 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:10px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Janela de treino · <span className="text-fg">{fmt(dom.windowWeight)}</span>
            {window && <span> / {window} de peso</span>}
          </p>
          <p className="text-xs text-fg-muted">
            Os pontos são os feitos das últimas batalhas. Quem para de treinar cai de nível.
          </p>
        </div>
        <div className="mt-2 h-1 -skew-x-12 bg-overlay">
          <div className="h-full bg-linear-to-r from-silver/40 to-silver transition-[width] duration-700 ease-out-soft" style={{ width: `${fill}%` }} />
        </div>
        {rules.data && (
          <p className="mt-2 font-mono text-[10px] text-fg-subtle">
            Peso por batalha contra a máquina:{' '}
            {Object.entries(rules.data.pveWeights)
              .map(([d, w]) => `${difficultyLabels[d as AiDifficulty] ?? d} ${fmt(w)}`)
              .join(' · ')}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {dom.pillars.map((pillar) => (
          <PillarCard key={pillar.pillar} state={pillar} rules={rules.data} />
        ))}
      </div>

      <Link
        to="/guia#dom"
        className="focus-ring group flex w-fit items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle transition-colors hover:text-primary-soft"
      >
        <Sparkles className="size-3.5" /> Todos os feitos e as skills únicas no Guia
      </Link>
    </div>
  )
}

function PillarCard({ state, rules }: { state: DomPillarState; rules?: DomRules }) {
  const [open, setOpen] = useState(false)
  const { pillar, level, points, nextLevel, nextThreshold, lossBelow, title } = state
  const Icon = domPillarIcons[pillar]
  const info = rules?.pillars.find((p) => p.pillar === pillar)
  const levelRule = (l: typeof level) => rules?.levels.find((r) => r.level === l)
  const current = levelRule(level)
  const next = levelRule(nextLevel)
  const rank = domLevelRank(level)
  const atRisk = lossBelow !== null && points < lossBelow
  // no avançado não há próximo: a régua é o limiar do próprio nível (o piso da perda é 70% dele)
  const goal = nextThreshold ?? (lossBelow !== null && rules ? lossBelow / rules.lossShare : points)
  const fill = goal ? Math.min(100, (points / goal) * 100) : 100
  const lossMark = lossBelow !== null && goal ? Math.min(100, (lossBelow / goal) * 100) : null
  const needsRoles = nextLevel === 'ADVANCED'

  const bonus = (rule: typeof current) =>
    rule && info ? `+${rule.primaryPercent}% ${statLabels[info.primaryStat]} · +${rule.secondaryPercent}% ${statLabels[info.secondaryStat]}` : null

  return (
    <article
      style={{ '--tone': domPillarColors[pillar] } as CSSProperties}
      className={cn(
        'chamfer group relative flex flex-col overflow-hidden p-4 [--cut:14px] transition-all duration-300 hover:-translate-y-0.5',
        level
          ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_7%,var(--color-surface))] [--chamfer-border:color-mix(in_srgb,var(--tone)_45%,transparent)] hover:[--chamfer-border:var(--tone)]'
          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_50%,transparent)]',
      )}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_100%_0%,color-mix(in_srgb,var(--tone)_18%,transparent),transparent)] opacity-50 transition-opacity group-hover:opacity-100" />
      <Icon className="pointer-events-none absolute -right-4 -bottom-5 size-28 text-(--tone) opacity-[0.05] transition-all duration-500 group-hover:-rotate-6 group-hover:opacity-[0.1]" />

      {/* cabeçalho: ícone, pilar e nível */}
      <div className="relative flex items-start gap-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center">
          <span
            className={cn(
              'absolute inset-1.5 rotate-45 border transition-transform duration-300 group-hover:rotate-135',
              level ? 'border-(--tone)/70 bg-(--tone)/15 shadow-[0_0_14px_-4px_var(--tone)]' : 'border-line-strong bg-bg',
            )}
          />
          <Icon className={cn('relative size-4.5', level ? 'text-(--tone)' : 'text-fg-subtle')} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-none font-extrabold uppercase italic tracking-wide text-silver-bright">{domPillarLabels[pillar]}</p>
          <p className="mt-1 truncate text-[11px] text-fg-subtle">{domPillarThemes[pillar]}</p>
        </div>
        {/* 3 marcas: básico, intermediário, avançado */}
        <span className="flex gap-0.5 pt-1" aria-label={level ? domLevelLabels[level] : 'Sem o pilar'}>
          {domLevelOrder.map((l, i) => (
            <span key={l} className={cn('h-3 w-1.5 -skew-x-12', i < rank ? 'bg-(--tone) shadow-[0_0_6px_var(--tone)]' : 'bg-overlay')} />
          ))}
        </span>
      </div>

      <p className={cn('relative mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em]', level ? 'text-(--tone)' : 'text-fg-subtle')}>
        {level ? domLevelLabels[level] : 'Sem o pilar'}
      </p>
      {current && <p className="relative text-xs text-fg-muted">{bonus(current)}</p>}

      {/* título e skill única do avançado */}
      {title && info && (
        <div className="relative mt-3 border-l-2 border-(--tone) bg-(--tone)/8 px-2.5 py-2">
          <p className="font-display text-base leading-tight font-extrabold uppercase italic text-(--tone)">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{info.uniqueSkill.description}. Uso único por batalha.</p>
        </div>
      )}

      {/* pontos na janela até o próximo nível, com o piso da perda */}
      <div className="relative mt-auto pt-4">
        <p className="flex items-baseline justify-between gap-2 font-mono text-[10px] text-fg-subtle tabular-nums">
          <span>
            <span className="text-sm font-bold text-fg">{fmt(points)}</span>
            {nextThreshold !== null ? ` / ${fmt(nextThreshold)} pts` : ' pts'}
          </span>
          <span>{nextLevel ? `para ${domLevelLabels[nextLevel]}` : 'nível máximo'}</span>
        </p>
        <div className="relative mt-1.5 h-1.5 -skew-x-12 bg-overlay">
          <div className="h-full bg-(--tone) shadow-[0_0_8px_var(--tone)] transition-[width] duration-700 ease-out-soft" style={{ width: `${fill}%` }} />
          {lossMark !== null && (
            <span className="absolute -inset-y-1 w-0.5 bg-danger-hover" style={{ left: `${lossMark}%` }} title={`Abaixo de ${fmt(lossBelow!)} pontos, cai um nível`} />
          )}
        </div>
        {next && !level && <p className="mt-1.5 text-[11px] text-fg-subtle">Básico dá {bonus(next)}.</p>}
        {atRisk && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-danger-hover">
            <AlertTriangle className="size-3" /> Abaixo de {fmt(lossBelow!)}: cai um nível na próxima conferência
          </p>
        )}

        {/* avançado pede feitos de 3 papéis */}
        {needsRoles && rules && (
          <div className="mt-3 space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">
              Avançado: {rules.advancedRolePoints} pts em {rules.advancedRoles} papéis
            </p>
            <div className="grid grid-cols-4 gap-1">
              {domRoleOrder.map((role) => {
                const value = state.roles[role]
                const done = value >= rules.advancedRolePoints
                return (
                  <span key={role} className="space-y-0.5" title={`${domRoleLabels[role]}: ${fmt(value)} / ${rules.advancedRolePoints}`}>
                    <span className="block h-1 bg-overlay">
                      <span className={cn('block h-full', done ? 'bg-(--tone)' : 'bg-silver/50')} style={{ width: `${Math.min(100, (value / rules.advancedRolePoints) * 100)}%` }} />
                    </span>
                    <span className={cn('block truncate font-mono text-[9px]', done ? 'text-(--tone)' : 'text-fg-subtle')}>{domRoleLabels[role]}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* feitos do pilar: um ponto por batalha vencida em que cumprir um deles */}
        {info && (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="focus-ring mt-3 flex w-full items-center justify-between border-t border-line/70 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle transition-colors hover:text-(--tone)"
            >
              Como ganhar pontos
              <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
              <ul className="mt-2 space-y-1.5 motion-safe:animate-fade-in">
                {domRoleOrder.map((role) => {
                  const feat = info.feats.find((f) => f.role === role)
                  if (!feat) return null
                  return (
                    <li key={role} className="text-[11px] leading-snug text-fg-muted">
                      <span className="mr-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-(--tone)">{domRoleLabels[role]}</span>
                      {feat.description}.
                    </li>
                  )
                })}
                <li className="text-[10px] text-fg-subtle">Todos pedem vitória. Um feito por pilar por batalha.</li>
              </ul>
            )}
          </>
        )}
      </div>
    </article>
  )
}

/** Pilares que subiram ou caíram numa batalha (`reward.domChanges`): resultado e histórico. */
export function DomChangeBadges({ changes }: { changes?: DomChange[] }) {
  if (!changes?.length) return null
  return (
    <>
      {changes.map((c) => {
        const Icon = domPillarIcons[c.pillar]
        const up = domLevelRank(c.to) > domLevelRank(c.from)
        const label = `${domPillarLabels[c.pillar]} ${c.to ? domLevelLabels[c.to] : 'perdido'}`
        return (
          <span
            key={c.pillar}
            title={`DOM: ${domPillarLabels[c.pillar]} ${up ? 'subiu' : 'caiu'} de ${c.from ? domLevelLabels[c.from] : 'nada'} para ${c.to ? domLevelLabels[c.to] : 'nada'}`}
            style={{ '--tone': up ? domPillarColors[c.pillar] : 'var(--color-danger-hover)' } as CSSProperties}
            className="inline-flex items-center gap-1 border border-(--tone)/50 bg-(--tone)/10 px-1.5 py-px font-mono text-[10px] font-bold whitespace-nowrap uppercase tracking-[0.1em] text-(--tone)"
          >
            <Icon className="size-3" />
            {up ? '▲' : '▼'} {label}
          </span>
        )
      })}
    </>
  )
}

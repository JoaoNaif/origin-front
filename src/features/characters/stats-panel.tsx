import { useState, type ReactNode } from 'react'
import { BookOpen, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Term } from '@/components/ui/term'
import { useAllocateFreePoints, type Character, type Stat, type StatBlock } from '@/features/game/game-api'
import { statLabels, statOrder, statShort } from '@/features/game/game-labels'
import { statInfo } from '@/features/game/glossary'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

const sum = (block: StatBlock) => statOrder.reduce((total, stat) => total + block[stat], 0)

/** No orçamento o HP vale 1/5 (D69): só para as barras ficarem na mesma escala. */
const barValue = (stat: Stat, value: number) => (stat === 'HP' ? value / 5 : value)

/**
 * Atributos fora de batalha e a distribuição dos pontos livres. A distribuição vai inteira (D48); os stats novos
 * vêm calculados pelo servidor depois de salvar (quem usa remonta o painel pela `key` para o rascunho recomeçar).
 */
export function StatsPanel({ character }: { character: Character }) {
  const { allocated, available, maxPerStat } = character.freePoints
  const [draft, setDraft] = useState<StatBlock>(allocated)
  const save = useAllocateFreePoints(character.id)

  const used = sum(draft)
  const remaining = available - used
  const dirty = statOrder.some((stat) => draft[stat] !== allocated[stat])
  const scale = Math.max(...statOrder.map((stat) => barValue(stat, character.stats[stat])))

  function change(stat: Stat, delta: number) {
    save.reset()
    setDraft((d) => ({ ...d, [stat]: d[stat] + delta }))
  }

  const top = Math.max(...statOrder.map((stat) => barValue(stat, character.stats[stat])))

  return (
    <div className="chamfer relative overflow-hidden p-5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:16px]">
      <span className="pointer-events-none absolute inset-0 scanlines" />

      {/* pontos livres: o número grande e um traço por ponto (até 20; acima disso, barra) */}
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line/70 pb-4">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Pontos livres</p>
          <p className="flex items-baseline gap-1.5 tabular-nums">
            <span className={cn('font-display text-5xl leading-none font-extrabold italic', remaining > 0 ? 'text-primary-soft' : 'text-silver-bright')}>
              {remaining}
            </span>
            <span className="font-mono text-sm text-fg-subtle">/ {available}</span>
          </p>
          {available > 0 && available <= 20 && (
            <span className="flex gap-0.5" aria-hidden>
              {Array.from({ length: available }, (_, i) => (
                <span
                  key={i}
                  className={cn('h-2 w-2.5 -skew-x-12 transition-colors duration-200', i < remaining ? 'bg-primary shadow-[0_0_6px_var(--color-primary)]' : 'bg-overlay')}
                />
              ))}
            </span>
          )}
        </div>
        <p className="max-w-56 text-right text-xs leading-relaxed text-fg-subtle">
          {available === 0 ? 'Os primeiros pontos chegam no nível 10.' : '+10 pontos a cada 10 níveis. 1 ponto em HP = 5 de HP.'}
        </p>
      </div>

      <ul className="relative space-y-1">
        {statOrder.map((stat) => {
          const delta = draft[stat] - allocated[stat]
          const value = character.stats[stat]
          const best = barValue(stat, value) === top
          return (
            <li
              key={stat}
              className={cn(
                'group grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 border px-2 py-1.5 transition-colors duration-150',
                delta !== 0 ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:border-line hover:bg-bg/50',
              )}
            >
              <span
                className={cn(
                  'flex h-6 items-center justify-center border font-mono text-[10px] font-bold transition-colors',
                  best ? 'border-primary-soft/50 bg-primary/10 text-primary-soft' : 'border-line-strong text-fg-muted group-hover:text-fg',
                )}
                title={statLabels[stat]}
              >
                {statShort[stat]}
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Term title={statLabels[stat]} info={statInfo[stat]} className="text-xs text-fg-subtle hover:text-fg">
                    {statLabels[stat]}
                  </Term>
                  <span className="font-mono text-sm text-fg tabular-nums">
                    {delta !== 0 && (
                      <span className={cn('mr-1.5 text-xs', delta > 0 ? 'text-primary-soft' : 'text-danger-hover')}>
                        {delta > 0 ? '+' : ''}
                        {delta} pt
                      </span>
                    )}
                    <span className={cn('font-bold', best ? 'text-silver-bright' : '')}>{value}</span>
                  </span>
                </div>
                <div className="h-1 -skew-x-12 bg-overlay">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 ease-out-soft',
                      best ? 'bg-linear-to-r from-primary/60 to-primary-soft shadow-[0_0_8px_var(--color-primary)]' : 'bg-linear-to-r from-silver/30 to-silver/80 group-hover:to-silver',
                    )}
                    style={{ width: `${scale ? (barValue(stat, value) / scale) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {available > 0 && (
                <div className="flex items-center gap-1">
                  <StepButton label={`Tirar ponto de ${statLabels[stat]}`} disabled={draft[stat] <= 0} onClick={() => change(stat, -1)}>
                    <Minus className="size-3" />
                  </StepButton>
                  <span
                    className={cn('w-12 text-center font-mono text-xs tabular-nums', delta ? 'text-primary-soft' : 'text-fg-muted')}
                    title={`Máximo: ${maxPerStat[stat]}`}
                  >
                    {draft[stat]}
                    <span className="text-fg-subtle">/{maxPerStat[stat]}</span>
                  </span>
                  <StepButton
                    label={`Pôr ponto em ${statLabels[stat]}`}
                    disabled={remaining <= 0 || draft[stat] >= maxPerStat[stat]}
                    onClick={() => change(stat, 1)}
                  >
                    <Plus className="size-3" />
                  </StepButton>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <Link
        to="/guia#atributos"
        className="focus-ring group relative mt-4 flex w-fit items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle transition-colors hover:text-primary-soft"
      >
        <BookOpen className="size-3.5" /> O que cada atributo faz
        <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>

      {(dirty || save.isError) && (
        <div className="relative mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line/70 pt-4">
          {save.isError && <p className="mr-auto text-xs text-danger">{apiErrorMessage(save.error)}</p>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              save.reset()
              setDraft(allocated)
            }}
            disabled={!dirty || save.isPending}
          >
            <RotateCcw className="size-3.5" />
            Desfazer
          </Button>
          <Button size="sm" onClick={() => save.mutate(draft)} disabled={!dirty || save.isPending}>
            {save.isPending ? 'Salvando...' : 'Salvar pontos'}
          </Button>
        </div>
      )}
    </div>
  )
}

function StepButton({ label, disabled, onClick, children }: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="focus-ring chamfer flex size-7 items-center justify-center text-fg-muted [--chamfer-bg:var(--color-bg)] [--chamfer-border:var(--color-line-strong)] [--cut:5px] transition-all hover:text-primary-soft hover:[--chamfer-bg:var(--color-primary-dim)] hover:[--chamfer-border:var(--color-primary-soft)] active:scale-90 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}

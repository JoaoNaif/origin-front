import { useState, type ReactNode } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAllocateFreePoints, type Character, type Stat, type StatBlock } from '@/features/game/game-api'
import { statLabels, statOrder, statShort } from '@/features/game/game-labels'
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

  return (
    <div className="hud-corners border border-line/60 bg-surface/60 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Pontos livres</p>
          <p className="font-mono text-2xl text-fg tabular-nums">
            <span className={cn(remaining > 0 ? 'text-primary-soft' : 'text-fg')}>{remaining}</span>
            <span className="text-sm text-fg-subtle"> / {available}</span>
          </p>
        </div>
        <p className="max-w-56 text-right text-xs text-fg-subtle">
          {available === 0 ? 'Os primeiros pontos chegam no nível 10.' : '+10 pontos a cada 10 níveis. 1 ponto em HP = 5 de HP.'}
        </p>
      </div>

      <ul className="space-y-2.5">
        {statOrder.map((stat) => {
          const delta = draft[stat] - allocated[stat]
          const value = character.stats[stat]
          return (
            <li key={stat} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
              <span className="font-mono text-[11px] font-medium text-fg-muted" title={statLabels[stat]}>
                {statShort[stat]}
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs text-fg-subtle">{statLabels[stat]}</span>
                  <span className="font-mono text-sm text-fg tabular-nums">
                    {value}
                    {delta !== 0 && (
                      <span className={cn('ml-1.5 text-xs', delta > 0 ? 'text-primary-soft' : 'text-danger-hover')}>
                        {delta > 0 ? '+' : ''}
                        {delta} pt
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-0.75 bg-overlay">
                  <div
                    className="h-full bg-linear-to-r from-silver/40 to-silver transition-[width] duration-300 ease-out-soft"
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

      {(dirty || save.isError) && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line/70 pt-4">
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
      className="focus-ring flex size-6 items-center justify-center rounded-control border border-line-strong text-fg-muted transition-colors hover:border-primary/60 hover:text-primary-soft disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

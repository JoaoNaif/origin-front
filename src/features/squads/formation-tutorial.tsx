import type { ReactNode } from 'react'
import { Check, ChevronsRight, X } from 'lucide-react'
import { classIcons } from '@/features/game/class-icons'
import { classLabels, useFormationBonuses, type CharacterClass, type FormationBonusValues } from '@/features/game/game-api'
import { BonusChips } from '@/features/squads/bonus-chips'
import {
  bonusValuesMessage,
  cellBonuses,
  classAuraText,
  formationReports,
  visualColumns,
  type PlacedCharacter,
} from '@/features/squads/formation-bonus'
import { cn } from '@/lib/cn'

// Passos do tutorial do bônus de formação (tutorial "formacao" e fim do de Esquadrões, em tutorials.tsx). Os exemplos
// passam pelo mesmo cálculo da grade real, com os valores da API: nenhum número daqui é escrito à mão.

const at = (characterClass: CharacterClass, row: number, column: number): PlacedCharacter => ({
  character: { id: `${characterClass}-${row}-${column}`, name: classLabels[characterClass], characterClass },
  row,
  column,
})

const sameCell = (a: { row: number; column: number }, b: { row: number; column: number }) => a.row === b.row && a.column === b.column

const DIAGONALS = [
  { row: 0, column: 0 },
  { row: 0, column: 2 },
  { row: 2, column: 0 },
  { row: 2, column: 2 },
]

/** Grade de exemplo: mesmas cores e etiquetas da grade de montagem, sem clique. */
function MiniGrid({ units, values, crossed = [], focus, verdict, caption }: {
  units: PlacedCharacter[]
  values: FormationBonusValues
  /** Células que não recebem, marcadas com um X. */
  crossed?: { row: number; column: number }[]
  /** Célula em destaque no exemplo. */
  focus?: { row: number; column: number }
  verdict?: 'good' | 'bad'
  caption?: ReactNode
}) {
  const reports = formationReports(units, values)

  return (
    <figure className="w-fit space-y-2">
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          {visualColumns.map(({ column, label }) => (
            <span key={column} className={cn('text-center font-mono text-[9px] uppercase tracking-[0.18em]', column === 0 ? 'text-primary-soft' : 'text-fg-subtle')}>
              {label}
            </span>
          ))}
        </div>
        <span className="size-4" />
      </div>
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((row) =>
            visualColumns.map(({ column }) => {
              const cell = { row, column }
              const unit = units.find((u) => sameCell(u, cell))
              const bonuses = unit ? (reports.find((r) => r.character.id === unit.character.id)?.bonuses ?? []) : cellBonuses(units, cell, values)
              const Icon = unit && classIcons[unit.character.characterClass]
              return (
                <div
                  key={column}
                  className={cn(
                    'flex size-22 flex-col items-center justify-center gap-1 overflow-hidden rounded-control border p-1 sm:size-24',
                    unit
                      ? 'border-primary-soft/60 bg-primary/15'
                      : bonuses.length === 0
                        ? 'border-silver/15 bg-white/2'
                        : bonuses.every((b) => b.loss)
                          ? 'border-warning/40 bg-warning/5'
                          : 'border-primary-soft/40 bg-primary/8',
                    focus && sameCell(focus, cell) && 'ring-1 ring-primary-soft',
                  )}
                >
                  {unit && Icon && (
                    <>
                      <Icon className="size-4 shrink-0 text-silver-bright" strokeWidth={1.75} />
                      <span className="max-w-full truncate font-display text-xs leading-none font-bold uppercase tracking-wide text-silver-bright">
                        {unit.character.name}
                      </span>
                    </>
                  )}
                  {bonuses.length > 0 && <BonusChips bonuses={bonuses} wrap />}
                  {!unit && bonuses.length === 0 && crossed.some((c) => sameCell(c, cell)) && <X className="size-4 text-fg-subtle" aria-label="Não recebe" />}
                </div>
              )
            }),
          )}
        </div>
        <ChevronsRight className="size-4 shrink-0 text-enemy/60" aria-label="Inimigo" />
      </div>
      {caption && (
        <figcaption className="flex max-w-72 items-start gap-1.5 text-xs leading-relaxed text-fg-muted sm:max-w-80">
          {verdict === 'good' && <Check className="mt-0.5 size-3.5 shrink-0 text-primary-soft" aria-label="Vale" />}
          {verdict === 'bad' && <X className="mt-0.5 size-3.5 shrink-0 text-warning" aria-label="Não vale" />}
          <span>{caption}</span>
        </figcaption>
      )}
    </figure>
  )
}

const Lead = ({ children }: { children: ReactNode }) => <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">{children}</p>
const Strong = ({ children }: { children: ReactNode }) => <b className="font-semibold text-fg">{children}</b>
const Examples = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-start gap-x-10 gap-y-6">{children}</div>

function Fact({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div className="hud-corners border border-line/60 bg-surface/60 p-4">
      <p className="font-mono text-3xl leading-none text-silver-bright tabular-nums">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-fg-muted">{children}</p>
    </div>
  )
}

type StepProps = { values: FormationBonusValues }

function GridStep({ values }: StepProps) {
  return (
    <>
      <Lead>
        Antes da batalha você escolhe <Strong>onde cada personagem fica</Strong>. A posição não é só visual: ela decide quais bônus
        cada um ganha, e o mesmo esquadrão rende diferente em outra montagem.
      </Lead>
      <Examples>
        <MiniGrid units={[]} values={values} caption="A frente é a coluna que encara o inimigo, à direita." />
        <div className="grid flex-1 gap-3 sm:min-w-64">
          <Fact value="4">personagens no esquadrão.</Fact>
          <Fact value="9">quadrados para escolher, em 3 linhas e 3 colunas.</Fact>
        </div>
      </Examples>
    </>
  )
}

function AuraStep({ values }: StepProps) {
  return (
    <>
      <Lead>
        A maioria das classes solta uma <Strong>aura</Strong>: um bônus para os aliados <Strong>vizinhos</Strong>, na frente, atrás e dos
        lados. Na diagonal não pega, e a aura não vale para quem a solta.
      </Lead>
      <MiniGrid
        units={[at('GUARDIAN', 1, 1)]}
        values={values}
        crossed={DIAGONALS}
        caption="Quadrado roxo: quem for colocado ali recebe o bônus da etiqueta. É assim também na grade de montagem."
      />
    </>
  )
}

function StackingStep({ values }: StepProps) {
  const center = { row: 1, column: 1 }
  return (
    <>
      <Lead>
        Dois vizinhos da <Strong>mesma classe</Strong> não dobram o bônus. Para ganhar mais, junte <Strong>classes diferentes</Strong> em volta
        do mesmo personagem.
      </Lead>
      <Examples>
        <MiniGrid
          units={[at('GUARDIAN', 0, 1), at('GUARDIAN', 2, 1)]}
          values={values}
          focus={center}
          verdict="bad"
          caption="Dois Guardiões: o quadrado do meio recebe a aura uma vez só."
        />
        <MiniGrid
          units={[at('GUARDIAN', 0, 1), at('TACTICIAN', 2, 1)]}
          values={values}
          focus={center}
          verdict="good"
          caption="Guardião e Tático: o quadrado do meio recebe as duas auras."
        />
      </Examples>
    </>
  )
}

function ClassesStep({ values }: StepProps) {
  const givers: CharacterClass[] = [...values.statAuras.map((aura) => aura.characterClass), 'SUPPORT', 'VANGUARD']
  return (
    <>
      <Lead>
        Cada classe solta uma aura diferente. <Strong>Ancorado</Strong>, da Vanguarda, é o único que não muda número: protege contra ser tirado
        do lugar. Executor e Artilharia não soltam aura; o bônus deles é só deles, e vem nos próximos passos.
      </Lead>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {givers.map((characterClass) => {
          const Icon = classIcons[characterClass]
          return (
            <li key={characterClass} className="chamfer space-y-2 p-4 [--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] [--cut:12px]">
              <p className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-primary-soft" />
                <span className="min-w-0 flex-1 truncate font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">
                  {classLabels[characterClass]}
                </span>
                <BonusChips bonuses={cellBonuses([at(characterClass, 1, 1)], { row: 1, column: 0 }, values)} />
              </p>
              <p className="text-xs leading-relaxed text-fg-muted">{classAuraText(characterClass, values)}</p>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function ExecutorStep({ values }: StepProps) {
  return (
    <>
      <Lead>
        O Executor é o <Strong>lobo solitário</Strong>: não dá nada aos vizinhos e ganha +{values.executorLoneAttackPercent}% de Ataque quando não tem
        nenhum aliado ao lado. Quadrado laranja: colocar alguém ali tira esse bônus dele.
      </Lead>
      <Examples>
        <MiniGrid units={[at('EXECUTOR', 1, 1)]} values={values} verdict="good" caption="Sem vizinhos: o bônus vale." />
        <MiniGrid
          units={[at('EXECUTOR', 1, 1), at('SUPPORT', 1, 2)]}
          values={values}
          verdict="bad"
          caption="Com o Suporte ao lado, perde o bônus de Ataque, mas ganha a aura de cura."
        />
      </Examples>
    </>
  )
}

function ArtilleryStep({ values }: StepProps) {
  return (
    <>
      <Lead>
        A Artilharia ganha +{values.artilleryBackDamagePercent}% de dano quando é a última da <Strong>própria linha</Strong> e tem alguém à frente nela.
        Aliados em outras linhas não contam.
      </Lead>
      <Examples>
        <MiniGrid
          units={[at('ARTILLERY', 1, 2)]}
          values={values}
          verdict="bad"
          caption="Sozinha na linha, ainda não vale. Os quadrados roxos à frente ligam o bônus."
        />
        <MiniGrid
          units={[at('ARTILLERY', 1, 1), at('TACTICIAN', 1, 0)]}
          values={values}
          verdict="good"
          caption="Com o Tático à frente, vale. O quadrado laranja atrás dela desligaria o bônus."
        />
      </Examples>
    </>
  )
}

function TradeoffStep({ values }: StepProps) {
  return (
    <>
      <Lead>
        Não existe montagem certa: é uma troca. Agrupar soma auras, mas deixa todos ao alcance das skills de área. Espalhar protege contra a
        área e favorece quem gosta de ficar longe, mas abre mão das auras.
      </Lead>
      <Examples>
        <MiniGrid
          units={[at('GUARDIAN', 1, 1), at('SUPPORT', 0, 1), at('TACTICIAN', 1, 0), at('MARKSMAN', 2, 1)]}
          values={values}
          caption={<><Strong>Agrupado:</Strong> mais aura, mais dano de área.</>}
        />
        <MiniGrid
          units={[at('EXECUTOR', 0, 0), at('SUPPORT', 0, 2), at('GUARDIAN', 2, 0), at('ARTILLERY', 2, 2)]}
          values={values}
          caption={<><Strong>Espalhado:</Strong> menos aura, menos dano de área.</>}
        />
      </Examples>
      <p className="border-t border-line/60 pt-4 text-xs leading-relaxed text-fg-subtle">
        Enquanto você monta, a grade mostra tudo isso em tempo real: mova os personagens e veja as etiquetas mudarem.
      </p>
    </>
  )
}

const bodies = {
  grid: GridStep,
  aura: AuraStep,
  stacking: StackingStep,
  classes: ClassesStep,
  executor: ExecutorStep,
  artillery: ArtilleryStep,
  tradeoff: TradeoffStep,
}

export type FormationStepKey = keyof typeof bodies

/**
 * Um passo do tutorial de formação (a lista e os títulos ficam em tutorials.tsx). Depende dos valores da API: sem eles,
 * só o aviso, nenhum percentual inventado.
 */
export function FormationStep({ step }: { step: FormationStepKey }) {
  const values = useFormationBonuses()
  const Body = bodies[step]
  if (!values.data) return <p className="text-sm text-fg-subtle">{bonusValuesMessage(values.isError)}</p>
  return (
    <div className="space-y-6">
      <Body values={values.data} />
    </div>
  )
}

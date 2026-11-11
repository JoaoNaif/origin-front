import { useState, type CSSProperties } from 'react'
import { ArrowRight, Loader2, Repeat2, Sword, Unlink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { buttonClasses } from '@/components/ui/button-classes'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { useCharacters, type Character } from '@/features/game/game-api'
import { lineageLabels, statLabels, statOrder, statShort } from '@/features/game/game-labels'
import { useEquipGear, useGear, useGearBonds, useUnequipGear, type Gear } from '@/features/gear/gear-api'
import { gradeColors, gradeLabels, gradeOrder, kindLabels } from '@/features/gear/gear-labels'
import { BondDetails, GearEmblem, GradeTag } from '@/features/gear/gear-ui'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Equipamento vivo na ficha (D153): o que está no slot, o elo atual e o efeito, os stats com o bônus, e trocar ou tirar.
 * O elo é o de agora: muda com os pontos livres; na batalha vale o do início.
 */
export function CharacterGearPanel({ character }: { character: Character }) {
  const gear = character.gear ?? null
  const [picking, setPicking] = useState(false)
  const unequip = useUnequipGear()
  const first = character.name.split(' ')[0]

  return (
    <>
      {gear ? (
        <div
          style={{ '--tone': gradeColors[gear.grade] } as CSSProperties}
          className="chamfer grid gap-6 p-5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_40%,transparent)] [--cut:18px] lg:grid-cols-[minmax(0,20rem)_1fr_minmax(0,14rem)]"
        >
          <span className="pointer-events-none absolute inset-px bg-[radial-gradient(60%_80%_at_0%_0%,color-mix(in_srgb,var(--tone)_12%,transparent),transparent)] [clip-path:var(--chamfer-shape)]" />
          <div className="relative space-y-3">
            <div className="flex items-start gap-4">
              <GearEmblem kind={gear.kind} grade={gear.grade} size="xl" />
              <div className="min-w-0">
                <GradeTag grade={gear.grade} />
                <p className="mt-1 font-display text-2xl leading-none font-extrabold uppercase italic text-silver-bright">{gear.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                  {kindLabels[gear.kind]} · {lineageLabels[gear.lineage]}
                </p>
              </div>
            </div>
            {gear.description && <p className="text-sm leading-relaxed text-fg-muted">{gear.description}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
                <Repeat2 className="size-4" /> Trocar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={unequip.isPending}
                onClick={() => unequip.mutate(gear.id, { onSuccess: () => toast.success('Guardado no Arsenal', gear.name) })}
              >
                <Unlink className="size-4" /> Tirar
              </Button>
            </div>
            {unequip.isError && <p className="text-xs text-danger">{apiErrorMessage(unequip.error)}</p>}
          </div>

          <div className="relative">{gear.bond && <BondDetails bond={gear.bond} lineage={gear.lineage} holder={first} />}</div>

          {/* o que o bônus faz nos números da ficha (os da seção 01 são sem o equipamento) */}
          <div className="relative space-y-1.5 border-line/70 lg:border-l lg:pl-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">Com ele, fora da batalha</p>
            <ul className="space-y-1">
              {statOrder
                .filter((s) => gear.stats[s] !== character.stats[s])
                .map((s) => (
                  <li key={s} className="flex items-baseline justify-between gap-2 font-mono text-xs tabular-nums" title={statLabels[s]}>
                    <span className="text-fg-subtle">{statShort[s]}</span>
                    <span className="text-fg-muted">
                      {character.stats[s]} <ArrowRight className="inline size-3" />{' '}
                      <span className={gear.stats[s] > character.stats[s] ? 'text-success' : 'text-danger-hover'}>{gear.stats[s]}</span>
                    </span>
                  </li>
                ))}
            </ul>
            <p className="text-[11px] leading-snug text-fg-subtle">Os atributos da seção 01 não contam o equipamento.</p>
          </div>
        </div>
      ) : (
        <div className="hud-corners flex flex-wrap items-center gap-4 border border-line/60 bg-surface/40 px-5 py-5 [--hud-color:var(--color-line-strong)]">
          <span className="chamfer flex size-14 items-center justify-center border-dashed [--chamfer-bg:var(--color-bg)] [--chamfer-border:var(--color-line)] [--cut:9px]">
            <Sword className="relative size-5 text-fg-subtle" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold uppercase tracking-wide text-fg">Sem equipamento</p>
            <p className="text-sm text-fg-muted">Uma arma ou armadura viva dá bônus e uma passiva, se tiver elo com {first}.</p>
          </div>
          <Button size="sm" onClick={() => setPicking(true)}>
            <Sword className="size-4" /> Equipar
          </Button>
        </div>
      )}

      {picking && <GearPicker character={character} onClose={() => setPicking(false)} />}
    </>
  )
}

/**
 * Escolher um equipamento do inventário para o personagem: a lista à esquerda e, à direita, a leitura do escolhido
 * (o item e o elo com o personagem, `BondDetails`). O primeiro da lista já vem escolhido, para nunca abrir vazio.
 */
function GearPicker({ character, onClose }: { character: Character; onClose: () => void }) {
  const gear = useGear()
  const characters = useCharacters()
  const equip = useEquipGear()
  const options = [...(gear.data?.gear ?? [])]
    .filter((g) => g.characterId !== character.id)
    .sort((a, b) => Number(!!a.characterId) - Number(!!b.characterId) || gradeOrder.indexOf(b.grade) - gradeOrder.indexOf(a.grade))
  const [selected, setSelected] = useState<string | null>(null)
  const chosen = options.find((g) => g.id === selected) ?? options[0] ?? null
  const bonds = useGearBonds(chosen?.id ?? null)
  const bond = bonds.data?.find((b) => b.characterId === character.id)
  const holderName = (g: Gear) => characters.data?.find((c) => c.id === g.characterId)?.name.split(' ')[0]
  const first = character.name.split(' ')[0]

  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow="Equipamento vivo"
      title={`Equipar ${first}`}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {equip.isError && <p className="mr-auto text-xs text-danger">{apiErrorMessage(equip.error)}</p>}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
          <Button
            size="sm"
            disabled={!chosen || equip.isPending}
            onClick={() =>
              chosen &&
              equip.mutate(
                { gearId: chosen.id, characterId: character.id },
                {
                  onSuccess: () => {
                    toast.success('Equipado', `${chosen.name} com ${character.name}`)
                    onClose()
                  },
                },
              )
            }
          >
            {equip.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sword className="size-4" />}
            {chosen ? `Equipar ${chosen.name}` : 'Equipar'}
          </Button>
        </div>
      }
    >
      {gear.isPending ? (
        <div className="grid gap-4 md:grid-cols-[17rem_1fr]">
          <div className="h-72 animate-pulse bg-raised" />
          <div className="h-72 animate-pulse bg-raised" />
        </div>
      ) : !chosen ? (
        <div className="hud-corners flex flex-col items-center gap-3 border border-line/60 bg-surface/40 px-6 py-10 text-center">
          <Sword className="size-6 text-fg-subtle" />
          <p className="font-display text-xl font-bold uppercase tracking-wide text-fg">Nada no inventário</p>
          <p className="text-sm text-fg-muted">Equipamentos vivos saem dos baús.</p>
          <Link to="/baus" className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'mt-1' })}>
            Meus baús
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 md:grid-cols-[17rem_minmax(0,1fr)]">
          {/* Inventário */}
          <div className="space-y-2">
            <p className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              Inventário
              <span className="tabular-nums">{options.length}</span>
            </p>
            <ul className="max-h-[min(28rem,50dvh)] space-y-1.5 overflow-y-auto pr-1">
              {options.map((g) => {
                const active = g.id === chosen.id
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(g.id)}
                      aria-pressed={active}
                      style={{ '--tone': gradeColors[g.grade] } as CSSProperties}
                      className={cn(
                        'focus-ring chamfer flex w-full items-center gap-2.5 p-2 text-left [--cut:9px] transition-all duration-150 ease-out-soft',
                        active
                          ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_10%,var(--color-raised))] [--chamfer-border:var(--tone)] drop-shadow-[0_0_10px_color-mix(in_srgb,var(--tone)_30%,transparent)]'
                          : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_50%,transparent)]',
                      )}
                    >
                      <GearEmblem kind={g.kind} grade={g.grade} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm leading-tight font-bold uppercase tracking-wide text-silver-bright">{g.name}</span>
                        <span className="block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-(--tone)">
                          {gradeLabels[g.grade]}
                          <span className="text-fg-subtle"> · {kindLabels[g.kind]}</span>
                        </span>
                        {g.characterId && <span className="block truncate font-mono text-[9px] text-warning">com {holderName(g) ?? 'outro'}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Leitura do escolhido */}
          <div
            style={{ '--tone': gradeColors[chosen.grade] } as CSSProperties}
            className="chamfer space-y-5 p-4 [--chamfer-bg:var(--color-bg)] [--chamfer-border:color-mix(in_srgb,var(--tone)_35%,transparent)] [--cut:16px] sm:p-5"
          >
            <span className="pointer-events-none absolute inset-px bg-[radial-gradient(70%_60%_at_100%_0%,color-mix(in_srgb,var(--tone)_10%,transparent),transparent)] [clip-path:var(--chamfer-shape)]" />
            <div className="relative flex items-start gap-4">
              <GearEmblem kind={chosen.kind} grade={chosen.grade} size="lg" />
              <div className="min-w-0 flex-1 space-y-1">
                <GradeTag grade={chosen.grade} />
                <p className="font-display text-2xl leading-none font-extrabold uppercase italic text-silver-bright">{chosen.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                  {kindLabels[chosen.kind]} · minério {lineageLabels[chosen.lineage]}
                </p>
              </div>
            </div>
            {chosen.description && <p className="relative text-sm leading-relaxed text-fg-muted">{chosen.description}</p>}

            <div className="relative space-y-3 border-t border-line/70 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">Elo com {first}</p>
              {bonds.isPending ? (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse bg-raised" />
                  <div className="h-32 animate-pulse bg-raised" />
                </div>
              ) : bond ? (
                <BondDetails bond={bond} lineage={chosen.lineage} holder={first} compact />
              ) : (
                <p className="text-sm text-danger">{bonds.isError ? apiErrorMessage(bonds.error) : 'Não foi possível calcular o elo.'}</p>
              )}
            </div>

            {(chosen.characterId || character.gear) && (
              <ul className="relative space-y-1 border-t border-line/70 pt-3 text-[11px] text-fg-subtle">
                {chosen.characterId && (
                  <li>
                    Sai de <span className="text-warning">{holderName(chosen) ?? 'quem usa'}</span> e vem para {first}.
                  </li>
                )}
                {character.gear && (
                  <li>
                    <span className="text-fg-muted">{character.gear.name}</span> volta para o inventário.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

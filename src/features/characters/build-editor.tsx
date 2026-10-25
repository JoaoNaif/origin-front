import { useState } from 'react'
import { Plus, RotateCcw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SkillCard, TierPips } from '@/features/characters/skill-card'
import { useEquipSkills, type Character, type SkillInfo } from '@/features/game/game-api'
import { tierLabels } from '@/features/game/game-labels'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

const BUILD_SIZE = 4

type Slots = (string | null)[]

function buildOf(character: Character): Slots {
  const slots: Slots = Array(BUILD_SIZE).fill(null)
  for (const skill of character.skills) if (skill.buildSlot) slots[skill.buildSlot - 1] = skill.key
  return slots
}

/**
 * Build: as 4 skills que o personagem leva para a batalha, escolhidas entre as aprendidas.
 * Clique numa skill aprendida para pôr no primeiro slot vazio; clique no slot para tirar.
 */
export function BuildEditor({ character, catalog }: { character: Character; catalog: Map<string, SkillInfo> }) {
  const saved = buildOf(character)
  const [slots, setSlots] = useState<Slots>(saved)
  const [focused, setFocused] = useState<string | null>(saved[0])
  const save = useEquipSkills(character.id)

  const dirty = slots.some((key, i) => key !== saved[i])
  const complete = slots.every(Boolean)
  const learned = character.skills
  const focusedSkill = focused ? catalog.get(focused) : undefined

  function toggle(key: string) {
    save.reset()
    setFocused(key)
    setSlots((current) => {
      if (current.includes(key)) return current.map((k) => (k === key ? null : k))
      const empty = current.indexOf(null)
      return empty === -1 ? current : current.map((k, i) => (i === empty ? key : k))
    })
  }

  return (
    <div className="space-y-6">
      {/* Os 4 slots */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {slots.map((key, i) => {
          const skill = key ? catalog.get(key) : undefined
          const name = skill?.name ?? learned.find((s) => s.key === key)?.name
          return (
            <button
              key={i}
              type="button"
              onClick={() => key && toggle(key)}
              disabled={!key}
              aria-label={key ? `Tirar ${name} do slot ${i + 1}` : `Slot ${i + 1} vazio`}
              className={cn(
                'focus-ring chamfer group relative flex h-28 flex-col justify-between p-3 text-left [--cut:12px]',
                'transition-all duration-150 ease-out-soft',
                key
                  ? '[--chamfer-bg:rgb(34_26_61/0.7)] [--chamfer-border:rgb(139_92_246/0.5)] hover:[--chamfer-border:rgb(229_72_77/0.6)]'
                  : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)]',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-primary-soft">{String(i + 1).padStart(2, '0')}</span>
                {key && <X className="size-3.5 text-fg-subtle opacity-0 transition-opacity group-hover:text-danger-hover group-hover:opacity-100" />}
              </span>
              {key ? (
                <span className="space-y-1.5">
                  {skill && <TierPips skill={skill} />}
                  <span className="block font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">
                    {name}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
                  <Plus className="size-3" /> Vazio
                </span>
              )}
            </button>
          )
        })}
      </div>

      {(dirty || save.isError) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className={cn('mr-auto text-xs', save.isError ? 'text-danger' : 'text-fg-subtle')}>
            {save.isError ? apiErrorMessage(save.error) : complete ? 'Build alterada.' : `Escolha mais ${slots.filter((k) => !k).length} para completar.`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              save.reset()
              setSlots(saved)
            }}
            disabled={!dirty || save.isPending}
          >
            <RotateCcw className="size-3.5" />
            Desfazer
          </Button>
          <Button size="sm" disabled={!dirty || !complete || save.isPending} onClick={() => save.mutate(slots as string[])}>
            {save.isPending ? 'Salvando...' : 'Salvar build'}
          </Button>
        </div>
      )}

      {/* Aprendidas + detalhe da selecionada */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr]">
        <ul className="space-y-1" aria-label="Skills aprendidas">
          {learned.map((learnedSkill) => {
            const skill = catalog.get(learnedSkill.key)
            const slot = slots.indexOf(learnedSkill.key)
            const isFocused = focused === learnedSkill.key
            return (
              <li key={learnedSkill.key} className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => setFocused(learnedSkill.key)}
                  aria-pressed={isFocused}
                  className={cn(
                    'focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-control border px-2.5 py-2 text-left transition-colors',
                    isFocused ? 'border-line-strong bg-raised' : 'border-transparent hover:bg-white/[0.03]',
                  )}
                >
                  <span className={cn('h-6 w-0.75 shrink-0', slot >= 0 ? 'bg-primary' : 'bg-overlay')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{learnedSkill.name}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                      {skill ? tierLabels[skill.tier] : '—'}
                      {learnedSkill.source === 'OFFER' && ' · bloco'}
                    </span>
                  </span>
                  {slot >= 0 && <span className="font-mono text-[10px] text-primary-soft">{String(slot + 1).padStart(2, '0')}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(learnedSkill.key)}
                  disabled={slot < 0 && complete}
                  aria-label={slot >= 0 ? `Tirar ${learnedSkill.name} da build` : `Pôr ${learnedSkill.name} na build`}
                  title={slot >= 0 ? 'Tirar da build' : complete ? 'Build cheia: tire uma antes' : 'Pôr na build'}
                  className="focus-ring flex w-8 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-white/5 hover:text-primary-soft disabled:pointer-events-none disabled:opacity-40"
                >
                  {slot >= 0 ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="hud-corners min-h-56 border border-line/60 bg-surface/60 p-5 [--hud-color:var(--color-primary-soft)]">
          {focusedSkill ? (
            <SkillCard
              skill={focusedSkill}
              enhanced={learned.find((s) => s.key === focusedSkill.key)?.isEnhanced}
              aside={slots.includes(focusedSkill.key) && <Badge tone="primary">Na build</Badge>}
            />
          ) : (
            <p className="text-sm text-fg-muted">Selecione uma skill para ver os detalhes.</p>
          )}
        </div>
      </div>
    </div>
  )
}

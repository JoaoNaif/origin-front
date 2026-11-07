import { useState, type CSSProperties } from 'react'
import { Check, Plus, RotateCcw, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SkillCard, TierPips } from '@/features/characters/skill-card'
import { EnhancePanel } from '@/features/economy/enhance-panel'
import { useEquipSkills, type Character, type SkillInfo } from '@/features/game/game-api'
import { kitSlotLabels, tierLabels } from '@/features/game/game-labels'
import { skillKindStyle } from '@/features/game/skill-kinds'
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
 * O "+" de uma aprendida põe no primeiro slot vazio; o "×" (no slot ou na lista) tira. Clicar mostra o detalhe.
 * Cada skill leva a cor do papel principal dela (ataque, cura, defesa...).
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
  const nextEmpty = slots.indexOf(null)

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
          const enhanced = !!learned.find((s) => s.key === key)?.isEnhanced
          const kind = skill ? skillKindStyle(skill) : null
          const KindIcon = kind?.icon
          const isFocused = !!key && key === focused
          return (
            <div key={i} className="group relative">
              <button
                type="button"
                onClick={() => key && setFocused(key)}
                disabled={!key}
                aria-label={key ? `Slot ${i + 1}: ${name}` : `Slot ${i + 1} vazio`}
                aria-pressed={isFocused}
                style={{ '--tone': kind?.color ?? 'var(--color-primary-soft)' } as CSSProperties}
                className={cn(
                  'focus-ring chamfer relative flex h-36 w-full flex-col justify-between overflow-hidden p-3 text-left [--cut:14px]',
                  'transition-all duration-200 ease-out-soft',
                  key
                    ? cn(
                        '[--chamfer-bg:color-mix(in_srgb,var(--tone)_9%,var(--color-surface))]',
                        isFocused
                          ? '-translate-y-1 [--chamfer-border:var(--tone)] drop-shadow-[0_8px_18px_color-mix(in_srgb,var(--tone)_35%,transparent)]'
                          : '[--chamfer-border:color-mix(in_srgb,var(--tone)_40%,transparent)] hover:-translate-y-1 hover:[--chamfer-border:color-mix(in_srgb,var(--tone)_80%,transparent)]',
                      )
                    : cn(
                        '[--chamfer-bg:rgb(255_255_255/0.015)] [--chamfer-border:var(--color-line)] disabled:opacity-100',
                        i === nextEmpty && '[--chamfer-border:rgb(167_139_250/0.45)]',
                      ),
                )}
              >
                {key && (
                  <>
                    <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_70%_at_100%_0%,color-mix(in_srgb,var(--tone)_20%,transparent),transparent)] opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
                    {KindIcon && (
                      <KindIcon className="pointer-events-none absolute -right-3 -bottom-4 size-20 -rotate-12 text-(--tone) opacity-[0.06] transition-all duration-500 ease-out-soft group-hover:-rotate-3 group-hover:opacity-[0.14]" />
                    )}
                  </>
                )}

                <span className="relative flex items-center justify-between">
                  <span className="font-mono text-[10px] text-primary-soft">{String(i + 1).padStart(2, '0')}</span>
                  {skill?.kitSlot && <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-subtle">{kitSlotLabels[skill.kitSlot]}</span>}
                </span>

                {key ? (
                  <span className="relative space-y-2">
                    {KindIcon && (
                      <span className="relative flex size-9 items-center justify-center">
                        <span className="absolute inset-1.5 rotate-45 border border-(--tone)/60 bg-(--tone)/15 shadow-[0_0_14px_-4px_var(--tone)] transition-transform duration-300 ease-out-soft group-hover:rotate-135" />
                        <KindIcon className="relative size-4 text-(--tone)" />
                      </span>
                    )}
                    <span className="flex items-center gap-2">
                      {skill && <TierPips skill={skill} />}
                      {enhanced && <Sparkles className="size-3 text-success" aria-label="Aprimorada" />}
                    </span>
                    <span className="block font-display text-lg leading-tight font-bold uppercase tracking-wide text-silver-bright">{name}</span>
                  </span>
                ) : (
                  <span className="relative flex flex-col items-center gap-1.5 self-center pb-4">
                    <span
                      className={cn(
                        'flex size-9 items-center justify-center border border-dashed',
                        i === nextEmpty ? 'border-primary-soft/60 text-primary-soft motion-safe:animate-pulse' : 'border-line-strong text-fg-subtle',
                      )}
                    >
                      <Plus className="size-4" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">{i === nextEmpty ? 'Próximo' : 'Vazio'}</span>
                  </span>
                )}
              </button>

              {key && (
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-label={`Tirar ${name} da build`}
                  title="Tirar da build"
                  className="focus-ring absolute top-2 right-2 flex size-6 items-center justify-center border border-line-strong bg-bg/85 text-fg-subtle opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:border-danger/60 hover:bg-danger-dim hover:text-danger-hover focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {(dirty || save.isError) && (
        <div className="chamfer flex flex-wrap items-center justify-end gap-2 px-4 py-3 [--chamfer-bg:var(--color-surface)] [--chamfer-border:rgb(167_139_250/0.35)] [--cut:10px]">
          <p className={cn('mr-auto text-xs', save.isError ? 'text-danger' : complete ? 'text-primary-soft' : 'text-fg-muted')}>
            {save.isError ? apiErrorMessage(save.error) : complete ? 'Build alterada: salve para levar à batalha.' : `Escolha mais ${slots.filter((k) => !k).length} para completar.`}
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
      <div className="grid gap-4 md:grid-cols-[minmax(0,15rem)_1fr]">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            <span className="text-primary-soft">//</span> Aprendidas
          </p>
          <ul className="space-y-1" aria-label="Skills aprendidas">
            {learned.map((learnedSkill) => {
              const skill = catalog.get(learnedSkill.key)
              const slot = slots.indexOf(learnedSkill.key)
              const isFocused = focused === learnedSkill.key
              const kind = skill ? skillKindStyle(skill) : null
              const KindIcon = kind?.icon
              return (
                <li
                  key={learnedSkill.key}
                  style={{ '--tone': kind?.color ?? 'var(--color-silver)' } as CSSProperties}
                  className="group flex items-stretch gap-1"
                >
                  <button
                    type="button"
                    onClick={() => setFocused(learnedSkill.key)}
                    aria-pressed={isFocused}
                    className={cn(
                      'focus-ring chamfer relative flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden px-2.5 py-2 text-left [--cut:8px] transition-all duration-200',
                      isFocused
                        ? '[--chamfer-bg:color-mix(in_srgb,var(--tone)_10%,var(--color-surface))] [--chamfer-border:color-mix(in_srgb,var(--tone)_55%,transparent)]'
                        : '[--chamfer-bg:transparent] [--chamfer-border:transparent] hover:translate-x-0.5 hover:[--chamfer-bg:var(--color-surface)] hover:[--chamfer-border:var(--color-line)]',
                    )}
                  >
                    <span className="relative flex size-7 shrink-0 items-center justify-center">
                      <span
                        className={cn(
                          'absolute inset-1 rotate-45 border transition-all duration-300 ease-out-soft group-hover:rotate-135',
                          slot >= 0 ? 'border-(--tone)/70 bg-(--tone)/15' : 'border-line-strong bg-bg/50',
                        )}
                      />
                      {KindIcon && <KindIcon className={cn('relative size-3.5', slot >= 0 || isFocused ? 'text-(--tone)' : 'text-fg-subtle group-hover:text-(--tone)')} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-medium transition-colors', isFocused ? 'text-silver-bright' : 'text-fg')}>{learnedSkill.name}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                        {skill ? tierLabels[skill.tier] : '—'}
                        {learnedSkill.source === 'OFFER' && ' · bloco'}
                        {learnedSkill.isEnhanced && <Sparkles className="size-2.5 text-success" aria-label="Aprimorada" />}
                      </span>
                    </span>
                    {slot >= 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center border border-(--tone)/50 font-mono text-[10px] text-(--tone)">{slot + 1}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(learnedSkill.key)}
                    disabled={slot < 0 && complete}
                    aria-label={slot >= 0 ? `Tirar ${learnedSkill.name} da build` : `Pôr ${learnedSkill.name} na build`}
                    title={slot >= 0 ? 'Tirar da build' : complete ? 'Build cheia: tire uma antes' : 'Pôr na build'}
                    className={cn(
                      'focus-ring flex w-8 shrink-0 items-center justify-center border transition-all disabled:pointer-events-none disabled:opacity-30',
                      slot >= 0
                        ? 'border-transparent text-fg-subtle hover:border-danger/50 hover:bg-danger-dim hover:text-danger-hover'
                        : 'border-line text-primary-soft hover:border-primary-soft/60 hover:bg-primary/15',
                    )}
                  >
                    {slot >= 0 ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div
          style={{ '--tone': focusedSkill ? skillKindStyle(focusedSkill).color : 'var(--color-primary-soft)' } as CSSProperties}
          className="chamfer relative min-h-56 overflow-hidden p-5 [--chamfer-bg:var(--color-surface)] [--chamfer-border:color-mix(in_srgb,var(--tone)_35%,var(--color-line))] [--cut:16px]"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-(--tone)/8 to-transparent" />
          <div className="relative">
            {focusedSkill ? (
              <div key={focusedSkill.key} className="space-y-4 motion-safe:animate-fade-in">
                <SkillCard
                  skill={focusedSkill}
                  enhanced={learned.find((s) => s.key === focusedSkill.key)?.isEnhanced}
                  aside={
                    slots.includes(focusedSkill.key) && (
                      <Badge tone="primary">
                        <Check className="size-3" /> Na build
                      </Badge>
                    )
                  }
                />
                {learned.some((s) => s.key === focusedSkill.key) && (
                  <EnhancePanel
                    key={focusedSkill.key}
                    characterId={character.id}
                    skill={focusedSkill}
                    enhanced={!!learned.find((s) => s.key === focusedSkill.key)?.isEnhanced}
                  />
                )}
              </div>
            ) : (
              <p className="text-sm text-fg-muted">Selecione uma skill para ver os detalhes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

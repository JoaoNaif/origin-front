import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { SectionTitle } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { SkillCard } from '@/features/characters/skill-card'
import { useChooseSkillOffer, useSkillOffers, type CharacterClass, type SkillOffer } from '@/features/game/game-api'
import { apiErrorMessage } from '@/lib/api'
import { CharacterPortrait } from '@/features/game/character-art'
import { cn } from '@/lib/cn'

/**
 * Blocos de skill pendentes do personagem (D77, D135): a cada 5 níveis, escolhe 1 de até 3. Sem prazo e sem recusar;
 * a escolhida vai para as aprendidas, fora da build. Só o bloco mais antigo fica aberto: a fila vem em ordem.
 */
export function SkillOffers({ characterId, templateKey, characterClass }: { characterId: string; templateKey: string; characterClass: CharacterClass }) {
  const offers = useSkillOffers()
  const pending = offers.data?.filter((o) => o.characterId === characterId) ?? []
  if (!pending.length) return null

  const [current, ...next] = pending

  return (
    <section className="space-y-5">
      <SectionTitle
        actions={
          next.length > 0 && (
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-fg-subtle">
              +{next.length} na fila · nível {next.map((o) => o.level).join(', ')}
            </span>
          )
        }
      >
        <CharacterPortrait templateKey={templateKey} characterClass={characterClass} zoom={3.6} className="size-8 self-center border border-primary/40 bg-primary-dim" iconClassName="size-4 text-primary-soft" />
        <Sparkles className="size-4 self-center text-primary-soft" />
        Bloco de skill · nível {current.level}
      </SectionTitle>
      {/* key: escolhido um bloco, o próximo começa sem seleção */}
      <OfferBlock key={current.id} offer={current} characterId={characterId} />
    </section>
  )
}

function OfferBlock({ offer, characterId }: { offer: SkillOffer; characterId: string }) {
  const [picked, setPicked] = useState<string | null>(null)
  const choose = useChooseSkillOffer(characterId)
  const pickedSkill = offer.skills.find((s) => s.key === picked)

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Escolha 1 das {offer.skills.length}. A escolha é definitiva; a skill entra nas aprendidas e você põe na build quando quiser.
      </p>

      <ul role="radiogroup" aria-label="Skills do bloco" className={cn('grid gap-3', offer.skills.length > 2 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
        {offer.skills.map((skill) => {
          const active = picked === skill.key
          const toggle = () => {
            if (choose.isPending) return
            choose.reset()
            setPicked(active ? null : skill.key)
          }
          return (
            <li key={skill.key} role="none">
              {/* radio em div: o card tem lista e dados, que não cabem dentro de um <button> */}
              <div
                role="radio"
                aria-checked={active}
                tabIndex={0}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  toggle()
                }}
                className={cn(
                  'focus-ring chamfer relative flex h-full w-full cursor-pointer flex-col p-5 text-left [--cut:16px] transition-all duration-200 ease-out-soft',
                  active
                    ? '[--chamfer-bg:rgb(34_26_61/0.9)] [--chamfer-border:var(--color-primary-soft)] drop-shadow-[0_8px_24px_rgb(139_92_246/0.35)]'
                    : '[--chamfer-bg:var(--color-surface)] [--chamfer-border:var(--color-line)] hover:-translate-y-0.5 hover:[--chamfer-border:var(--color-line-strong)]',
                )}
              >
                <SkillCard
                  skill={skill}
                  aside={
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center border transition-colors',
                        active ? 'border-primary bg-primary text-on-primary' : 'border-line-strong text-transparent',
                      )}
                    >
                      <Check className="size-3.5" />
                    </span>
                  }
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {choose.isError && <p className="mr-auto text-xs text-danger">{apiErrorMessage(choose.error)}</p>}
        <Button
          disabled={!picked || choose.isPending}
          onClick={() => picked && choose.mutate({ offerId: offer.id, skillKey: picked })}
        >
          {choose.isPending ? 'Aprendendo...' : pickedSkill ? `Aprender ${pickedSkill.name}` : 'Escolha uma skill'}
        </Button>
      </div>
    </div>
  )
}

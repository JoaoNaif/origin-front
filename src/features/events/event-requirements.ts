import type { EventRequirement } from '@/features/events/event-api'
import type { Character, DangerLevel, Rarity, Template } from '@/features/game/game-api'

// Espelho de `eventRequirementError` (../origin-game/src/domain/events/services/event-requirements.ts) e do squad fixo,
// só para orientar a escolha do esquadrão antes de entrar: quem confere é o `POST /battles`. **Mudou lá, muda aqui.**

const DANGER_ORDER: DangerLevel[] = ['DISCRETE', 'CONTINUOUS', 'DIFFERENTIABLE', 'NON_LINEAR', 'CHAOTIC']
const RARITY_ORDER: Rarity[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS']

/** Cada requisito com se o grupo cumpre (nulo = sem dado para conferir, ex. catálogo ainda carregando). */
export function checkRequirements(
  requirements: EventRequirement[],
  members: Character[],
  templates: Map<string, Template>,
): { requirement: EventRequirement; met: boolean | null }[] {
  const lineagesOf = (c: Character) => templates.get(c.templateKey)?.variants.map((v) => v.lineage)
  const rarityOf = (c: Character) => templates.get(c.templateKey)?.rarity

  return requirements.map((r) => {
    switch (r.type) {
      case 'MIN_LEVEL':
        return { requirement: r, met: members.every((m) => m.level >= r.level) }
      case 'CLASS_COUNT':
        return { requirement: r, met: members.filter((m) => m.characterClass === r.characterClass).length >= r.min }
      case 'LINEAGE': {
        if (members.some((m) => !lineagesOf(m))) return { requirement: r, met: null }
        return { requirement: r, met: members.filter((m) => lineagesOf(m)!.includes(r.lineage)).length >= r.min }
      }
      case 'FAMILY':
        return { requirement: r, met: members.filter((m) => m.traitKeys.includes(r.traitKey)).length >= r.min }
      case 'MIN_DANGER':
        return { requirement: r, met: members.every((m) => DANGER_ORDER.indexOf(m.danger) >= DANGER_ORDER.indexOf(r.level)) }
      case 'MAX_RARITY': {
        if (members.some((m) => !rarityOf(m))) return { requirement: r, met: null }
        return { requirement: r, met: members.every((m) => RARITY_ORDER.indexOf(rarityOf(m)!) <= RARITY_ORDER.indexOf(r.rarity)) }
      }
    }
  })
}

/** Squad fixo já travado: o esquadrão precisa ter exatamente os mesmos 4 personagens (em qualquer posição). */
export function matchesLockedSquad(memberIds: string[], locked: string[] | null): boolean {
  if (!locked) return true
  const set = new Set(locked)
  return memberIds.length === set.size && memberIds.every((id) => set.has(id))
}

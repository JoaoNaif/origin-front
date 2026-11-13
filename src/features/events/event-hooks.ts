import { useEffect, useState } from 'react'
import { useBeastRules } from '@/features/beasts/beast-api'
import { formatCoins, fragmentLabels } from '@/features/economy/economy-labels'
import type { EventPhase, EventReward } from '@/features/events/event-api'
import { formatDate, formatDuration } from '@/features/events/event-labels'
import { useTemplates } from '@/features/game/game-api'
import { useGearRules } from '@/features/gear/gear-api'

// Hooks e contas dos eventos usados pelas peças de event-ui.tsx e pelas telas (fora dele por causa do fast refresh).

/** A hora do servidor: o relógio do aparelho corrigido pela diferença da última resposta, atualizado a cada `interval`. */
export function useServerNow(clockOffset: number, interval = 30_000) {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return tick + clockOffset
}

/** "Começa em 2d 4h" / "Termina em 5h" / "Encerrou 12 nov.". */
export function phaseClock(event: { phase: EventPhase; startsAt: string; endsAt: string }, now: number) {
  if (event.phase === 'ANNOUNCED') return { label: 'Começa em', value: formatDuration(new Date(event.startsAt).getTime() - now) }
  if (event.phase === 'OPEN') return { label: 'Termina em', value: formatDuration(new Date(event.endsAt).getTime() - now) }
  return { label: 'Encerrou', value: formatDate(event.endsAt) }
}

/** Nomes e desenhos dos prêmios pela `key` (catálogos com cache). Sem o catálogo, fica a `key`. */
export function useRewardCatalog() {
  const templates = useTemplates()
  const gear = useGearRules()
  const beasts = useBeastRules()
  return {
    template: (key: string) => templates.data?.find((t) => t.key === key),
    gear: (key: string) => gear.data?.gear.find((g) => g.key === key),
    beast: (key: string) => beasts.data?.beasts.find((b) => b.key === key),
  }
}

/** O prêmio em texto ("150 M", "Baú B", "Égide Cinzenta"), para listas e a revisão do admin. */
export function useRewardText() {
  const catalog = useRewardCatalog()
  return (r: EventReward) => {
    switch (r.type) {
      case 'COINS':
        return `${formatCoins(r.amount)} M`
      case 'FRAGMENTS':
        return `${r.amount} fragmentos ${fragmentLabels[r.lineage]}`
      case 'CHEST':
        return `Baú ${r.tier}`
      case 'CHARACTER':
        return catalog.template(r.templateKey)?.name ?? r.templateKey
      case 'GEAR':
        return catalog.gear(r.gearKey)?.name ?? r.gearKey
      case 'BEAST':
        return catalog.beast(r.beastKey)?.name ?? r.beastKey
    }
  }
}

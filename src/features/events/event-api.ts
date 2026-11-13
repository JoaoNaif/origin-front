import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BattleDraft } from '@/features/battle/battle-api'
import { beastsKey } from '@/features/beasts/beast-api'
import { walletKey } from '@/features/economy/economy-api'
import type { CharacterClass, DangerLevel, Lineage, Rarity } from '@/features/game/game-api'
import { gearKey } from '@/features/gear/gear-api'
import { api } from '@/lib/api'

// Eventos (../origin-game/docs/api.md, "Eventos"; D155, D156): momentos raros, sempre com fim, criados pelo admin. Cada
// evento é uma lista de etapas em sequência, cada uma uma batalha PvE contra um squad de NPC. Quem decide tudo (fase,
// tentativas, requisitos, prêmios) é o servidor; o front mostra e manda a pré-batalha.

export type EventKind = 'TOWER' | 'CHARACTER_LAUNCH' | 'HUNT' | 'RESEARCH' | 'UNIQUE_BOSS'
/** ANNOUNCED = já aparece ("começa em..."), sem entrar. */
export type EventPhase = 'ANNOUNCED' | 'OPEN' | 'ENDED'
/** FIXED = os 4 personagens da primeira batalha ficam travados (posição livre). */
export type EventSquadMode = 'FIXED' | 'FREE'

/** Requisito de entrada, conferido no squad a cada batalha do evento. */
export type EventRequirement =
  | { type: 'MIN_LEVEL'; level: number }
  | { type: 'CLASS_COUNT'; characterClass: CharacterClass; min: number }
  | { type: 'LINEAGE'; lineage: Lineage; min: number }
  | { type: 'FAMILY'; traitKey: string; min: number }
  | { type: 'MIN_DANGER'; level: DangerLevel }
  | { type: 'MAX_RARITY'; rarity: Rarity }

/** Modificador de regra (pesquisa, mas vale em qualquer tipo). */
export type EventModifier =
  | { type: 'LEVELED_STATS'; level: number }
  | { type: 'EARLY_EXHAUSTION'; afterRound: number }
  | { type: 'NO_HEALING' }
  | { type: 'EQUAL_SPEED' }

/** Um prêmio: as ligações pela `key` do catálogo. */
export type EventReward =
  | { type: 'COINS'; amount: number }
  | { type: 'FRAGMENTS'; lineage: Lineage; amount: number }
  | { type: 'CHEST'; tier: Rarity }
  | { type: 'CHARACTER'; templateKey: string }
  | { type: 'GEAR'; gearKey: string }
  | { type: 'BEAST'; beastKey: string }

export type EventRewardType = EventReward['type']
export type EventAttemptLimit = { count: number; per: 'DAY' | 'EVENT' }

export type EventStage = {
  name: string
  npcSquadKey: string
  /** Nulo se o squad saiu do catálogo. */
  npcSquadName: string | null
  rewards: EventReward[]
  /** Caça: a besta que a vitória pode capturar. */
  captureBeastKey: string | null
  cleared: boolean
}

export type EventProgress = {
  clearedStages: number
  totalStages: number
  /** Base 0; nulo = concluiu. */
  nextStage: number | null
  completed: boolean
  completedAt: string | null
  /** Nulo = à vontade. O dia vira à meia-noite UTC. */
  attemptsLeft: number | null
  attemptsTotal: number
  /** Squad fixo já travado: os 4 da primeira batalha. */
  lockedCharacterIds: string[] | null
  participated: boolean
  /** Caça: a chance da etapa atual, já com as falhas (0 a 1). */
  captureChance: number | null
}

/** O evento como o jogador vê (`GET /events`). */
export type GameEvent = {
  key: string
  name: string
  description: string | null
  kind: EventKind
  announceAt: string
  startsAt: string
  endsAt: string
  requirements: EventRequirement[]
  attemptLimit: EventAttemptLimit | null
  squadMode: EventSquadMode
  /** Campo fixo; nulo = sorteado. */
  fieldKey: string | null
  modifiers: EventModifier[]
  stages: EventStage[]
  completionRewards: EventReward[]
  participationRewards: EventReward[]
  phase: EventPhase
  progress: EventProgress
}

/** Pré-batalha de evento: a do PvE mais o evento e a etapa. */
export type EventDraft = BattleDraft & {
  event: { key: string; name: string; stage: number; stageName: string; squadMode: EventSquadMode; modifiers: EventModifier[] }
}

/** Como um prêmio chegou à conta. */
export type GrantedEventReward =
  /** `refId`: o personagem, equipamento, besta ou baú criado (nulo em moeda e fragmentos). */
  | { reward: EventReward; status: 'DELIVERED'; refId: string | null }
  /** Personagem repetido: virou moeda pela raridade. */
  | { reward: EventReward; status: 'CONVERTED'; coins: number }
  /** Não coube no inventário: foi para a caixa de recompensas. */
  | { reward: EventReward; status: 'PENDING'; pendingId: string; expiresAt: string }
  /** A `key` saiu do catálogo: nada a entregar. */
  | { reward: EventReward; status: 'MISSING' }

export type EventRewardSource = 'PARTICIPATION' | 'STAGE' | 'CAPTURE' | 'COMPLETION'

/** O que a batalha rendeu no evento (fim da batalha; nulo fora de evento e na desistência). */
export type EventBattleOutcome = {
  eventKey: string
  stage: number
  won: boolean
  /** Venceu e a etapa contou (na caça, só se capturou). */
  stageCleared: boolean
  capture: { beastKey: string; chance: number; captured: boolean } | null
  /** Esta vitória concluiu o evento. */
  completed: boolean
  rewards: (GrantedEventReward & { source: EventRewardSource })[]
}

/** Prêmio na caixa de recompensas (só equipamento e besta, o que ocupa inventário). */
export type PendingReward = { id: string; reward: EventReward; eventId: string | null; createdAt: string; expiresAt: string }

export const eventsKey = ['events'] as const
export const rewardBoxKey = ['me', 'reward-box'] as const

/**
 * Os eventos que a conta vê (abertos, anunciados e os encerrados em que jogou) e a hora do servidor, para as contagens
 * ("começa em...") não dependerem do relógio do aparelho.
 */
export function useEvents() {
  return useQuery({
    queryKey: eventsKey,
    queryFn: async () => {
      const { events, serverTime } = (await api.get<{ events: GameEvent[]; serverTime: string }>('/events')).data
      return { events, clockOffset: new Date(serverTime).getTime() - Date.now() }
    },
  })
}

/** POST /events/:key/draft: a pré-batalha da próxima etapa (adversário e campo). Vale 30 minutos. */
export function useEventDraft() {
  return useMutation({
    mutationFn: async (eventKey: string) => (await api.post<{ draft: EventDraft }>(`/events/${eventKey}/draft`)).data.draft,
  })
}

/** A caixa de recompensas: o que não coube no inventário, só o que está no prazo. */
export function useRewardBox() {
  return useQuery({
    queryKey: rewardBoxKey,
    queryFn: async () => (await api.get<{ rewards: PendingReward[] }>('/me/reward-box')).data.rewards,
  })
}

/** POST /me/reward-box/:id/claim: retira (precisa de espaço no inventário). Entra no equipamento ou nas bestas. */
export function useClaimReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.post<{ granted: GrantedEventReward }>(`/me/reward-box/${id}/claim`)).data.granted,
    onSettled: () => Promise.all([rewardBoxKey, gearKey, beastsKey, walletKey].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

/** DELETE /me/reward-box/:id: descarta de vez, sem moeda. */
export function useDiscardReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/me/reward-box/${id}`),
    onSuccess: (_data, id) => queryClient.setQueryData<PendingReward[]>(rewardBoxKey, (list) => list?.filter((r) => r.id !== id)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: rewardBoxKey }),
  })
}

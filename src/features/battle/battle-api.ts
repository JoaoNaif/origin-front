import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AiDifficulty,
  AiProfile,
  BattleReward,
  BattleSummary,
  CharacterClass,
  Lineage,
  SkillArea,
  SkillEffect,
  SkillRange,
  SkillTarget,
  SkillTier,
  Stat,
  StatusType,
} from '@/features/game/game-api'
import { api } from '@/lib/api'

// Batalha PvE (../origin-game/docs/api.md, "Batalhas"). O servidor é a autoridade (D9): a tela só mostra o estado,
// as opções da vez e os eventos, e manda a jogada escolhida.

export type Side = 'PLAYER' | 'OPPONENT'
export type Cell = { row: number; column: number }

export type NpcSquad = { key: string; name: string; description: string; profile: AiProfile; difficulty: AiDifficulty; level: number }

export type BattleField = {
  key: string
  name: string
  /** Quem tem qualquer um destes traços ganha o bônus (D98). */
  requiredTraitKeys: string[]
  primaryStat: Stat
  secondaryStat: Stat
  primaryPercent: number
  secondaryPercent: number
}

export type BattleDraft = {
  id: string
  opponent: { key: string; name: string; profile: AiProfile; difficulty: AiDifficulty }
  /** Nulo = sem campo. */
  field: BattleField | null
}

export type UnitSkill = {
  key: string
  name: string
  lineage: Lineage
  tier: SkillTier
  target: SkillTarget
  range: SkillRange | null
  area: SkillArea
  cooldown: number
  desgastePercent: number
  baseHitChance: number | null
  isEnhanced: boolean
  effects: SkillEffect[]
  /** Fora de recarga. */
  ready: boolean
}

export type BattleUnit = {
  ref: string
  side: Side
  characterId: string | null
  name: string
  templateKey: string
  characterClass: CharacterClass
  level: number
  traitKeys: string[]
  /** Pode vir fracionado (Desgaste no HP). */
  hp: number
  maxHp: number
  shield: number
  alive: boolean
  /** Nula quando derrotada. */
  position: Cell | null
  statuses: StatusType[]
  tauntedBy: string | null
  protectedBy: string | null
  engaged: boolean
  /** Nulos no inimigo. */
  stats: Record<Stat, number> | null
  /** Do inimigo, só as já vistas. */
  skills: UnitSkill[]
}

export type Battle = {
  id: string
  mode: 'PVE'
  status: BattleSummary['status']
  opponent: BattleSummary['opponent']
  round: number
  turn: { ref: string; side: Side } | null
  /** As próximas vezes (sem a atual). */
  timeline: { ref: string; round: number; extra: boolean }[]
  field: { key: string; name: string | null; untilRound: number | null; isInitial: boolean }
  fields: BattleField[]
  units: BattleUnit[]
  result: {
    winner: Side
    endReason: NonNullable<BattleSummary['endReason']>
    rounds: number
    finishedAt: string
    rewards: BattleReward[]
  } | null
  startedAt: string
}

/** `src/domain/combat/engine/battle-events.ts` no backend. */
export type BattleEvent =
  | { type: 'TURN'; ref: string; round: number; tick: number; extra?: boolean }
  | { type: 'SKIP'; ref: string; reason: 'STUN' }
  | { type: 'DOT'; ref: string; amount: number }
  | { type: 'SKILL'; ref: string; skillKey: string; potency: number }
  | { type: 'INTERCEPT'; guardianRef: string; protectedRef: string }
  | { type: 'MISS'; ref: string; targetRef: string }
  | { type: 'DAMAGE'; ref: string; targetRef: string; amount: number; shieldAbsorbed: number }
  | { type: 'HEAL' | 'SHIELD' | 'PROTECT' | 'GRANT_TURN'; ref: string; targetRef: string; amount?: number }
  | { type: 'EXPLOIT'; targetRef: string; status: StatusType; consumed: boolean }
  | { type: 'PROTECTED'; protectorRef: string; protectedRef: string }
  | { type: 'RECOVER'; ref: string; targetRef: string; relieved: number }
  | { type: 'MODIFIER'; targetRef: string; stat: Stat; percent: number; result: string }
  | { type: 'STATUS'; targetRef: string; status: StatusType; result: 'APPLIED' | 'RENEWED' | 'IMMUNE' | 'RESISTED' }
  | { type: 'LOCK'; targetRef: string; skillKey: string }
  | { type: 'MOVE'; ref: string; to: Cell; forced: boolean }
  | { type: 'MOVE_BLOCKED'; ref: string; reason: 'RESISTED' | 'BLOCKED' }
  | { type: 'TURN_SHIFT'; targetRef: string; percent: number }
  | { type: 'DESGASTE'; ref: string; selfDamage: number }
  | { type: 'DEFEND'; ref: string }
  | { type: 'PASSIVE'; ref: string; name: string; trigger: string }
  | { type: 'FIELD'; fieldKey: string | null; ref: string | null; untilRound: number | null }
  | { type: 'DEFEATED'; ref: string }
  | { type: 'ROUND_END'; round: number }
  | { type: 'BATTLE_END'; winner: Side; reason: string; round: number }

/** Corpo de `POST /battles/:id/actions` (o `payload` das opções já vem neste formato). */
export type ActionPayload =
  | { type: 'SKILL'; skillKey: string; targetSide: Side; target: Cell; swapWith?: Cell; moveTo?: Cell; fieldKey?: string }
  | { type: 'MOVE'; to: Cell }
  | { type: 'SWAP'; withRef: string }
  | { type: 'DEFEND' }

export type PreviewEffect =
  | { type: 'DAMAGE' | 'HEAL' | 'SHIELD'; amount: number }
  | { type: 'STAT_MODIFIER'; stat: Stat; percent: number }
  | { type: 'APPLY_STATUS'; status: StatusType; chance: number }
  | { type: 'REPOSITION'; kind: 'PUSH' | 'PULL' | 'SWAP' | 'MOVE_ALLY' | 'DASH'; chance: number }
  | { type: 'TURN_SHIFT'; percent: number }
  | { type: 'RECOVER'; relieved: number }
  | { type: 'CHANGE_FIELD' | 'PROTECT' | 'GRANT_TURN' | 'EXPLOIT' }

export type TurnOption = {
  payload: ActionPayload
  /** Só nas skills. */
  preview: {
    potency: number
    desgaste: { cost: number; slack: number }
    hits: { ref: string; falloff: number; hitChance: number; effects: PreviewEffect[] }[]
  } | null
}

export type BattleState = { battle: Battle; events: BattleEvent[] }

/** Resposta de começar e de jogar: os eventos são só os desta jogada (e das vezes da máquina depois dela). */
export type BattleStep = BattleState & { rewards: BattleReward[] }

export const battleScreenKey = (id: string) => ['battle-screen', id] as const

export function useNpcSquads() {
  return useQuery({
    queryKey: ['catalog', 'npc-squads'],
    queryFn: async () => (await api.get<{ npcSquads: NpcSquad[] }>('/npc-squads')).data.npcSquads,
    staleTime: Infinity,
  })
}

/** POST /me/battle-drafts: sorteia o campo antes da escolha do squad (D28). Vale 30 minutos. */
export function useCreateDraft() {
  return useMutation({
    mutationFn: async (npcSquadKey: string) =>
      (await api.post<{ draft: BattleDraft }>('/me/battle-drafts', { npcSquadKey })).data.draft,
  })
}

export function useStartBattle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { draftId: string; squadId: string }) => (await api.post<BattleStep>('/battles', input)).data,
    onSuccess: (step) => {
      // a tela da batalha abre com o estado que já veio, sem nova ida ao servidor
      queryClient.setQueryData<BattleState>(battleScreenKey(step.battle.id), { battle: step.battle, events: step.events })
      queryClient.invalidateQueries({ queryKey: ['me', 'battles'] })
    },
  })
}

/** GET /battles/:id: o estado e todos os eventos (retomar ou rever). */
export function useBattleScreen(id: string) {
  return useQuery({
    queryKey: battleScreenKey(id),
    queryFn: async () => (await api.get<BattleState>(`/battles/${id}`)).data,
    staleTime: Infinity,
  })
}

/** GET /battles/:id/options: só na vez do jogador (fora dela, 409). */
export function useTurnOptions(id: string, turnKey: string | null) {
  return useQuery({
    queryKey: ['battle-options', id, turnKey],
    queryFn: async () => (await api.get<{ options: TurnOption[] }>(`/battles/${id}/options`)).data.options,
    enabled: turnKey !== null,
    staleTime: Infinity,
    retry: false,
  })
}

export function useSubmitAction(id: string) {
  return useMutation({
    mutationFn: async (payload: ActionPayload) => (await api.post<BattleStep>(`/battles/${id}/actions`, payload)).data,
  })
}

export function useForfeit(id: string) {
  return useMutation({
    mutationFn: async () => (await api.post<{ battle: Battle }>(`/battles/${id}/forfeit`)).data.battle,
  })
}

/** Fim da batalha: XP, níveis e blocos novos mudam a conta. */
export function useRefreshAfterBattle() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [['me', 'battles'], ['me', 'characters'], ['me', 'skill-offers'], ['characters']].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    )
}

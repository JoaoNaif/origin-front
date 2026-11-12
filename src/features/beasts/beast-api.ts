import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { walletKey, type Wallet } from '@/features/economy/economy-api'
import type { SkillArea, SkillEffect, SkillRange, SkillTarget, SkillTier } from '@/features/game/game-api'
import { gearKey, type GearLineage, type GearRequirement } from '@/features/gear/gear-api'
import { api } from '@/lib/api'

// Contratos com bestas (../origin-game/docs/api.md, "Contratos com bestas"; D95, D154): a besta da conta, o contrato
// com um personagem (a invocação toma um slot da build), venda e soltar. Quem decide tudo é o servidor.

/** DOMINANCE = a IA joga a besta; MASTER = você joga; EQUALITY = não entra em campo, divide o dano com o dono. */
export type BeastContract = 'DOMINANCE' | 'MASTER' | 'EQUALITY'
export type BeastGrade = 'SQUIRE' | 'KNIGHT' | 'MASTER' | 'KING' | 'SACRED'

/** Skill da besta em campo: o formato da skill do catálogo, sem Desgaste. */
export type BeastSkill = {
  name: string
  description: string | null
  tier: SkillTier
  target: SkillTarget
  range: SkillRange | null
  area: SkillArea
  cooldown: number
  baseHitChance: number | null
  effects: SkillEffect[]
}

/** A besta do catálogo (`GET /beast-rules`). */
export type BeastTemplate = {
  key: string
  name: string
  description: string | null
  contract: BeastContract
  grade: BeastGrade
  lineage: GearLineage
  /** As 2 em campo (nenhuma na Igualdade). */
  skills: BeastSkill[]
  /** Só no Mestre: todos precisam ser cumpridos. */
  requirements: GearRequirement[]
  titles: string[]
  /** Nulo = sagrada (não se vende). */
  saleValue: number | null
}

/** Requisitos do contrato Mestre com um personagem: `meets` = pode firmar e entrar em batalha. */
export type BeastRequirements = {
  characterId: string
  meets: boolean
  requirements: (GearRequirement & { met: boolean })[]
  met: number
  /** Coberto por título da lista (no máximo 1; o Prodígio não conta). */
  waived: number
  matchingTitles: string[]
}

/** A besta da conta. `characterId` e `slot` nulos = sem contrato (guardada). */
export type Beast = BeastTemplate & {
  id: string
  source: 'ADMIN' | 'EVENT'
  acquiredAt: string
  characterId: string | null
  /** Slot da build (1 a 4) que a invocação toma na batalha. */
  slot: number | null
  /** Só no Mestre com contrato: os requisitos com o dono agora (sem todos, a batalha não começa). */
  requirementsWithHolder: BeastRequirements | null
}

/** A besta com contrato, como vem no personagem. */
export type CharacterBeast = Pick<Beast, 'id' | 'key' | 'name' | 'contract' | 'grade'> & { slot: number }

/** Regras dos contratos (`GET /beast-rules`), lidas das constantes do servidor. */
export type BeastRules = {
  grades: {
    grade: BeastGrade
    /** % dos stats do dono para a besta em campo. */
    statPercent: { DOMINANCE: number; MASTER: number }
    /** Vontade que o dono perde enquanto a besta da Dominância está em campo. */
    dominanceWillCost: number
    equality: { bufferPercent: number; bonusPercent: number }
    masterRequirements: number
    saleValue: number | null
  }[]
  /** Fração da Velocidade e da Vontade do dono que a besta leva. */
  speedShare: number
  willShare: number
  /** Turnos em campo (Igualdade: turnos do dono). */
  duration: { normal: number; sacred: number }
  /** Bestas em campo ao mesmo tempo por esquadrão (a Igualdade não conta). */
  fieldCap: number
  /** Bestas por personagem (o traço Domador dá mais). */
  perCharacter: number
  equalityAbsorbShare: number
  equalityBreakPercent: number
}

export const beastsKey = ['me', 'beasts'] as const
const requirementsKey = (id: string) => ['beasts', id, 'requirements'] as const

/** As bestas da conta. Os espaços do inventário (somados com o equipamento) vêm em `useGear`. */
export function useBeasts() {
  return useQuery({
    queryKey: beastsKey,
    queryFn: async () => (await api.get<{ beasts: Beast[] }>('/me/beasts')).data.beasts,
  })
}

/** Regras e catálogo de bestas: mudam só com deploy ou com o admin. */
export function useBeastRules() {
  return useQuery({
    queryKey: ['catalog', 'beast-rules'],
    queryFn: async () => (await api.get<{ beastRules: BeastRules; beasts: BeastTemplate[] }>('/beast-rules')).data,
    staleTime: Infinity,
  })
}

/** Os requisitos da besta com cada personagem da conta (vazio fora do Mestre). */
export function useBeastRequirements(id: string | null) {
  return useQuery({
    queryKey: requirementsKey(id ?? ''),
    queryFn: async () => (await api.get<{ beast: Beast; requirements: BeastRequirements[] }>(`/beasts/${id}/requirements`)).data.requirements,
    enabled: !!id,
  })
}

/** Contrato, troca de slot e soltar mudam as bestas, o personagem (`beasts`) e o inventário. */
function useBeastChange<T>(request: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSettled: () =>
      Promise.all([beastsKey, gearKey, ['me', 'characters'], ['characters']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

/** POST /beasts/:id/contract: liga a besta ao personagem, uma vez só; a invocação toma o slot dado. */
export const useContractBeast = () =>
  useBeastChange(async ({ beastId, characterId, slot }: { beastId: string; characterId: string; slot: number }) =>
    (await api.post<{ beast: Beast }>(`/beasts/${beastId}/contract`, { characterId, slot })).data.beast,
  )

/** PUT /beasts/:id/slot: troca o slot que a invocação toma. */
export const useMoveBeastSlot = () =>
  useBeastChange(async ({ beastId, slot }: { beastId: string; slot: number }) =>
    (await api.put<{ beast: Beast }>(`/beasts/${beastId}/slot`, { slot })).data.beast,
  )

/** DELETE /beasts/:id: desfaz o contrato ou descarta. A besta se perde (não volta e não rende moeda). */
export const useReleaseBeast = () => useBeastChange(async (beastId: string) => api.delete(`/beasts/${beastId}`))

/** POST /beasts/:id/sell: vende ao sistema a besta sem contrato (a sagrada não se vende). */
export function useSellBeast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (beastId: string) => (await api.post<{ coins: number; wallet: Wallet }>(`/beasts/${beastId}/sell`)).data,
    onSuccess: ({ wallet }, beastId) => {
      queryClient.setQueryData(walletKey, wallet)
      queryClient.setQueryData<Beast[]>(beastsKey, (list) => list?.filter((b) => b.id !== beastId))
    },
    // o inventário (somado com o equipamento) sempre muda; num erro, a carteira e a lista também podem ter mudado
    onSettled: (_data, error) =>
      Promise.all([gearKey, ...(error ? [walletKey, beastsKey] : [])].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

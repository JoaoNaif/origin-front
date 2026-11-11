import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { walletKey, type Wallet } from '@/features/economy/economy-api'
import type { Lineage, Rarity, Stat, StatBlock } from '@/features/game/game-api'
import { api } from '@/lib/api'

// Equipamento vivo (../origin-game/docs/api.md, "Equipamento vivo"; D94, D153): inventário, elo com cada personagem,
// equipar, vender e comprar espaços. O elo e o efeito vêm prontos do servidor: a tela só mostra.

export type GearKind = 'WEAPON' | 'ARMOR'
export type GearGrade = 'SQUIRE' | 'KNIGHT' | 'MASTER' | 'KING' | 'DIVINE'
export type GearBondLevel = 'FULL' | 'PARTIAL' | 'NONE'
/** A de uma variante: nunca `NONE`. */
export type GearLineage = Exclude<Lineage, 'NONE'>

/** "Alto" = entre os 2 maiores stats do portador (na régua das classes); "baixo" = entre os 2 menores. */
export type GearRequirement = { stat: Stat; level: 'HIGH' | 'LOW' }

/** Efeito da linhagem, já com o grau e o elo. */
export type GearPassive =
  | { type: 'DOT_ON_HIT'; chance: number }
  | { type: 'SINGLE_TARGET_REDUCTION'; percent: number }
  | { type: 'IGNORE_DEFENSE'; percent: number }
  | { type: 'STATUS_WILL'; percent: number }
  | { type: 'REGEN'; percentOfMaxHp: number }
  | { type: 'INITIAL_SHIELD'; percentOfMaxHp: number }

/** Chance de perder a ação, em %: `start` no 1º turno, +`step` por turno, até `max`. */
export type GearLoseAction = { start: number; step: number; max: number }

export type StatPercents = Partial<Record<Stat, number>>

export type GearEffects = {
  bond: GearBondLevel
  /** Bônus por stat, já com o elo e o ×1,25 sem variante (vale também fora da batalha). */
  bonusPercents: StatPercents
  /** Queda do parcial e do sem elo (negativo), só na batalha. */
  penaltyPercents: StatPercents
  /** Custo do pleno: Desgaste no início da batalha, no stat da linhagem. */
  initialDesgastePercent: number
  passive: GearPassive
  loseAction: GearLoseAction | null
}

/** Elo de um personagem com o equipamento (calculado na hora; na batalha vale o do início). */
export type GearBond = {
  characterId: string
  bond: GearBondLevel
  requirements: (GearRequirement & { met: boolean })[]
  /** Requisitos cumpridos de verdade. */
  met: number
  /** Substituídos por título da lista ou Prodígio (no máximo 1). */
  waived: number
  matchingTitles: string[]
  effects: GearEffects
}

/** O modelo do catálogo (`GET /gear-rules`). */
export type GearTemplate = {
  key: string
  name: string
  description: string | null
  kind: GearKind
  grade: GearGrade
  lineage: GearLineage
  primaryStat: Stat
  secondaryStat: Stat
  primaryPercent: number
  secondaryPercent: number
  requirements: GearRequirement[]
  titles: string[]
  /** Nulo = Divino (não se vende). */
  saleValue: number | null
}

/** O item da conta. */
export type Gear = GearTemplate & {
  id: string
  source: 'CHEST' | 'ADMIN'
  acquiredAt: string
  /** Nulo = guardado. */
  characterId: string | null
  /** Elo com quem está usando; nulo se guardado. */
  bond: GearBond | null
}

/** O equipamento no slot do personagem, com os stats fora da batalha já com o bônus. */
export type CharacterGear = Gear & { stats: StatBlock }

export type Inventory = { used: number; slots: number; nextExpansionPrice: number | null }

/** Regras do equipamento (`GET /gear-rules`), lidas das constantes do servidor. */
export type GearRules = {
  grades: {
    grade: GearGrade
    statPercents: { primary: number; secondary: number }
    requirements: number
    fullBondCostPercent: number
    passiveFactor: number
    rarity: Rarity | null
    saleValue: number | null
    partial: { statPercents: StatPercents; loseAction: GearLoseAction | null }
    none: { statPercents: StatPercents; loseAction: GearLoseAction | null }
  }[]
  bondFactor: Record<GearBondLevel, number>
  adminTuning: number
  maxWaivers: number
  noVariantBonus: number
  /** Efeito de cada linhagem no Rei com elo pleno. */
  lineagePassives: Record<GearLineage, GearPassive>
  inventory: { initial: number; step: number; max: number }
}

export const gearKey = ['me', 'gear'] as const
const gearBondsKey = (id: string) => ['gear', id, 'bonds'] as const

/** Inventário: os espaços e os equipamentos, do mais antigo para o mais novo. */
export function useGear() {
  return useQuery({
    queryKey: gearKey,
    queryFn: async () => (await api.get<{ inventory: Inventory; gear: Gear[] }>('/me/gear')).data,
  })
}

/** Regras e catálogo de equipamentos: mudam só com deploy ou com o admin. */
export function useGearRules() {
  return useQuery({
    queryKey: ['catalog', 'gear-rules'],
    queryFn: async () => (await api.get<{ gearRules: GearRules; gear: GearTemplate[] }>('/gear-rules')).data,
    staleTime: Infinity,
  })
}

/** O elo do equipamento com cada personagem da conta (para escolher quem usa). */
export function useGearBonds(id: string | null) {
  return useQuery({
    queryKey: gearBondsKey(id ?? ''),
    queryFn: async () => (await api.get<{ gear: Gear; bonds: GearBond[] }>(`/gear/${id}/bonds`)).data.bonds,
    enabled: !!id,
  })
}

/** Equipar e tirar mudam o inventário, o slot dos personagens e os stats da ficha. */
function useGearChange<T>(request: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSettled: () =>
      Promise.all(
        [gearKey, ['me', 'characters'], ['characters']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  })
}

/** POST /gear/:id/equip: um slot por personagem; o que estava nele volta ao inventário, e quem usava fica sem. */
export const useEquipGear = () =>
  useGearChange(async ({ gearId, characterId }: { gearId: string; characterId: string }) =>
    (await api.post<{ gear: Gear; unequipped: Gear | null }>(`/gear/${gearId}/equip`, { characterId })).data,
  )

/** POST /gear/:id/unequip: volta ao inventário. */
export const useUnequipGear = () =>
  useGearChange(async (gearId: string) => (await api.post<{ gear: Gear }>(`/gear/${gearId}/unequip`)).data)

/** POST /gear/:id/sell: vende ao sistema (o equipado precisa sair antes; o Divino não se vende). */
export function useSellGear() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (gearId: string) => (await api.post<{ coins: number; wallet: Wallet }>(`/gear/${gearId}/sell`)).data,
    onSuccess: ({ wallet }, gearId) => {
      queryClient.setQueryData(walletKey, wallet)
      queryClient.setQueryData<{ inventory: Inventory; gear: Gear[] }>(gearKey, (data) =>
        data && { inventory: { ...data.inventory, used: data.inventory.used - 1 }, gear: data.gear.filter((g) => g.id !== gearId) },
      )
    },
    // 409 (carteira mudou em outra aba) ou 400 (já vendido, equipado em outra aba): recarrega os dois
    onError: () => Promise.all([walletKey, gearKey].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

/** POST /me/inventory/expand: +5 espaços pelo preço da vez. */
export function useExpandInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      (
        await api.post<{ price: number; inventory: { slots: number; nextExpansionPrice: number | null }; wallet: Wallet }>(
          '/me/inventory/expand',
        )
      ).data,
    onSuccess: ({ inventory, wallet }) => {
      queryClient.setQueryData(walletKey, wallet)
      queryClient.setQueryData<{ inventory: Inventory; gear: Gear[] }>(gearKey, (data) => data && { ...data, inventory: { ...data.inventory, ...inventory } })
    },
    onError: () => Promise.all([walletKey, gearKey].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

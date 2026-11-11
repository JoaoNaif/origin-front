import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { characterQueryKey, storeCharacter, type Character, type Lineage, type Rarity, type SkillTier } from '@/features/game/game-api'
import type { Gear } from '@/features/gear/gear-api'
import { api } from '@/lib/api'

// Economia (../origin-game/docs/api.md, "Economia"; D100, D104, D150): carteira com moeda (M) e fragmentos, baús e o
// aprimoramento de skill. O servidor sorteia e cobra; a tela mostra preços e chances (`GET /economy`) e o resultado.

export type { Rarity }

export const rarityOrder: Rarity[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS']

/** Numa variação (ganho, conteúdo de baú) só vêm os tipos que mudaram. */
export type FragmentDelta = Partial<Record<Lineage, number>>

export type Wallet = {
  coins: number
  /** Os 7 tipos, com zero nos que faltam (`NONE` = Neutro). */
  fragments: Record<Lineage, number>
  /** Limite por tipo: o que passar vira moeda. */
  fragmentCap: number
}

export type ChestContents = {
  /** Raridade sorteada para o item. */
  rarity: Rarity
  /** Personagem novo que entrou no Elenco. */
  character: { templateKey: string; characterId: string } | null
  /** Repetido, que virou moeda. */
  convertedTemplateKey: string | null
  /** Equipamento vivo que entrou no inventário (D153; ausente nos baús abertos antes dele). */
  gear?: { templateKey: string; gearId: string } | null
  /** Equipamento que não coube no inventário e virou moeda. */
  convertedGearKey?: string | null
  /** Valor do que virou moeda (repetido, raridade sem personagem ou equipamento sem espaço). */
  coins: number
  fragments: FragmentDelta
}

export type Chest = {
  id: string
  tier: Rarity
  source: 'PURCHASE' | 'BATTLE'
  battleId: string | null
  createdAt: string
  openedAt: string | null
  /** Nulo até abrir. */
  contents: ChestContents | null
}

/** O que a batalha deu além do XP; nulo na desistência. */
export type BattleLoot = {
  coins: number
  fragments: FragmentDelta
  chest: { id: string; tier: Rarity } | null
}

export type EconomyValues = {
  /** `price` nulo = não se compra (B a SS). */
  chests: { tier: Rarity; price: number | null; fragments: number; rarityChances: Record<Rarity, number> }[]
  raritySaleValue: Record<Rarity, number>
  fragments: { cap: number; buyPrice: number; sellPrice: number }
  enhancement: { chance: number; cost: Record<SkillTier, { coins: number; fragments: number }> }
  battle: {
    coins: { WIN: number; LOSS: number }
    fragments: { WIN: number; LOSS: number }
    chestDrop: { tier: Rarity; chance: number }[]
    lossChestDropFactor: number
  }
}

export const walletKey = ['me', 'wallet'] as const
export const chestsKey = ['me', 'chests'] as const

/** Valores públicos da economia: mudam só com deploy do servidor. */
export function useEconomy() {
  return useQuery({
    queryKey: ['catalog', 'economy'],
    queryFn: async () => (await api.get<EconomyValues>('/economy')).data,
    staleTime: Infinity,
  })
}

export function useWallet() {
  return useQuery({
    queryKey: walletKey,
    queryFn: async () => (await api.get<{ wallet: Wallet }>('/me/wallet')).data.wallet,
  })
}

/** Baús fechados, do mais antigo para o mais novo. */
export function useChests() {
  return useQuery({
    queryKey: chestsKey,
    queryFn: async () => (await api.get<{ chests: Chest[] }>('/me/chests')).data.chests,
  })
}

/** Toda resposta de gasto traz a carteira nova: grava sem nova ida ao servidor. */
function setWallet(queryClient: QueryClient, wallet: Wallet) {
  queryClient.setQueryData(walletKey, wallet)
}

/** Um 409 (a carteira mudou no meio, outra aba) não gasta nada: recarrega para mostrar o saldo certo. */
function refetchWalletOnError(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: walletKey })
}

/** POST /me/chests: compra um baú (chega fechado). */
export function useBuyChest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tier: Rarity) => (await api.post<{ chest: Chest; wallet: Wallet }>('/me/chests', { tier })).data,
    onSuccess: ({ chest, wallet }) => {
      setWallet(queryClient, wallet)
      queryClient.setQueryData<Chest[]>(chestsKey, (list) => (list ? [...list, chest] : list))
    },
    onError: () => refetchWalletOnError(queryClient),
  })
}

export type OpenChestResult = { chest: Chest; character: Character | null; gear: Gear | null; wallet: Wallet }

/** POST /chests/:id/open: 1 item (personagem novo, equipamento ou moeda) + fragmentos. */
export function useOpenChest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.post<OpenChestResult>(`/chests/${id}/open`)).data,
    onSuccess: ({ chest, character, gear, wallet }) => {
      setWallet(queryClient, wallet)
      queryClient.setQueryData<Chest[]>(chestsKey, (list) => list?.filter((c) => c.id !== chest.id))
      if (character) {
        queryClient.setQueryData(characterQueryKey(character.id), character)
        queryClient.invalidateQueries({ queryKey: ['me', 'characters'] })
      }
      // o inventário (`gearKey` de gear-api)
      if (gear) queryClient.invalidateQueries({ queryKey: ['me', 'gear'] })
    },
    // 400 "já aberto" (outra aba): a lista estava velha
    onError: () => queryClient.invalidateQueries({ queryKey: chestsKey }),
  })
}

export type FragmentTrade = { type: Lineage; amount: number }

function useFragmentTrade(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (trade: FragmentTrade) => (await api.post<{ wallet: Wallet }>(path, trade)).data.wallet,
    onSuccess: (wallet) => setWallet(queryClient, wallet),
    onError: () => refetchWalletOnError(queryClient),
  })
}

/** POST /me/fragments/buy: até o limite do tipo. */
export const useBuyFragments = () => useFragmentTrade('/me/fragments/buy')

/** POST /me/fragments/sell. */
export const useSellFragments = () => useFragmentTrade('/me/fragments/sell')

/** POST /characters/:id/enhance: o custo sai dê certo ou não; `success` diz se aprimorou. */
export function useEnhanceSkill(characterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (skillKey: string) =>
      (
        await api.post<{ success: boolean; chance: number; character: Character; wallet: Wallet }>(
          `/characters/${characterId}/enhance`,
          { skillKey },
        )
      ).data,
    onSuccess: ({ character, wallet }) => {
      setWallet(queryClient, wallet)
      storeCharacter(queryClient, character)
    },
    onError: () => refetchWalletOnError(queryClient),
  })
}

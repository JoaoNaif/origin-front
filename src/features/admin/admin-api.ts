import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { Account } from '@/features/auth/auth-api'
import type { BattleSummary, Character, DomLevel, DomPillar } from '@/features/game/game-api'
import type { Beast } from '@/features/beasts/beast-api'
import type { Gear } from '@/features/gear/gear-api'
import { api, apiErrorMessage, type ApiErrorBody } from '@/lib/api'

// Rotas de admin (../origin-game/docs/api.md, "Admin"). Todas dão 403 para quem não é ADMIN.

export type CatalogCollection = 'variants' | 'traits' | 'templates' | 'skills' | 'fields' | 'npc-squads' | 'awakenings' | 'gear' | 'beasts' | 'events'

/** Item no formato do corpo da edição (ligações pela `key`) mais os campos só de leitura. */
export type CatalogItem = { key: string; name: string } & Record<string, unknown>

export type AdminCatalog = {
  /** Muda a cada gravação (hash). */
  version: string
  variants: CatalogItem[]
  traits: CatalogItem[]
  templates: CatalogItem[]
  skills: CatalogItem[]
  fields: CatalogItem[]
  npcSquads: CatalogItem[]
  awakenings: CatalogItem[]
  gear: CatalogItem[]
  beasts: CatalogItem[]
  events: CatalogItem[]
}

/** Coleção da URL → chave na resposta de `GET /admin/catalog`. */
export const catalogKeys: Record<CatalogCollection, Exclude<keyof AdminCatalog, 'version'>> = {
  variants: 'variants',
  traits: 'traits',
  templates: 'templates',
  skills: 'skills',
  fields: 'fields',
  'npc-squads': 'npcSquads',
  awakenings: 'awakenings',
  gear: 'gear',
  beasts: 'beasts',
  events: 'events',
}

/** Campos que o `GET /admin/catalog` traz e o `PUT` ignora. */
export const readOnlyFields: Partial<Record<CatalogCollection, string[]>> = {
  templates: ['skillKeys'],
  skills: ['lineage', 'isAwakened', 'templateKey', 'reference'],
  'npc-squads': ['level'],
  awakenings: ['baseVariantKey'],
  gear: ['saleValue'],
  beasts: ['saleValue'],
}

/** Corpo da edição: o item sem a `key` (vai na URL) e sem os campos só de leitura. */
export function editableBody(collection: CatalogCollection, item: CatalogItem) {
  const hidden = new Set(['key', ...(readOnlyFields[collection] ?? [])])
  return structuredClone(Object.fromEntries(Object.entries(item).filter(([field]) => !hidden.has(field))))
}

export type AdminAccount =Account & { characters: number; battles: number }

const catalogQueryKey = ['admin', 'catalog'] as const

export function useAdminCatalog() {
  return useQuery({
    queryKey: catalogQueryKey,
    queryFn: async () => (await api.get<{ catalog: AdminCatalog }>('/admin/catalog')).data.catalog,
  })
}

/** Listas dos selects e regras (orçamento por classe, referência por tier...). */
export function useAdminOptions() {
  return useQuery({
    queryKey: ['admin', 'options'],
    queryFn: async () => (await api.get<{ options: Record<string, unknown> }>('/admin/options')).data.options,
    staleTime: Infinity,
  })
}

export type SkillReference = { power: number; desgastePercent: number; cooldown: number; minLevel: number }

/** Valores de referência do tipo + forma (D16, D92), enquanto o admin monta a skill. */
export function useSkillReference(params: { tier: string; target: string; range: string | null; area: string; isNone: boolean; isAwakened: boolean }) {
  return useQuery({
    queryKey: ['admin', 'skill-reference', params],
    queryFn: async () =>
      (
        await api.get<{ reference: SkillReference }>('/admin/skills/reference', {
          params: {
            tier: params.tier,
            target: params.target,
            area: params.area,
            isNone: params.isNone,
            isAwakened: params.isAwakened,
            // alcance só conta em skill de inimigo
            ...(params.target === 'ENEMY' && params.range ? { range: params.range } : {}),
          },
        })
      ).data.reference,
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  })
}

/** Cada gravação relê o catálogo inteiro no servidor: depois dela, recarrega tudo (outros itens podem ter mudado). */
function useCatalogMutation<T>(request: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    // espera o catálogo novo chegar: quem chama já encontra o item salvo (ex.: a variante criada de dentro do modelo)
    onSuccess: () => {
      // o catálogo público (modelos, traços, NPCs) muda junto
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      return queryClient.invalidateQueries({ queryKey: catalogQueryKey })
    },
  })
}

/** POST /admin/:collection (novo) ou PUT /admin/:collection/:key (troca o item inteiro). */
export function useSaveCatalogEntry(collection: CatalogCollection) {
  return useCatalogMutation(async ({ key, body, isNew }: { key: string; body: Record<string, unknown>; isNew: boolean }) =>
    isNew ? api.post(`/admin/${collection}`, { ...body, key }) : api.put(`/admin/${collection}/${key}`, body),
  )
}

export function useDeleteCatalogEntry(collection: CatalogCollection) {
  return useCatalogMutation(async (key: string) => api.delete(`/admin/${collection}/${key}`))
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: ['admin', 'accounts'],
    queryFn: async () => (await api.get<{ accounts: AdminAccount[] }>('/admin/accounts')).data.accounts,
  })
}

export function useAccountCharacters(username: string) {
  return useQuery({
    queryKey: ['admin', 'accounts', username, 'characters'],
    queryFn: async () =>
      (await api.get<{ characters: Character[] }>(`/admin/accounts/${username}/characters`)).data.characters,
  })
}

export function useAccountBattles(username: string) {
  return useQuery({
    queryKey: ['admin', 'accounts', username, 'battles'],
    queryFn: async () => (await api.get<{ battles: BattleSummary[] }>(`/admin/accounts/${username}/battles`)).data.battles,
  })
}

/** POST /admin/accounts/:username/characters: dá o personagem como no cadastro (nível 0, kit na build). */
export function useGrantCharacter(username: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateKey: string) =>
      (await api.post<{ character: Character }>(`/admin/accounts/${username}/characters`, { templateKey })).data.character,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['me', 'characters'] })
    },
  })
}

/** POST /admin/accounts/:username/gear: dá um equipamento vivo, guardado no inventário (400 se cheio). */
export function useGrantGear(username: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (gearKey: string) => (await api.post<{ gear: Gear }>(`/admin/accounts/${username}/gear`, { gearKey })).data.gear,
    // se for a própria conta do admin, o Arsenal muda junto
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'gear'] }),
  })
}

/** POST /admin/accounts/:username/beasts: dá uma besta, sem contrato (no MVP é o "evento"; 400 se o inventário encheu). */
export function useGrantBeast(username: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (beastKey: string) => (await api.post<{ beast: Beast }>(`/admin/accounts/${username}/beasts`, { beastKey })).data.beast,
    // se for a própria conta do admin, Bestas e o inventário mudam junto
    onSuccess: () => Promise.all([['me', 'beasts'], ['me', 'gear']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

/**
 * PUT /admin/characters/:id/dom: define o nível de cada pilar (nulo = sem), para testar sem farmar feitos (D152).
 * A janela não muda e a perda volta a contar do zero.
 */
export function useSetCharacterDom(username: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ characterId, pillars }: { characterId: string; pillars: Record<DomPillar, DomLevel | null> }) =>
      (await api.put<{ character: Character }>(`/admin/characters/${characterId}/dom`, { pillars })).data.character,
    onSuccess: (character) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'accounts', username, 'characters'] })
      // se for a própria conta do admin, a ficha e o elenco mudam junto
      queryClient.invalidateQueries({ queryKey: ['me', 'characters'] })
      queryClient.invalidateQueries({ queryKey: ['characters', character.id] })
    },
  })
}

/** Nome dos campos no caminho do erro do Zod ("members.0.skillKeys" → "Membro 1 › Build"). */
const fieldNames: Record<string, string> = {
  key: 'Key',
  name: 'Nome',
  description: 'Descrição',
  lineage: 'Linhagem',
  awakensFromKey: 'Desperta de',
  category: 'Categoria',
  source: 'Origem',
  variantKey: 'Variante',
  effects: 'Efeito',
  characterClass: 'Classe',
  rarity: 'Raridade',
  initialDanger: 'Periculosidade',
  exclusivity: 'Exclusividade',
  isStarter: 'Inicial',
  variants: 'Variante',
  familyTraitKey: 'Traço de família',
  stats: 'Atributos',
  passive: 'Passiva',
  trigger: 'Gatilho',
  tier: 'Tipo',
  target: 'Alvo',
  range: 'Alcance',
  area: 'Área',
  cooldown: 'Recarga',
  desgastePercent: 'Desgaste',
  baseHitChance: 'Chance de acerto',
  minLevel: 'Nível mínimo',
  kitClass: 'Classe do kit',
  kitSlot: 'Papel no kit',
  requiredTraitKeys: 'Traços pedidos',
  primaryStat: 'Atributo principal',
  secondaryStat: 'Atributo secundário',
  primaryPercent: 'Bônus principal',
  secondaryPercent: 'Bônus secundário',
  profile: 'Perfil',
  difficulty: 'Dificuldade',
  members: 'Membro',
  templateKey: 'Modelo',
  level: 'Nível',
  awakenedVariantKey: 'Variante despertada',
  skillKeys: 'Build',
  traitKeys: 'Traços',
  requirements: 'Perfil',
  missions: 'Missão',
  kind: 'Tipo',
  threshold: 'Limiar',
  grade: 'Grau',
  titles: 'Títulos',
  gearKey: 'Equipamento',
  beastKey: 'Besta',
  contract: 'Contrato',
  skills: 'Skill',
}

const fieldPath = (path: (string | number)[]) =>
  path
    .map((part, i) => (typeof part === 'number' ? (i > 0 ? null : `#${part + 1}`) : (fieldNames[part] ?? part) + (typeof path[i + 1] === 'number' ? ` ${(path[i + 1] as number) + 1}` : '')))
    .filter(Boolean)
    .join(' › ')

/** Mensagem do erro com os detalhes do Zod (400 "Validation failed" traz `errors.details`, cada um com o caminho). */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const details = ((error.response?.data as ApiErrorBody | undefined)?.errors as
      | { details?: { path: (string | number)[]; message: string }[] }
      | undefined)?.details
    if (details?.length) return details.map((d) => (d.path.length ? `${fieldPath(d.path)}: ${d.message}` : d.message)).join('\n')
  }
  return apiErrorMessage(error)
}

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Dados da conta logada usados no hub (../origin-game/docs/api.md).

export type CharacterClass =
  | 'VANGUARD'
  | 'MARKSMAN'
  | 'EXECUTOR'
  | 'CONTROLLER'
  | 'SUPPORT'
  | 'ARTILLERY'
  | 'GUARDIAN'
  | 'TACTICIAN'

export type AiDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'MASTER' | 'GRANDMASTER'

export type Stat = 'HP' | 'ATTACK' | 'DEFENSE' | 'SPEED' | 'PRECISION' | 'EVASION' | 'WILL'

export type StatBlock = Record<Stat, number>

export type DangerLevel = 'DISCRETE' | 'CONTINUOUS' | 'DIFFERENTIABLE' | 'NON_LINEAR' | 'CHAOTIC'

export type Character = {
  id: string
  templateKey: string
  name: string
  characterClass: CharacterClass
  level: number
  xp: number
  xpToNextLevel: number | null
  danger: DangerLevel
  awakenedVariantKey: string | null
  /** Fora de batalha: nível + pontos livres + traços. */
  stats: StatBlock
  freePoints: { allocated: StatBlock; available: number; maxPerStat: StatBlock }
  traitKeys: string[]
  /** `buildSlot` 1 a 4 = na build. */
  skills: { key: string; name: string; source: 'KIT' | 'OFFER'; isEnhanced: boolean; buildSlot: number | null }[]
}

export type Squad = {
  id: string
  name: string
  members: { characterId: string; row: number; column: number }[]
}

export type AiProfile = 'AGGRESSIVE' | 'CAUTIOUS' | 'FINISHER' | 'BALANCED'

export type BattleSummary = {
  id: string
  mode: 'PVE'
  status: 'IN_PROGRESS' | 'FINISHED'
  squadId: string
  npcSquadId: string | null
  opponent: { name: string; profile: AiProfile; difficulty: AiDifficulty }
  winner: 'PLAYER' | 'OPPONENT' | null
  endReason: 'ELIMINATION' | 'ROUND_LIMIT' | 'ABANDON' | null
  /** Nulo enquanto a batalha não termina. */
  rounds: number | null
  startedAt: string
  finishedAt: string | null
}

export type SkillOffer = { id: string; characterId: string; level: number; skills: SkillInfo[] }

export type Lineage = 'FUNDAMENTAL' | 'ELEMENTAL' | 'MATERIAL' | 'VECTORIAL' | 'PSYCHIC' | 'BIOLOGICAL' | 'NONE'
export type SkillTier = 'BASIC' | 'STANDARD' | 'REINFORCED' | 'STRONG' | 'FINAL'
export type SkillRange = 'MELEE' | 'RANGED' | 'PIERCING' | 'FLANK'
export type SkillArea = 'SINGLE' | 'LINE' | 'COLUMN' | 'GRID'
export type SkillTarget = 'ENEMY' | 'ALLY' | 'SELF'
export type SkillKitSlot = 'BASIC' | 'STANDARD' | 'ROLE' | 'SIGNATURE'
export type StatusType = 'STUN' | 'LOCK' | 'ROOT' | 'EXPOSE' | 'MARK' | 'DOT' | 'TAUNT'

/** Efeito de skill (`src/domain/skills/value-objects/skill-effect.ts` no backend). */
export type SkillEffect = { appliesTo?: 'TARGET' | 'SELF' } & (
  | { type: 'DAMAGE' | 'HEAL' | 'SHIELD'; power: number }
  | { type: 'STAT_MODIFIER'; stat: Stat; percent: number; duration: number }
  | { type: 'APPLY_STATUS'; status: StatusType; duration: number; baseChance: number }
  | { type: 'REPOSITION'; kind: 'PUSH' | 'PULL' | 'SWAP' | 'MOVE_ALLY' | 'DASH' }
  | { type: 'TURN_SHIFT'; percent: number }
  | { type: 'CHANGE_FIELD'; duration: number; multiplier: number }
  | { type: 'RECOVER' | 'PROTECT' }
  | { type: 'GRANT_TURN'; attackPercent?: number }
  | { type: 'EXPLOIT'; status: StatusType; multiplier: number; consume: boolean }
)

/** Skill do catálogo (mesmo formato em `GET /templates` e nos blocos). */
export type SkillInfo = {
  key: string
  name: string
  description: string | null
  lineage: Lineage
  isAwakened: boolean
  tier: SkillTier
  target: SkillTarget
  range: SkillRange | null
  area: SkillArea
  cooldown: number
  desgastePercent: number
  /** Nulo = sem teste de acerto. */
  baseHitChance: number | null
  minLevel: number
  kitSlot: SkillKitSlot | null
  effects: SkillEffect[]
}

export type Passive = { name: string; description: string }

export type Template = {
  key: string
  name: string
  description: string
  characterClass: CharacterClass
  rarity: string
  initialDanger: DangerLevel
  variants: { key: string; name: string; lineage: Lineage; isPrimary: boolean }[]
  familyTrait: { key: string; name: string } | null
  /** Perfil no nível 100. */
  stats: StatBlock
  passive: Passive | null
  /** Kit primeiro (Básica, Padrão, Função, Assinatura), depois o pool. */
  skills: SkillInfo[]
}

export type Trait = {
  key: string
  name: string
  description: string
  category: 'COMBAT' | 'POSTURE' | 'ORIGIN'
  source: 'TEMPLATE' | 'CONQUERED'
  variantKey: string | null
}

export const classLabels: Record<CharacterClass, string> = {
  VANGUARD: 'Vanguarda',
  MARKSMAN: 'Atirador',
  EXECUTOR: 'Executor',
  CONTROLLER: 'Controlador',
  SUPPORT: 'Suporte',
  ARTILLERY: 'Artilharia',
  GUARDIAN: 'Guardião',
  TACTICIAN: 'Tático',
}

export const difficultyLabels: Record<AiDifficulty, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
  MASTER: 'Mestre',
  GRANDMASTER: 'Grão-mestre',
}

export function useCharacters() {
  return useQuery({
    queryKey: ['me', 'characters'],
    queryFn: async () => (await api.get<{ characters: Character[] }>('/me/characters')).data.characters,
  })
}

export const characterQueryKey = (id: string) => ['characters', id] as const

export function useCharacter(id: string) {
  return useQuery({
    queryKey: characterQueryKey(id),
    queryFn: async () => (await api.get<{ character: Character }>(`/characters/${id}`)).data.character,
  })
}

/** Personagem salvo: atualiza a ficha e a lista sem nova ida ao servidor. `refetch`: outras listas que a ação muda. */
function useSaveCharacter<T>(id: string, request: (input: T) => Promise<Character>, refetch?: QueryKey) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (character) => {
      queryClient.setQueryData(characterQueryKey(id), character)
      queryClient.setQueryData<Character[]>(['me', 'characters'], (list) =>
        list?.map((c) => (c.id === id ? character : c)),
      )
    },
    // também no erro: um 400 de "bloco já escolhido" (outra aba) deixa a fila velha
    onSettled: () => refetch && queryClient.invalidateQueries({ queryKey: refetch }),
  })
}

/** PUT /characters/:id/build: as 4 skills, na ordem dos slots. */
export function useEquipSkills(id: string) {
  return useSaveCharacter(id, async (skillKeys: string[]) =>
    (await api.put<{ character: Character }>(`/characters/${id}/build`, { skillKeys })).data.character,
  )
}

/** POST /skill-offers/:id/choose: aprende 1 skill do bloco (fica fora da build) e tira o bloco da fila. */
export function useChooseSkillOffer(characterId: string) {
  return useSaveCharacter(
    characterId,
    async ({ offerId, skillKey }: { offerId: string; skillKey: string }) =>
      (await api.post<{ character: Character }>(`/skill-offers/${offerId}/choose`, { skillKey })).data.character,
    ['me', 'skill-offers'],
  )
}

/** PUT /characters/:id/free-points: troca a distribuição inteira (D48). */
export function useAllocateFreePoints(id: string) {
  return useSaveCharacter(id, async (freePoints: StatBlock) =>
    (await api.put<{ character: Character }>(`/characters/${id}/free-points`, freePoints)).data.character,
  )
}

/** Catálogo público: muda só com o seed/admin. */
export function useTemplates() {
  return useQuery({
    queryKey: ['catalog', 'templates'],
    queryFn: async () => (await api.get<{ templates: Template[] }>('/templates')).data.templates,
    staleTime: Infinity,
  })
}

export function useTraits() {
  return useQuery({
    queryKey: ['catalog', 'traits'],
    queryFn: async () => (await api.get<{ traits: Trait[] }>('/traits')).data.traits,
    staleTime: Infinity,
  })
}

export function useSquads() {
  return useQuery({
    queryKey: ['me', 'squads'],
    queryFn: async () => (await api.get<{ squads: Squad[] }>('/me/squads')).data.squads,
  })
}

export type SquadMember = Squad['members'][number]

function useSquadMutation<T, R>(request: (input: T) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'squads'] }),
  })
}

/** POST /me/squads: 4 personagens da conta, sem repetir, em células distintas. */
export function useCreateSquad() {
  return useSquadMutation(async (input: { name: string; members: SquadMember[] }) =>
    (await api.post<{ squad: Squad }>('/me/squads', input)).data.squad,
  )
}

/** PUT /squads/:id/formation: troca a formação inteira (o nome não muda). */
export function useUpdateFormation(id: string) {
  return useSquadMutation(async (members: SquadMember[]) =>
    (await api.put<{ squad: Squad }>(`/squads/${id}/formation`, { members })).data.squad,
  )
}

export function useDeleteSquad() {
  return useSquadMutation(async (id: string) => {
    await api.delete(`/squads/${id}`)
  })
}

export type BattleReward = { characterId: string; xp: number; levelsGained: number; level: number; newSkillOffers: number }

/** Só o que o histórico usa de `GET /battles/:id` (o resto é da tela de batalha). */
export type BattleDetail = {
  id: string
  status: BattleSummary['status']
  units: {
    ref: string
    side: 'PLAYER' | 'OPPONENT'
    characterId: string | null
    name: string
    characterClass: CharacterClass
    level: number
    hp: number
    maxHp: number
    alive: boolean
  }[]
  result: {
    winner: BattleSummary['winner']
    endReason: BattleSummary['endReason']
    rounds: number
    finishedAt: string
    /** Vazio na desistência. */
    rewards: BattleReward[]
  } | null
}

export function useBattle(id: string, enabled = true) {
  return useQuery({
    queryKey: ['battles', id],
    queryFn: async () => (await api.get<{ battle: BattleDetail }>(`/battles/${id}`)).data.battle,
    enabled,
    // batalha encerrada não muda mais
    staleTime: (query) => (query.state.data?.status === 'FINISHED' ? Infinity : 0),
  })
}

export function useBattles() {
  return useQuery({
    queryKey: ['me', 'battles'],
    queryFn: async () => (await api.get<{ battles: BattleSummary[] }>('/me/battles')).data.battles,
  })
}

export function useSkillOffers() {
  return useQuery({
    queryKey: ['me', 'skill-offers'],
    queryFn: async () => (await api.get<{ offers: SkillOffer[] }>('/me/skill-offers')).data.offers,
  })
}

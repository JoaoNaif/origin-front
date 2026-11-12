import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import type { BattleLoot } from '@/features/economy/economy-api'
import type { CharacterBeast } from '@/features/beasts/beast-api'
import type { CharacterGear } from '@/features/gear/gear-api'
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
  /** Única pista do despertar (D151): nunca qual é nem as missões. */
  awakeningHint: AwakeningHint
  /** DOM (D152): visível, é treino e não segredo. */
  dom: CharacterDom
  /** Fora de batalha: nível + pontos livres + traços + DOM, sem o equipamento. */
  stats: StatBlock
  /**
   * Equipamento vivo no slot (D153), com o elo e os stats já com o bônus; nulo sem equipamento. Só vem em
   * `GET /me/characters` e `GET /characters/:id` (ausente no personagem novo do baú e no admin).
   */
  gear?: CharacterGear | null
  /** Bestas com contrato (D154), cada uma com o slot da build que a invocação toma; só nas mesmas rotas do `gear`. */
  beasts?: CharacterBeast[]
  freePoints: { allocated: StatBlock; available: number; maxPerStat: StatBlock }
  traitKeys: string[]
  /** `buildSlot` 1 a 4 = na build. */
  skills: { key: string; name: string; source: 'KIT' | 'OFFER'; isEnhanced: boolean; buildSlot: number | null }[]
}

/** SILENT = nada; SIGNS = 1 missão oculta cumprida; IMMINENT = 2; AWAKENED = despertou. */
export type AwakeningHint = 'SILENT' | 'SIGNS' | 'IMMINENT' | 'AWAKENED'

export type DomPillar = 'MIND' | 'HEART' | 'BODY' | 'AURA'
export type DomLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
export type DomRole = 'DAMAGE' | 'TANK' | 'SUPPORT' | 'CONTROL'

/** Um pilar do DOM na ficha: nível (nulo = sem), pontos na janela (e por papel), o próximo limiar e o piso da perda. */
export type DomPillarState = {
  pillar: DomPillar
  level: DomLevel | null
  points: number
  roles: Record<DomRole, number>
  nextLevel: DomLevel | null
  /** Nulo no avançado. */
  nextThreshold: number | null
  /** Abaixo disso, cai um nível na próxima conferência; nulo sem o pilar. */
  lossBelow: number | null
  /** Só no avançado (Vidente, Resiliente, Indestrutível, Rei). */
  title: string | null
}

/** Os 4 pilares na ordem MIND, HEART, BODY, AURA; `windowWeight` = peso já jogado na janela (até `window`). */
export type CharacterDom = { windowWeight: number; pillars: DomPillarState[] }

/** Pilar que subiu ou caiu na batalha (nulo = sem o pilar). */
export type DomChange = { pillar: DomPillar; from: DomLevel | null; to: DomLevel | null }

/** `GET /dom-rules`: as constantes do servidor, com o texto dos feitos já com os números. */
export type DomRules = {
  pillars: {
    pillar: DomPillar
    primaryStat: Stat
    secondaryStat: Stat
    title: string
    uniqueSkill: { name: string; description: string }
    feats: { role: DomRole; description: string }[]
  }[]
  levels: { level: DomLevel; threshold: number; thresholdWithoutVariant: number; primaryPercent: number; secondaryPercent: number }[]
  window: number
  checkEvery: number
  lossShare: number
  advancedRoles: number
  advancedRolePoints: number
  pveWeights: Record<AiDifficulty, number>
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

/** `source`: subida de nível ou recuperação ao despertar (D151). */
export type SkillOffer = { id: string; characterId: string; level: number; source: 'LEVEL_UP' | 'AWAKENING'; skills: SkillInfo[] }

/** Escala de raridade (E comum a SS raríssimo): também o nível do baú. */
export type Rarity = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS'

export type Lineage = 'FUNDAMENTAL' | 'ELEMENTAL' | 'MATERIAL' | 'VECTORIAL' | 'PSYCHIC' | 'BIOLOGICAL' | 'NONE'
export type SkillTier = 'BASIC' | 'STANDARD' | 'REINFORCED' | 'STRONG' | 'FINAL'
export type SkillRange = 'MELEE' | 'RANGED' | 'PIERCING' | 'FLANK'
export type SkillArea = 'SINGLE' | 'LINE' | 'COLUMN' | 'GRID'
export type SkillTarget = 'ENEMY' | 'ALLY' | 'SELF'
export type SkillKitSlot = 'BASIC' | 'STANDARD' | 'ROLE' | 'SIGNATURE'
export type StatusType = 'STUN' | 'LOCK' | 'ROOT' | 'EXPOSE' | 'MARK' | 'DOT' | 'TAUNT' | 'SILENCE' | 'SLEEP' | 'LINK' | 'STEALTH' | 'CONTAGION'

/** Efeito de skill (`src/domain/skills/value-objects/skill-effect.ts` no backend). */
export type SkillEffect = { appliesTo?: 'TARGET' | 'SELF' } & (
  | { type: 'DAMAGE' | 'HEAL' | 'SHIELD'; power: number }
  | { type: 'STAT_MODIFIER'; stat: Stat; percent: number; duration: number }
  | { type: 'APPLY_STATUS'; status: StatusType; duration: number; baseChance: number }
  | { type: 'REPOSITION'; kind: 'PUSH' | 'PULL' | 'SWAP' | 'MOVE_ALLY' | 'DASH' }
  | { type: 'TURN_SHIFT'; percent: number }
  | { type: 'CHANGE_FIELD'; duration: number; multiplier: number }
  // só nas skills únicas do DOM (D152), na batalha: fora do catálogo
  | { type: 'WEAKEN'; percent: number; duration: number; baseChance: number }
  | { type: 'FORESIGHT'; duration: number; chanceByMind: Record<DomLevel | 'NONE', number> }
  | { type: 'INVULNERABLE' }
  // só nas invocações de besta (D154), na batalha: a skill nasce do contrato
  | { type: 'SUMMON'; beastRef: string }
  | { type: 'EQUALITY'; bufferPercent: number; bonusPercent: number; duration: number; absorbShare: number; breakPercent: number }
  | { type: 'RECOVER' | 'PROTECT' | 'CLEANSE' }
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
  rarity: Rarity
  /** Inicial: a conta nova recebe; os outros só saem de baú. */
  isStarter: boolean
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

/**
 * Grava o personagem que voltou de uma ação na ficha e na lista. As ações não mandam o equipamento (`gear` ausente):
 * fica o que já estava no cache.
 */
export function storeCharacter(queryClient: QueryClient, character: Character) {
  // as ações do personagem não devolvem o equipamento nem as bestas: fica o que já estava no cache
  const merge = (old?: Character) =>
    old ? { ...character, gear: character.gear === undefined ? old.gear : character.gear, beasts: character.beasts ?? old.beasts } : character
  queryClient.setQueryData<Character>(characterQueryKey(character.id), merge)
  queryClient.setQueryData<Character[]>(['me', 'characters'], (list) => list?.map((c) => (c.id === character.id ? merge(c) : c)))
}

/** Personagem salvo: atualiza a ficha e a lista sem nova ida ao servidor. `refetch`: outras listas que a ação muda. */
function useSaveCharacter<T>(request: (input: T) => Promise<Character>, refetch: QueryKey[] = []) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (character) => storeCharacter(queryClient, character),
    // também no erro: um 400 de "bloco já escolhido" (outra aba) deixa a fila velha
    onSettled: () => Promise.all(refetch.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

/** PUT /characters/:id/build: as 4 skills, na ordem dos slots. */
export function useEquipSkills(id: string) {
  return useSaveCharacter(async (skillKeys: string[]) =>
    (await api.put<{ character: Character }>(`/characters/${id}/build`, { skillKeys })).data.character,
  )
}

/** POST /skill-offers/:id/choose: aprende 1 skill do bloco (fica fora da build) e tira o bloco da fila. */
export function useChooseSkillOffer() {
  return useSaveCharacter(
    async ({ offerId, skillKey }: { offerId: string; skillKey: string }) =>
      (await api.post<{ character: Character }>(`/skill-offers/${offerId}/choose`, { skillKey })).data.character,
    [['me', 'skill-offers']],
  )
}

/** PUT /characters/:id/free-points: troca a distribuição inteira (D48). O elo do equipamento sai dos stats: relê. */
export function useAllocateFreePoints(id: string) {
  return useSaveCharacter(
    async (freePoints: StatBlock) => (await api.put<{ character: Character }>(`/characters/${id}/free-points`, freePoints)).data.character,
    [characterQueryKey(id), ['me', 'gear'], ['gear']],
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

/** Valores dos bônus de formação (D128). As condições de cada um estão em `formation-bonus.ts`. */
export type FormationBonusValues = {
  statAuras: { characterClass: CharacterClass; stat: Stat; percent: number }[]
  supportHealPercent: number
  artilleryBackDamagePercent: number
  executorLoneAttackPercent: number
}

export function useFormationBonuses() {
  return useQuery({
    queryKey: ['catalog', 'formation-bonuses'],
    queryFn: async () => (await api.get<{ formationBonuses: FormationBonusValues }>('/formation-bonuses')).data.formationBonuses,
    staleTime: Infinity,
  })
}

/** Regras do DOM (D152) para a ficha e o Guia; não mudam durante a sessão. */
export function useDomRules() {
  return useQuery({
    queryKey: ['catalog', 'dom-rules'],
    queryFn: async () => (await api.get<{ domRules: DomRules }>('/dom-rules')).data.domRules,
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

export type BattleReward = { characterId: string; xp: number; levelsGained: number; level: number; newSkillOffers: number; awakened?: boolean; domChanges?: DomChange[] }

/** Só o que o histórico usa de `GET /battles/:id` (o resto é da tela de batalha). */
export type BattleDetail = {
  id: string
  status: BattleSummary['status']
  units: {
    ref: string
    side: 'PLAYER' | 'OPPONENT'
    characterId: string | null
    /** Também o nome da imagem em public/characters. */
    templateKey: string
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
    /** Moeda, fragmentos e baú; nulo na desistência. */
    loot: BattleLoot | null
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

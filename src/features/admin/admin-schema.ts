import type { AdminCatalog, CatalogCollection, CatalogItem } from '@/features/admin/admin-api'
import type {
  AiDifficulty,
  AiProfile,
  CharacterClass,
  DangerLevel,
  Lineage,
  SkillArea,
  SkillKitSlot,
  SkillRange,
  SkillTarget,
  SkillTier,
  Stat,
  StatBlock,
} from '@/features/game/game-api'
import { rangeLabels, statLabels, statusLabels } from '@/features/game/game-labels'

// O que o formulário do admin precisa saber de cada corpo (../origin-game/src/infra/http/schemas/catalog.ts):
// tipos, nomes em português, explicações e os valores de partida. As regras finas continuam no servidor.

export type Rarity = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS'
export type Exclusivity = 'NONE' | 'EVENT' | 'RANKING'
export type TraitCategory = 'COMBAT' | 'POSTURE' | 'ORIGIN'
export type TraitSource = 'TEMPLATE' | 'CONQUERED'

/** Efeito genérico: `type` + os campos dele (ver `effectSpecs`). */
export type Effect = { type: string } & Record<string, unknown>

export type VariantBody = { name: string; lineage: Lineage; description: string | null; awakensFromKey: string | null }

export type TraitBody = {
  name: string
  description: string | null
  category: TraitCategory
  source: TraitSource
  variantKey: string | null
  effects: Effect[]
}

export type PassiveBody = { name: string; description: string; trigger: Effect; effects: Effect[] }

export type TemplateBody = {
  name: string
  description: string | null
  characterClass: CharacterClass
  rarity: Rarity
  initialDanger: DangerLevel
  exclusivity: Exclusivity
  variants: { variantKey: string; isPrimary: boolean }[]
  familyTraitKey: string | null
  stats: StatBlock
  passive: PassiveBody
}

export type SkillBody = {
  name: string
  description: string | null
  variantKey: string | null
  tier: SkillTier
  target: SkillTarget
  range: SkillRange | null
  area: SkillArea
  cooldown: number
  desgastePercent: number
  baseHitChance: number | null
  minLevel: number
  kitClass: CharacterClass | null
  kitSlot: SkillKitSlot | null
  effects: Effect[]
}

export type FieldBody = {
  name: string
  description: string | null
  requiredTraitKeys: string[]
  primaryStat: Stat
  secondaryStat: Stat
  primaryPercent?: number
  secondaryPercent?: number
}

export type NpcMember = {
  templateKey: string
  level: number
  row: number
  column: number
  awakenedVariantKey: string | null
  skillKeys: string[]
  traitKeys?: string[]
}

export type NpcSquadBody = {
  name: string
  description: string | null
  profile: AiProfile
  difficulty: AiDifficulty
  members: NpcMember[]
}

/** Regras de `GET /admin/options` (`rules`) que a tela usa nas dicas. */
export type AdminRules = {
  classBudget: Record<CharacterClass, number>
  classBudgetTolerance: number
  skillTierReference: Record<SkillTier, { power: number; cooldown: number; desgastePercent: number; minLevel: number }>
  maxSkillPower: number
  awakenedMinLevel: number
  npcLevelRange: Record<AiDifficulty, { min: number; max: number }>
  buildSize: number
  maxTemplateVariants: number
  maxTraits: number
  traitStatCapPercent: number
  fieldTraits: { min: number; max: number }
  fieldPercent: { primary: number; secondary: number }
}

export const rarityLabels: Record<Rarity, string> = { E: 'E', D: 'D', C: 'C', B: 'B', A: 'A', S: 'S', SS: 'SS' }

export const exclusivityLabels: Record<Exclusivity, string> = {
  NONE: 'Nenhuma (baú e mercado)',
  EVENT: 'Evento',
  RANKING: 'Ranqueado',
}

export const traitCategoryLabels: Record<TraitCategory, string> = { COMBAT: 'Combate', POSTURE: 'Postura', ORIGIN: 'Origem' }

export const traitSourceLabels: Record<TraitSource, string> = {
  TEMPLATE: 'Família (vem no modelo)',
  CONQUERED: 'Conquistado (metas e eventos)',
}

// ---------------------------------------------------------------------------
// Efeitos: cada tipo com nome, explicação e campos
// ---------------------------------------------------------------------------

type Choice = { value: string; label: string }

const choices = (labels: Record<string, string>): Choice[] => Object.entries(labels).map(([value, label]) => ({ value, label }))

export type EffectField =
  | { name: string; label: string; kind: 'number'; default: number; step?: number; unit?: string; hint?: string; optional?: boolean; integer?: boolean }
  | { name: string; label: string; kind: 'choice'; choices: Choice[]; default: string; hint?: string }
  | { name: string; label: string; kind: 'boolean'; default: boolean; hint?: string }

export type EffectSpec = { label: string; description: string; fields: EffectField[] }

const stat: EffectField = { name: 'stat', label: 'Atributo', kind: 'choice', choices: choices(statLabels), default: 'ATTACK' }
const status: EffectField = { name: 'status', label: 'Status', kind: 'choice', choices: choices(statusLabels), default: 'STUN' }
const percent = (label: string, value: number, hint?: string): EffectField => ({
  name: 'percent', label, kind: 'number', default: value, unit: '%', hint,
})
const duration = (value: number): EffectField => ({
  name: 'duration', label: 'Duração', kind: 'number', default: value, unit: 'turnos', integer: true,
})
const chance = (name: string, value: number, hint?: string): EffectField => ({
  name, label: 'Chance', kind: 'number', default: value, step: 0.05, hint: hint ?? '0 a 1 (0,8 = 80%)',
})

export const traitEffectSpecs: Record<string, EffectSpec> = {
  STAT_MODIFIER: {
    label: 'Bônus de atributo',
    description: 'Aumenta (ou reduz, com valor negativo) um atributo do personagem.',
    fields: [stat, percent('Quanto', 3, 'Ex.: 3 = +3%')],
  },
  SKILL_DAMAGE_MODIFIER: {
    label: 'Bônus de dano por alcance',
    description: 'Mais dano nas skills de um tipo de alcance.',
    fields: [{ name: 'range', label: 'Alcance', kind: 'choice', choices: choices(rangeLabels), default: 'MELEE' }, percent('Quanto', 10)],
  },
  LINEAGE_COST_MODIFIER: {
    label: 'Custo de Desgaste',
    description: 'Muda o Desgaste das skills (negativo = gasta menos).',
    fields: [percent('Quanto', -10, 'Ex.: -10 = 10% a menos')],
  },
  GEAR_REQUIREMENT_WAIVER: {
    label: 'Dispensa de equipamento',
    description: 'Ignora exigências de equipamento.',
    fields: [{ name: 'count', label: 'Quantas', kind: 'number', default: 1, integer: true }],
  },
  EXTRA_BEAST_SLOT: {
    label: 'Espaço extra de besta',
    description: 'Mais espaços para bestas.',
    fields: [{ name: 'count', label: 'Quantos', kind: 'number', default: 1, integer: true }],
  },
}

const appliesTo: EffectField = {
  name: 'appliesTo',
  label: 'Em quem',
  kind: 'choice',
  choices: [
    { value: 'TARGET', label: 'Nos alvos da skill' },
    { value: 'SELF', label: 'Em quem usou' },
  ],
  default: 'TARGET',
}

const power = (hint: string): EffectField => ({ name: 'power', label: 'Poder', kind: 'number', default: 1, step: 0.05, hint })

export const skillEffectSpecs: Record<string, EffectSpec> = {
  DAMAGE: { label: 'Dano', description: 'Causa dano. Poder 1,0 = golpe padrão.', fields: [power('Referência do tipo no painel ao lado'), appliesTo] },
  HEAL: { label: 'Cura', description: 'Recupera HP.', fields: [power('1,0 = 10% do HP máximo do alvo'), appliesTo] },
  SHIELD: { label: 'Escudo', description: 'Dá escudo que absorve dano.', fields: [power('1,0 = 10% do HP máximo do alvo'), appliesTo] },
  STAT_MODIFIER: {
    label: 'Bônus/penalidade de atributo',
    description: 'Muda um atributo por alguns turnos (negativo = penalidade).',
    fields: [stat, percent('Quanto', 15), duration(2), appliesTo],
  },
  APPLY_STATUS: {
    label: 'Aplicar status',
    description: 'Tenta aplicar um status (a Vontade do alvo resiste).',
    fields: [status, duration(1), chance('baseChance', 0.7), appliesTo],
  },
  REPOSITION: {
    label: 'Mover na grade',
    description: 'Empurra, puxa ou troca posições.',
    fields: [
      {
        name: 'kind',
        label: 'Como',
        kind: 'choice',
        choices: [
          { value: 'PUSH', label: 'Empurrar o alvo para trás' },
          { value: 'PULL', label: 'Puxar o alvo para frente' },
          { value: 'SWAP', label: 'Trocar dois inimigos de lugar' },
          { value: 'MOVE_ALLY', label: 'Mover um aliado' },
          { value: 'DASH', label: 'Avançar quem usou' },
        ],
        default: 'PUSH',
      },
      appliesTo,
    ],
  },
  TURN_SHIFT: {
    label: 'Adiantar/atrasar a vez',
    description: 'Mexe na barra de vez (positivo adianta, negativo atrasa).',
    fields: [percent('Quanto', 25), appliesTo],
  },
  CHANGE_FIELD: {
    label: 'Trocar o campo',
    description: 'Troca o campo de batalha por alguns turnos e multiplica o bônus dele.',
    fields: [duration(2), { name: 'multiplier', label: 'Multiplicador', kind: 'number', default: 1.5, step: 0.1 }, appliesTo],
  },
  RECOVER: { label: 'Recuperar', description: 'Alivia 50% do Desgaste acumulado.', fields: [appliesTo] },
  PROTECT: {
    label: 'Proteger',
    description: 'Até o próximo turno, golpes de alvo único no aliado adjacente caem em quem usou.',
    fields: [appliesTo],
  },
  GRANT_TURN: {
    label: 'Dar a vez (comando)',
    description: 'O aliado age logo depois de quem usou.',
    fields: [{ name: 'attackPercent', label: 'Bônus de Ataque', kind: 'number', default: 15, unit: '%', optional: true, hint: 'Opcional' }, appliesTo],
  },
  EXPLOIT: {
    label: 'Explorar status',
    description: 'Dano multiplicado em alvo com o status escolhido.',
    fields: [
      status,
      { name: 'multiplier', label: 'Multiplicador', kind: 'number', default: 1.5, step: 0.1 },
      { name: 'consume', label: 'Tira o status depois do golpe', kind: 'boolean', default: false },
      appliesTo,
    ],
  },
}

export const passiveTriggerSpecs: Record<string, EffectSpec> = {
  ALWAYS: { label: 'Sempre (permanente)', description: 'Vale a batalha inteira.', fields: [] },
  PERIODIC: {
    label: 'A cada N turnos',
    description: 'Dispara de tempos em tempos.',
    fields: [{ name: 'everyTurns', label: 'A cada', kind: 'number', default: 3, unit: 'turnos', integer: true }],
  },
  TURN_START: { label: 'No começo do turno', description: 'Toda vez que a vez do dono começa.', fields: [] },
  ON_ATTACK: { label: 'Ao atacar', description: 'Quando o dono usa uma skill de ataque.', fields: [] },
  ON_HIT: { label: 'Ao ser atingido', description: 'Quando o dono leva um golpe.', fields: [] },
  ON_KILL: { label: 'Ao derrotar alguém', description: 'Quando o dono derrota um inimigo.', fields: [] },
  ON_HEAL: { label: 'Ao curar', description: 'Quando o dono cura.', fields: [] },
  HP_BELOW: {
    label: 'Com HP baixo',
    description: 'Quando o HP fica abaixo de um limite.',
    fields: [percent('Abaixo de', 40, 'Ex.: 40 = 40% do HP máximo')],
  },
  ON_DESGASTE: { label: 'Ao gastar Desgaste', description: 'Quando o dono paga Desgaste.', fields: [] },
  ON_FIELD_CHANGE: { label: 'Ao trocar o campo', description: 'Quando o campo de batalha muda.', fields: [] },
  ON_STATUS: { label: 'Ao receber status', description: 'Quando o dono recebe um status.', fields: [status] },
  ON_ALLY_DEFEATED: { label: 'Aliado derrotado', description: 'Quando um aliado cai.', fields: [] },
  ON_DEFEATED: { label: 'Ao ser derrotado', description: 'Dispara uma última vez quando o dono cai.', fields: [] },
}

export const passiveEffectSpecs: Record<string, EffectSpec> = {
  IGNORE_SHIELD: { label: 'Ignorar escudo', description: 'Os golpes do dono atravessam escudo.', fields: [] },
  REDUCE_COOLDOWN: {
    label: 'Reduzir recarga',
    description: 'Diminui a recarga das skills.',
    fields: [
      { name: 'amount', label: 'Turnos a menos', kind: 'number', default: 1, integer: true },
      {
        name: 'scope',
        label: 'Quais skills',
        kind: 'choice',
        choices: [
          { value: 'RECHARGING', label: 'Só as recarregando' },
          { value: 'ALL', label: 'Todas' },
        ],
        default: 'RECHARGING',
      },
    ],
  },
  APPLY_STATUS: {
    label: 'Aplicar status',
    description: 'Tenta aplicar um status.',
    fields: [
      status,
      {
        name: 'target',
        label: 'Em quem',
        kind: 'choice',
        choices: [
          { value: 'TARGET', label: 'No alvo' },
          { value: 'ATTACKER', label: 'Em quem atacou' },
          { value: 'SELF', label: 'No dono' },
        ],
        default: 'TARGET',
      },
      chance('chance', 0.2, '0 a 1 (0,2 = 20%)'),
    ],
  },
  HEAL: {
    label: 'Curar',
    description: 'Recupera parte do HP máximo.',
    fields: [{ name: 'percentOfMaxHp', label: 'Quanto', kind: 'number', default: 10, unit: '% do HP máx.' }],
  },
  ADVANCE_TURN: { label: 'Adiantar a vez', description: 'Adianta a vez do dono.', fields: [percent('Quanto', 20)] },
  ADVANCE_ALLIES: { label: 'Adiantar aliados', description: 'Adianta a vez de todos os aliados vivos.', fields: [percent('Quanto', 10)] },
  REDUCE_DAMAGE: { label: 'Reduzir dano', description: 'Reduz o dano recebido.', fields: [percent('Quanto', 15)] },
  STAT_MODIFIER: { label: 'Bônus de atributo', description: 'Aumenta um atributo.', fields: [stat, percent('Quanto', 10)] },
}

/** Efeito novo do tipo, com os valores de partida (o `appliesTo` padrão fica de fora: é o mesmo que omitir). */
export function newEffect(type: string, spec: EffectSpec): Effect {
  const effect: Effect = { type }
  for (const field of spec.fields) {
    if (field.name === 'appliesTo' || (field.kind === 'number' && field.optional)) continue
    effect[field.name] = field.default
  }
  return effect
}

// ---------------------------------------------------------------------------
// Ponto de partida de um item novo (valores comuns do seed; o admin ajusta)
// ---------------------------------------------------------------------------

export const emptyBodies: Record<CatalogCollection, () => Record<string, unknown>> = {
  variants: (): VariantBody => ({ name: '', lineage: 'ELEMENTAL', description: null, awakensFromKey: null }),
  traits: (): TraitBody => ({
    name: '',
    description: null,
    category: 'COMBAT',
    source: 'CONQUERED',
    variantKey: null,
    effects: [{ type: 'STAT_MODIFIER', stat: 'ATTACK', percent: 3 }],
  }),
  templates: (): TemplateBody => ({
    name: '',
    description: null,
    characterClass: 'VANGUARD',
    rarity: 'C',
    initialDanger: 'DISCRETE',
    exclusivity: 'NONE',
    variants: [],
    familyTraitKey: null,
    // perfil do Vanguarda no seed (orçamento 670)
    stats: { HP: 700, ATTACK: 100, DEFENSE: 120, SPEED: 75, PRECISION: 85, EVASION: 55, WILL: 95 },
    passive: { name: '', description: '', trigger: { type: 'ON_HIT' }, effects: [{ type: 'REDUCE_DAMAGE', percent: 15 }] },
  }),
  skills: (): SkillBody => ({
    name: '',
    description: null,
    variantKey: null,
    tier: 'STANDARD',
    target: 'ENEMY',
    range: 'MELEE',
    area: 'SINGLE',
    cooldown: 1,
    desgastePercent: 1.5,
    baseHitChance: 0.8,
    minLevel: 0,
    kitClass: null,
    kitSlot: null,
    effects: [{ type: 'DAMAGE', power: 1 }],
  }),
  fields: (): FieldBody => ({
    name: '',
    description: null,
    requiredTraitKeys: [],
    primaryStat: 'ATTACK',
    secondaryStat: 'SPEED',
  }),
  'npc-squads': (): NpcSquadBody => ({
    name: '',
    description: null,
    profile: 'BALANCED',
    difficulty: 'BEGINNER',
    members: [
      { templateKey: '', level: 15, row: 0, column: 0, awakenedVariantKey: null, skillKeys: [], traitKeys: [] },
      { templateKey: '', level: 15, row: 1, column: 0, awakenedVariantKey: null, skillKeys: [], traitKeys: [] },
      { templateKey: '', level: 15, row: 0, column: 1, awakenedVariantKey: null, skillKeys: [], traitKeys: [] },
      { templateKey: '', level: 15, row: 2, column: 1, awakenedVariantKey: null, skillKeys: [], traitKeys: [] },
    ],
  }),
}

/** `key` a partir do nome: sem acento, minúsculas, espaços viram `-` ("Olho de Águia" → "olho-de-aguia"). */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export const KEY_PATTERN = /^[a-z0-9]+(?:[-:][a-z0-9]+)*$/

/** Nome, exemplo e explicação de cada coleção (cabeçalho do formulário). */
export const collectionInfo: Record<CatalogCollection, { label: string; singular: string; example: string; help: string }> = {
  variants: {
    label: 'Variantes',
    singular: 'variante',
    example: 'Ex.: Relâmpago, linhagem Elemental',
    help: 'O poder de um personagem (Explosão, Gelo, Tempo...). Cada variante pertence a uma linhagem; uma variante despertada nasce de outra.',
  },
  traits: {
    label: 'Traços',
    singular: 'traço',
    example: 'Ex.: Veterano, +3% de Vontade',
    help: 'Bônus fixos de um personagem. Os de família vêm no modelo; os conquistados vêm de metas e eventos. Os campos de batalha olham para eles.',
  },
  templates: {
    label: 'Modelos',
    singular: 'modelo',
    example: 'Ex.: Kael Vaz, Vanguarda',
    help: 'O personagem em si: classe, raridade, variantes, atributos no nível 100 e a passiva. Crie antes as 4 skills do kit, com a key começando pela key do modelo.',
  },
  skills: {
    label: 'Skills',
    singular: 'skill',
    example: 'Ex.: kael-vaz:detonacao, Padrão, corpo a corpo',
    help: 'Golpes e habilidades. A key começa com o modelo dono ("kael-vaz:..."). As 4 do kit têm classe e papel no kit; as outras caem nos blocos de skill.',
  },
  fields: {
    label: 'Campos',
    singular: 'campo',
    example: 'Ex.: Arena, +6% Ataque e +4% Velocidade',
    help: 'O terreno da batalha. Quem tem algum dos traços pedidos ganha os dois bônus de atributo.',
  },
  'npc-squads': {
    label: 'Squads de NPC',
    singular: 'squad de NPC',
    example: 'Ex.: Patrulha da Fronteira, Iniciante',
    help: 'Os adversários da máquina: 4 personagens com nível, posição na grade e as 4 skills da build.',
  },
}

// ---------------------------------------------------------------------------
// Opções dos campos de escolha
// ---------------------------------------------------------------------------

export type Option = { value: string; label: string; hint?: string }

export function toOptions(labels: Record<string, string>): Option[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }))
}

/** O que todo formulário recebe: o corpo, o catálogo (para as listas de ligação) e as regras. */
export type FormProps<T> = {
  value: T
  onChange: (value: T) => void
  catalog: AdminCatalog
  rules: AdminRules | undefined
  /** `key` do item (vazia num novo). */
  itemKey: string
}

/** Itens do catálogo como opções: nome e key. */
export function keyOptions(items: CatalogItem[], hint?: (item: CatalogItem) => string | undefined): Option[] {
  return items.map((item) => ({ value: item.key, label: `${item.name} · ${item.key}`, hint: hint?.(item) }))
}

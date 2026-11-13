import { Castle, Crosshair, FlaskConical, Skull, Sparkles, type LucideIcon } from 'lucide-react'
import type { EventKind, EventModifier, EventPhase, EventRequirement, EventReward, EventRewardSource, EventSquadMode } from '@/features/events/event-api'
import { classLabels } from '@/features/game/game-api'
import { dangerLabels, lineageLabels } from '@/features/game/game-labels'
import { eventTerms } from '@/features/game/glossary'

// Nomes, ícones, cores e textos dos eventos (D155, D156). Peças visuais em event-ui.tsx. Só texto: quem decide é o
// servidor, e os números de cada evento vêm de `GET /events`.

export const eventKindOrder: EventKind[] = ['TOWER', 'CHARACTER_LAUNCH', 'HUNT', 'RESEARCH', 'UNIQUE_BOSS']

export const eventKindLabels: Record<EventKind, string> = {
  TOWER: 'Torre',
  CHARACTER_LAUNCH: 'Lançamento',
  HUNT: 'Caça',
  RESEARCH: 'Pesquisa',
  UNIQUE_BOSS: 'Chefe único',
}

export const eventKindIcons: Record<EventKind, LucideIcon> = {
  TOWER: Castle,
  CHARACTER_LAUNCH: Sparkles,
  HUNT: Crosshair,
  RESEARCH: FlaskConical,
  UNIQUE_BOSS: Skull,
}

export const eventKindColors: Record<EventKind, string> = {
  TOWER: 'var(--color-event-tower)',
  CHARACTER_LAUNCH: 'var(--color-event-launch)',
  HUNT: 'var(--color-event-hunt)',
  RESEARCH: 'var(--color-event-research)',
  UNIQUE_BOSS: 'var(--color-event-boss)',
}

/** O tipo em uma frase (cartão, detalhe e o assistente do admin). */
export const eventKindText: Record<EventKind, string> = {
  TOWER: 'Pisos em sequência. Perder não faz voltar: tenta o mesmo piso de novo. Cada piso é uma batalha do zero, com prêmio próprio, e o principal fica no topo.',
  CHARACTER_LAUNCH: 'Traz um personagem novo, em geral exclusivo: quem conclui o evento leva. Repetido vira moeda.',
  HUNT: 'Um alvo raro por tempo limitado. Vencer dá a chance de capturar a besta; a chance sobe a cada falha.',
  RESEARCH: 'Batalhas com regras diferentes: stats nivelados, sem cura, Exaustão mais cedo, Velocidade igual ou campo fixo.',
  UNIQUE_BOSS: 'Um chefe forte e uma tentativa só por conta: perdeu, acabou. Fonte dos itens mais raros.',
}

export const phaseLabels: Record<EventPhase, string> = { ANNOUNCED: 'Em breve', OPEN: 'Aberto', ENDED: 'Encerrado' }

export const squadModeLabels: Record<EventSquadMode, string> = { FIXED: 'Squad fixo', FREE: 'Squad livre' }

export const squadModeText: Record<EventSquadMode, string> = {
  FIXED: 'Os 4 personagens da primeira batalha ficam travados até o fim do evento (a posição pode mudar).',
  FREE: 'Pode trocar o esquadrão a cada batalha.',
}

export const rewardSourceLabels: Record<EventRewardSource, string> = {
  PARTICIPATION: 'Participação',
  STAGE: 'Etapa',
  CAPTURE: 'Captura',
  COMPLETION: 'Conclusão',
}

/** O requisito em texto ("Todos no nível 40 ou acima"). `traitName` resolve a família pela `key`. */
export function requirementText(r: EventRequirement, traitName: (key: string) => string = (k) => k): string {
  switch (r.type) {
    case 'MIN_LEVEL':
      return `Todos no nível ${r.level} ou acima`
    case 'CLASS_COUNT':
      return `Pelo menos ${r.min} da classe ${classLabels[r.characterClass]}`
    case 'LINEAGE':
      return `Pelo menos ${r.min} da linhagem ${lineageLabels[r.lineage]}`
    case 'FAMILY':
      return `Pelo menos ${r.min} da família ${traitName(r.traitKey)}`
    case 'MIN_DANGER':
      return `Todos com periculosidade ${dangerLabels[r.level]} ou acima`
    case 'MAX_RARITY':
      return `Todos com raridade ${r.rarity} ou abaixo`
  }
}

/** O requisito que o esquadrão não cumpre, curto, para a etiqueta de aviso ("abaixo do nível 40"). */
export function requirementMissText(r: EventRequirement, traitName: (key: string) => string = (k) => k): string {
  switch (r.type) {
    case 'MIN_LEVEL':
      return `alguém abaixo do nível ${r.level}`
    case 'CLASS_COUNT':
      return `menos de ${r.min} ${classLabels[r.characterClass]}`
    case 'LINEAGE':
      return `menos de ${r.min} ${lineageLabels[r.lineage]}`
    case 'FAMILY':
      return `menos de ${r.min} da família ${traitName(r.traitKey)}`
    case 'MIN_DANGER':
      return `periculosidade abaixo de ${dangerLabels[r.level]}`
    case 'MAX_RARITY':
      return `raridade acima de ${r.rarity}`
  }
}

export const requirementTypeLabels: Record<EventRequirement['type'], string> = {
  MIN_LEVEL: 'Nível mínimo',
  CLASS_COUNT: 'Classe',
  LINEAGE: 'Linhagem',
  FAMILY: 'Família',
  MIN_DANGER: 'Periculosidade mínima',
  MAX_RARITY: 'Raridade máxima',
}

export const rewardTypeLabels: Record<EventReward['type'], string> = {
  COINS: 'Moeda',
  FRAGMENTS: 'Fragmentos',
  CHEST: 'Baú',
  CHARACTER: 'Personagem',
  GEAR: 'Equipamento',
  BEAST: 'Besta',
}

export const modifierLabels: Record<EventModifier['type'], string> = {
  LEVELED_STATS: 'Stats nivelados',
  EARLY_EXHAUSTION: 'Exaustão mais cedo',
  NO_HEALING: 'Sem cura',
  EQUAL_SPEED: 'Velocidade igual',
}

/** O modificador em texto, com o número dele. */
export function modifierText(m: EventModifier): string {
  switch (m.type) {
    case 'LEVELED_STATS':
      return `Todas as unidades, dos dois lados, jogam no nível ${m.level}. DOM, equipamento e bestas mantêm o bônus.`
    case 'EARLY_EXHAUSTION':
      return m.afterRound === 0 ? 'A Exaustão vale desde a primeira rodada.' : `A Exaustão começa depois da rodada ${m.afterRound}.`
    case 'NO_HEALING':
      return 'Nenhuma cura: skill, passiva e regeneração não curam. Escudo continua valendo.'
    case 'EQUAL_SPEED':
      return 'Todos jogam com a mesma Velocidade (a média do início). Buffs e debuffs de Velocidade não valem.'
  }
}

/** O limite de tentativas em poucas palavras. */
export function attemptLimitText(limit: { count: number; per: 'DAY' | 'EVENT' } | null): string {
  if (!limit) return 'À vontade'
  return limit.per === 'DAY' ? `${limit.count} por dia` : limit.count === 1 ? 'Uma só' : `${limit.count} no evento`
}

/** A explicação do termo no glossário (balões e Guia). */
export const eventTermText = (term: string) => eventTerms.find((t) => t.term === term)?.text ?? ''

/** "3d 4h", "5h 12min", "12min", "agora". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return 'agora'
  const minutes = Math.ceil(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return mins ? `${hours}h ${mins}min` : `${hours}h`
  return `${mins}min`
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
export const formatDay = (iso: string) => dayFormat.format(new Date(iso))

import type { Lineage, Rarity } from '@/features/game/game-api'

// Nomes, ordem e cores da economia (moeda, fragmentos, raridade). Componentes em economy-ui.tsx.

const numberFormat = new Intl.NumberFormat('pt-BR')

export const formatCoins = (value: number) => numberFormat.format(value)

/** Ordem dos 7 tipos de fragmento (a do enum do servidor). */
export const fragmentTypes: Lineage[] = ['FUNDAMENTAL', 'ELEMENTAL', 'MATERIAL', 'VECTORIAL', 'PSYCHIC', 'BIOLOGICAL', 'NONE']

/** Nome do fragmento: o da linhagem, e Neutro no das skills sem linhagem. */
export const fragmentLabels: Record<Lineage, string> = {
  FUNDAMENTAL: 'Fundamental',
  ELEMENTAL: 'Elemental',
  MATERIAL: 'Material',
  VECTORIAL: 'Vetorial',
  PSYCHIC: 'Psíquico',
  BIOLOGICAL: 'Biológico',
  NONE: 'Neutro',
}

/** Classes por tipo de fragmento (texto e a cor como variável, para chanfro e barras). */
export const fragmentTone: Record<Lineage, { text: string; bg: string; color: string }> = {
  FUNDAMENTAL: { text: 'text-lineage-fundamental', bg: 'bg-lineage-fundamental', color: 'var(--color-lineage-fundamental)' },
  ELEMENTAL: { text: 'text-lineage-elemental', bg: 'bg-lineage-elemental', color: 'var(--color-lineage-elemental)' },
  MATERIAL: { text: 'text-lineage-material', bg: 'bg-lineage-material', color: 'var(--color-lineage-material)' },
  VECTORIAL: { text: 'text-lineage-vectorial', bg: 'bg-lineage-vectorial', color: 'var(--color-lineage-vectorial)' },
  PSYCHIC: { text: 'text-lineage-psychic', bg: 'bg-lineage-psychic', color: 'var(--color-lineage-psychic)' },
  BIOLOGICAL: { text: 'text-lineage-biological', bg: 'bg-lineage-biological', color: 'var(--color-lineage-biological)' },
  NONE: { text: 'text-lineage-none', bg: 'bg-lineage-none', color: 'var(--color-lineage-none)' },
}

/** Classes por raridade. */
export const rarityTone: Record<Rarity, { text: string; bg: string; border: string; color: string }> = {
  E: { text: 'text-rarity-e', bg: 'bg-rarity-e', border: 'border-rarity-e/50', color: 'var(--color-rarity-e)' },
  D: { text: 'text-rarity-d', bg: 'bg-rarity-d', border: 'border-rarity-d/50', color: 'var(--color-rarity-d)' },
  C: { text: 'text-rarity-c', bg: 'bg-rarity-c', border: 'border-rarity-c/50', color: 'var(--color-rarity-c)' },
  B: { text: 'text-rarity-b', bg: 'bg-rarity-b', border: 'border-rarity-b/50', color: 'var(--color-rarity-b)' },
  A: { text: 'text-rarity-a', bg: 'bg-rarity-a', border: 'border-rarity-a/50', color: 'var(--color-rarity-a)' },
  S: { text: 'text-rarity-s', bg: 'bg-rarity-s', border: 'border-rarity-s/50', color: 'var(--color-rarity-s)' },
  SS: { text: 'text-rarity-ss', bg: 'bg-rarity-ss', border: 'border-rarity-ss/50', color: 'var(--color-rarity-ss)' },
}

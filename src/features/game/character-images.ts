// Imagens dos personagens (../origin-game/docs/art_direction.md): public/characters/<templateKey>.png, corpo inteiro,
// fundo transparente, virados para a direita, cabeça no alto e pés perto da base. O inimigo é espelhado no CSS.

/** Caminho da imagem pelo `templateKey` (o mesmo de GET /templates, dos personagens e das unidades da batalha). */
export const characterImage = (templateKey: string) => `/characters/${templateKey}.png`

/** Altura relativa do boneco na batalha (1 = padrão): a Nox é pequena, o Kael é o maior da squad. */
export const characterScale: Record<string, number> = {
  nox: 0.92,
  'kael-vaz': 1.08,
}

export const scaleOf = (templateKey: string) => characterScale[templateKey] ?? 1

import { createContext, useContext, type ReactNode } from 'react'

// Tutoriais por tela: cada página tem o seu, aberto pelo botão "Tutorial" (`TutorialButton`). O tour do primeiro acesso
// passa pelos principais em sequência (`tourOrder` em tutorials.tsx). Conteúdo em tutorials.tsx; modal e tour em
// tutorial-provider.tsx.

export type TutorialId =
  | 'lobby'
  | 'personagens'
  | 'personagem'
  | 'esquadroes'
  | 'formacao'
  | 'batalhar'
  | 'batalha'
  | 'historico'
  | 'conta'

export type TutorialStep = {
  title: string
  content: ReactNode
}

export type Tutorial = {
  id: TutorialId
  /** Nome da tela, no título do modal e no botão "Próxima tela" do tour. */
  title: string
  /** Uma frase sobre a tela (lista de tutoriais do Guia). */
  summary: string
  steps: TutorialStep[]
}

export type TutorialApi = {
  /** Abre o tutorial de uma tela, fora do tour. */
  open: (id: TutorialId) => void
  /** Começa o tour pelas telas principais (navega entre elas). */
  startTour: () => void
}

export const TutorialContext = createContext<TutorialApi | null>(null)

export function useTutorial() {
  const api = useContext(TutorialContext)
  if (!api) throw new Error('useTutorial fora do TutorialProvider')
  return api
}

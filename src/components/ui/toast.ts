
// Avisos rápidos no canto da tela ("Personagem criado"). Um armazenamento solto, sem contexto: qualquer lugar chama
// `toast.success(...)` e o <Toaster /> (no main.tsx) desenha.

type Tone = 'success' | 'error'
export type ToastItem = { id: number; tone: Tone; title: string; description?: string }

const DURATION = { success: 4000, error: 7000 }

const listeners = new Set<() => void>()
let items: ToastItem[] = []
let nextId = 0
const emit = () => listeners.forEach((l) => l())

/** Para o <Toaster /> (toaster.tsx): lista atual e aviso de mudança. */
export const toastStore = {
  get: () => items,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

function push(tone: Tone, title: string, description?: string) {
  const id = ++nextId
  // no máximo 3 na tela: o mais velho sai
  items = [...items.slice(-2), { id, tone, title, description }]
  emit()
  setTimeout(() => dismiss(id), DURATION[tone])
}

export const toast = {
  success: (title: string, description?: string) => push('success', title, description),
  error: (title: string, description?: string) => push('error', title, description),
}

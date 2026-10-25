import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Cliente HTTP do origin-game (contrato em ../origin-game/docs/api.md).
// Sessão em cookies httpOnly: toda chamada vai com withCredentials.
// Em 401, tenta POST /sessions/refresh uma vez e repete a chamada.

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333',
  withCredentials: true,
})

/** Erro no formato do Nest: `{ statusCode, message }` (Zod devolve também `errors`). */
export type ApiErrorBody = { statusCode: number; message: string | string[]; errors?: unknown }

/** Status HTTP do erro; undefined quando nem chegou ao servidor. */
export function httpStatus(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as ApiErrorBody | undefined)?.message
    if (Array.isArray(message)) return message.join(', ')
    if (message) return message
  }
  return 'Algo deu errado. Tente de novo.'
}

let refreshing: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshing ??= api
    .post('/sessions/refresh', undefined, { skipRefresh: true })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  const canRetry =
    error.response?.status === 401 && config && !config.skipRefresh && !config._retried && !config.url?.startsWith('/sessions')

  if (canRetry && (await refreshSession())) {
    config._retried = true
    return api(config)
  }
  throw error
})

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Não tenta o refresh em 401 (usado pela própria chamada de refresh). */
    skipRefresh?: boolean
  }
}

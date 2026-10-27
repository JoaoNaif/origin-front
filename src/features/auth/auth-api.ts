import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage, httpStatus } from '@/lib/api'

// Contas e sessão (../origin-game/docs/api.md, "Contas e sessão").

export type Account = {
  id: string
  username: string
  displayName: string
  role: 'PLAYER' | 'ADMIN'
}

export type LoginInput = { username: string; password: string }
export type RegisterInput = LoginInput & { displayName: string }

export const meQueryKey = ['me'] as const

export async function login(input: LoginInput) {
  await api.post('/sessions', input)
}

export async function logout() {
  await api.delete('/sessions')
}

/** Cria a conta e já entra (a API não loga sozinha no cadastro). */
export async function register(input: RegisterInput) {
  await api.post('/accounts', input)
  await login({ username: input.username, password: input.password })
}

/** A conta logada, ou null se não há sessão (401 depois da tentativa de refresh). */
export async function getMe(): Promise<Account | null> {
  try {
    const { data } = await api.get<{ account: Account }>('/me')
    return data.account
  } catch (error) {
    if (httpStatus(error) === 401) return null
    throw error
  }
}

export function useMe() {
  return useQuery({ queryKey: meQueryKey, queryFn: getMe })
}

/** Até duas iniciais do nome exibido (avatar). */
export function accountInitials(displayName = '?') {
  return displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** Sai e limpa o cache; sem conta no /me, o RequireAuth leva para o login. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(meQueryKey, null)
    },
  })
}

export type UpdateAccountInput = { displayName?: string; currentPassword?: string; newPassword?: string }

/**
 * Muda o nome exibido e/ou a senha (PATCH /me). Trocar a senha encerra as outras sessões e manda cookies novos para
 * este aparelho. Senha atual errada vem como 400 (não 401), então não dispara o refresh.
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateAccountInput) => (await api.patch<{ account: Account }>('/me', input)).data.account,
    onSuccess: (account) => queryClient.setQueryData(meQueryKey, account),
  })
}

/** Mensagem dos erros comuns de login e cadastro. */
export function authErrorMessage(error: unknown) {
  const status = httpStatus(error)
  if (status === 401) return 'Usuário ou senha incorretos.'
  if (status === 409) return 'Esse usuário já está em uso.'
  if (status === 429) return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  if (!status) return 'Não foi possível conectar ao servidor.'
  if (status >= 500) return 'O servidor está com problemas. Tente de novo em instantes.'
  return apiErrorMessage(error)
}

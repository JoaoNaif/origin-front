import { QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx é resposta definitiva do servidor: não adianta repetir
      retry: (count, error) => {
        const status = error instanceof AxiosError ? error.response?.status : undefined
        if (status && status >= 400 && status < 500) return false
        return count < 2
      },
    },
  },
})

import { Loader2, WifiOff } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMe } from '@/features/auth/auth-api'

/** Só entra logado; sem sessão vai para o login e volta depois para onde estava. */
export function RequireAuth() {
  const location = useLocation()
  const me = useMe()

  if (me.isPending) return <FullScreenLoader />
  if (me.isError) return <ServerUnavailable onRetry={() => me.refetch()} retrying={me.isFetching} />
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />

  return <Outlet />
}

/** Login e cadastro: quem já está logado vai para onde queria ir (ou para a home). */
export function GuestOnly() {
  const location = useLocation()
  const me = useMe()

  if (me.isPending) return <FullScreenLoader />
  if (me.data) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  return <Outlet />
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg">
      <span className="animate-pulse font-display text-xl font-semibold tracking-[0.35em] text-gradient-silver">
        ORIGIN
      </span>
      <Loader2 className="size-5 animate-spin text-primary-soft" />
    </div>
  )
}

function ServerUnavailable({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-glow px-6">
      <div className="w-full max-w-sm space-y-5 rounded-panel border border-line bg-gradient-surface p-8 text-center shadow-panel">
        <WifiOff className="mx-auto size-8 text-fg-subtle" />
        <div className="space-y-1.5">
          <h1 className="font-display text-xl font-semibold text-silver-bright">Sem conexão com o servidor</h1>
          <p className="text-sm text-fg-muted">Não foi possível verificar sua sessão. Tente de novo em instantes.</p>
        </div>
        <Button variant="secondary" className="w-full" onClick={onRetry} disabled={retrying}>
          {retrying && <Loader2 className="size-4 animate-spin" />}
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}

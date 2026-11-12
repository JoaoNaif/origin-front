import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { GuestOnly, RequireAdmin, RequireAuth } from '@/features/auth/auth-guards'
import { AuthLayout } from '@/features/auth/auth-layout'
import { AccountPage } from '@/pages/account-page'
import { BattlePage } from '@/pages/battle-page'
import { CharacterPage } from '@/pages/character-page'
import { CharactersPage } from '@/pages/characters-page'
import { ChestsPage } from '@/pages/chests-page'
import { DesignPage } from '@/pages/design-page'
import { BeastsPage } from '@/pages/beasts-page'
import { GearPage } from '@/pages/gear-page'
import { GuidePage } from '@/pages/guide-page'
import { HistoryPage } from '@/pages/history-page'
import { HomePage } from '@/pages/home-page'
import { LoginPage } from '@/pages/login-page'
import { MarketPage } from '@/pages/market-page'
import { PlayPage } from '@/pages/play-page'
import { RegisterPage } from '@/pages/register-page'
import { SquadsPage } from '@/pages/squads-page'

export const router = createBrowserRouter([
  // Só para quem não está logado
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/cadastro', element: <RegisterPage /> },
        ],
      },
    ],
  },
  // Exige sessão: sem ela, vai para o login
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/batalhar', element: <PlayPage /> },
          { path: '/personagens', element: <CharactersPage /> },
          { path: '/personagens/:id', element: <CharacterPage /> },
          { path: '/esquadroes', element: <SquadsPage /> },
          { path: '/arsenal', element: <GearPage /> },
          { path: '/bestas', element: <BeastsPage /> },
          { path: '/mercado', element: <MarketPage /> },
          { path: '/baus', element: <ChestsPage /> },
          { path: '/historico', element: <HistoryPage /> },
          { path: '/guia', element: <GuidePage /> },
          { path: '/conta', element: <AccountPage /> },
          // Admin: carregado só para quem entra nele
          {
            element: <RequireAdmin />,
            children: [
              {
                path: '/admin',
                lazy: async () => ({ Component: (await import('@/pages/admin-page')).AdminPage }),
              },
            ],
          },
        ],
      },
      // Batalha em tela cheia, fora do AppShell
      { path: '/batalha/:id', element: <BattlePage /> },
    ],
  },
  // Referência do tema (pública)
  { path: '/design', element: <DesignPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

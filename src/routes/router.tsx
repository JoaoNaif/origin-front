import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { GuestOnly, RequireAuth } from '@/features/auth/auth-guards'
import { AuthLayout } from '@/features/auth/auth-layout'
import { BattlePage } from '@/pages/battle-page'
import { CharacterPage } from '@/pages/character-page'
import { CharactersPage } from '@/pages/characters-page'
import { DesignPage } from '@/pages/design-page'
import { HistoryPage } from '@/pages/history-page'
import { HomePage } from '@/pages/home-page'
import { LoginPage } from '@/pages/login-page'
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
          { path: '/historico', element: <HistoryPage /> },
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

import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';

// Route-level code splitting (§13): each feature page is its own chunk.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const MyTeamPage = lazy(() => import('@/features/my-team/MyTeamPage'));
const TransfersPage = lazy(() => import('@/features/transfers/TransfersPage'));
const PlayersPage = lazy(() => import('@/features/players/PlayersPage'));
const FixturesPage = lazy(() => import('@/features/fixtures/FixturesPage'));
const LeaguesPage = lazy(() => import('@/features/leagues/LeaguesPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'my-team', element: <MyTeamPage /> },
      { path: 'transfers', element: <TransfersPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'fixtures', element: <FixturesPage /> },
      { path: 'leagues', element: <LeaguesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];

// BASE_URL is Vite's `base` ('/fantasy-league/'), so links and refreshes work under the sub-path.
export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });

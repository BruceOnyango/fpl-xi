import { AlertTriangle, FlaskConical } from 'lucide-react';
import { Suspense, useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/atoms';
import { AppNav, Brand } from '@/components/organisms/AppNav';
import { TopBar } from '@/components/organisms/TopBar';
import { AppShell } from '@/components/templates';
import { useMeta } from '@/lib/api/hooks';

function PageFallback() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading page
      </span>
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[28rem] rounded-xl" />
    </div>
  );
}

/** Global data notices: mock backend, or predictions missing / made for an older GW. */
function DataNotice() {
  const meta = useMeta();
  const d = meta.data;
  if (!d) return null;
  if (d.source === 'mock') {
    return (
      <p className="border-secondary/30 bg-secondary-soft mb-6 flex items-start gap-2 rounded-lg border px-4 py-2.5 text-xs">
        <FlaskConical aria-hidden className="text-secondary-text mt-px h-4 w-4 shrink-0" />
        <span>
          <strong className="text-secondary-text font-semibold">Mock backend.</strong> Players,
          prices and injury flags are real FPL data from the last pull; predictions, fixtures,
          squads and leagues are generated placeholders. Run the API and set{' '}
          <code>VITE_USE_MOCKS=false</code> for your real team.
        </span>
      </p>
    );
  }
  const command = `cd backend && python scripts/export_predictions.py --gw ${d.nextGw}`;
  if (d.predictionsGw === null || d.predictionsGw < d.nextGw) {
    return (
      <p
        role="status"
        className="border-warning/40 bg-warning-soft mb-6 flex items-start gap-2 rounded-lg border px-4 py-2.5 text-xs"
      >
        <AlertTriangle aria-hidden className="text-warning mt-px h-4 w-4 shrink-0" />
        <span>
          <strong className="text-warning font-semibold">
            {d.predictionsGw === null
              ? 'No predictions exported yet.'
              : `Predictions are for GW ${d.predictionsGw}, but the next deadline is GW ${d.nextGw}.`}
          </strong>{' '}
          Prices and injury flags are live; recommendations need fresh predictions. Run{' '}
          <code className="bg-surface rounded px-1">{command}</code>
        </span>
      </p>
    );
  }
  return null;
}

function SidebarFooter() {
  const meta = useMeta();
  const m = meta.data?.model;
  return (
    <div className="border-border bg-surface-2 text-muted mt-auto rounded-lg border p-3 text-xs">
      <p className="text-text font-semibold">Model: {m?.name ?? '—'}</p>
      <p className="mt-0.5">
        {m
          ? `${m.spearman.toFixed(2)} Spearman over ${m.heldOutGameweeks} held-out GWs.`
          : meta.isPending
            ? 'Loading model info…'
            : 'No backtest saved yet (backend: evaluate.py --save).'}
      </p>
      <p className="mt-1">A season-long edge, not weekly certainty.</p>
    </div>
  );
}

/** Moves focus to <main> on navigation so screen-reader users land on the new page. */
function useRouteFocus() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
}

export function RootLayout() {
  useRouteFocus();
  return (
    <AppShell
      sidebar={
        <>
          <Brand />
          <AppNav />
          <SidebarFooter />
        </>
      }
      topBar={<TopBar />}
      notice={<DataNotice />}
      footer={
        <footer className="border-border text-muted border-t px-6 py-4 text-xs">
          Not affiliated with the Premier League or Fantasy Premier League. Data from the unofficial
          FPL API, cached politely.
        </footer>
      }
    >
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </AppShell>
  );
}

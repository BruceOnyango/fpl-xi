/** MSW request handlers — the mock implementation of the backend API contract. */
import { delay, http, HttpResponse } from 'msw';
import { db } from './db';
import type { Horizon } from '@/lib/api/schemas';

const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/fpl';
/** Simulated latency so loading states are visible in dev (0 in tests). */
const latency = () => (import.meta.env.MODE === 'test' ? 0 : 250 + Math.random() * 350);

const horizonOf = (url: URL): Horizon => {
  const h = Number(url.searchParams.get('horizon') ?? 1);
  return h === 3 || h === 6 ? h : 1;
};
const teamIdOf = (raw: string | readonly string[] | undefined): number | null => {
  const n = Number(raw);
  // 404 is reserved so the error state can be exercised from the UI and tests.
  return Number.isInteger(n) && n > 0 && n !== 404 && n < 100_000_000 ? n : null;
};

export const handlers = [
  http.get(`${base}/meta`, async () => {
    await delay(latency());
    return HttpResponse.json(db.meta());
  }),
  http.get(`${base}/teams`, async () => {
    await delay(latency());
    return HttpResponse.json(db.teams());
  }),
  http.get(`${base}/players`, async ({ request }) => {
    await delay(latency());
    return HttpResponse.json(db.players(horizonOf(new URL(request.url))));
  }),
  http.get(`${base}/fixtures`, async ({ request }) => {
    await delay(latency());
    const url = new URL(request.url);
    return HttpResponse.json(
      db.fixtures(
        Number(url.searchParams.get('fromGw') ?? 1),
        Number(url.searchParams.get('toGw') ?? 38),
      ),
    );
  }),
  http.get(`${base}/managers/:teamId/squad`, async ({ params, request }) => {
    await delay(latency());
    const id = teamIdOf(params.teamId);
    if (id === null)
      return HttpResponse.json(
        { detail: 'FPL has no record of that ID. Check it and try again.' },
        { status: 404 },
      );
    return HttpResponse.json(db.managerSquad(id, horizonOf(new URL(request.url))));
  }),
  http.get(`${base}/managers/:teamId/leagues`, async ({ params }) => {
    await delay(latency());
    const id = teamIdOf(params.teamId);
    if (id === null)
      return HttpResponse.json(
        { detail: 'FPL has no record of that ID. Check it and try again.' },
        { status: 404 },
      );
    return HttpResponse.json(db.leagues(id));
  }),
  http.get(`${base}/model/backtest`, async ({ request }) => {
    await delay(latency());
    return HttpResponse.json(db.backtest(horizonOf(new URL(request.url))));
  }),
];

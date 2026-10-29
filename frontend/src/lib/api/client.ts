/**
 * The one typed API client. Every call is parsed through a Zod schema, so nothing
 * unvalidated reaches a component (PROMPT.md §8).
 */
import type { z } from 'zod';
import {
  backtestResponseSchema,
  fixturesResponseSchema,
  leaguesResponseSchema,
  managerSquadResponseSchema,
  metaResponseSchema,
  playersResponseSchema,
  teamsResponseSchema,
  type Horizon,
} from './schemas';

/** The backend's single public entry point (e.g. https://bruceonyango.link/fpl). */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/fpl';

/** HTTP or contract failure, with a message safe to show a human. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly kind: 'http' | 'network' | 'contract';
  constructor(message: string, kind: ApiError['kind'], status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      'network',
    );
  }
  if (!res.ok) {
    // Our API puts a human-readable message in `detail`; prefer it when present.
    const detail = await res
      .json()
      .then((b: unknown) =>
        b && typeof b === 'object' && 'detail' in b && typeof b.detail === 'string'
          ? b.detail
          : null,
      )
      .catch(() => null);
    const message =
      detail ??
      (res.status === 404
        ? "We couldn't find that. Check the ID and try again."
        : `The server returned an error (${res.status}). Try again in a moment.`);
    throw new ApiError(message, 'http', res.status);
  }
  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    // Fail loudly in dev; degrade to a human error in prod.
    if (import.meta.env.DEV) console.error(`[api] contract violation on ${path}`, parsed.error);
    throw new ApiError(
      'The server sent data in an unexpected shape. This is a bug on our side.',
      'contract',
    );
  }
  return parsed.data;
}

export const api = {
  meta: (signal?: AbortSignal) => request('/meta', metaResponseSchema, signal),
  teams: (signal?: AbortSignal) => request('/teams', teamsResponseSchema, signal),
  players: (horizon: Horizon, signal?: AbortSignal) =>
    request(`/players?horizon=${horizon}`, playersResponseSchema, signal),
  fixtures: (fromGw: number, toGw: number, signal?: AbortSignal) =>
    request(`/fixtures?fromGw=${fromGw}&toGw=${toGw}`, fixturesResponseSchema, signal),
  managerSquad: (teamId: number, horizon: Horizon, signal?: AbortSignal) =>
    request(`/managers/${teamId}/squad?horizon=${horizon}`, managerSquadResponseSchema, signal),
  leagues: (teamId: number, signal?: AbortSignal) =>
    request(`/managers/${teamId}/leagues`, leaguesResponseSchema, signal),
  backtest: (horizon: Horizon, signal?: AbortSignal) =>
    request(`/model/backtest?horizon=${horizon}`, backtestResponseSchema, signal),
};

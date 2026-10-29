/** URL encoding for a transfer plan: ?t=outId-inId,outId-inId — shareable and bookmarkable. */
import type { TransferPair } from '@/lib/fpl/rules';

export const PARAM = 't';

export function parseTransfers(raw: string | null): TransferPair[] {
  if (!raw) return [];
  const seenOut = new Set<number>();
  const seenIn = new Set<number>();
  const out: TransferPair[] = [];
  for (const part of raw.split(',')) {
    const m = /^(\d+)-(\d+)$/.exec(part.trim());
    if (!m) continue;
    const outId = Number(m[1]);
    const inId = Number(m[2]);
    if (seenOut.has(outId) || seenIn.has(inId) || outId === inId) continue;
    seenOut.add(outId);
    seenIn.add(inId);
    out.push({ outId, inId });
  }
  return out;
}

export function serializeTransfers(pairs: readonly TransferPair[]): string {
  return pairs.map((p) => `${p.outId}-${p.inId}`).join(',');
}

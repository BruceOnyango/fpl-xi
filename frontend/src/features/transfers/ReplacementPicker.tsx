import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, CardBody, CardHeader, PriceTag } from '@/components/atoms';
import {
  BanRiskFlag,
  EmptyState,
  PlayerName,
  PredictionRange,
  SearchField,
} from '@/components/molecules';
import type { Player } from '@/lib/api/schemas';
import { formatPrice } from '@/lib/format';
import { availabilityOf } from '@/lib/fpl/players';
import { describeViolation, type SimulationResult, type TransferPair } from '@/lib/fpl/rules';

export interface ReplacementPickerProps {
  out: Player;
  sellingPrice: number;
  players: ReadonlyMap<number, Player>;
  /** Ids already in the squad (after other planned moves). */
  ownedIds: ReadonlySet<number>;
  teamShort: (id: number) => string;
  preview: (pair: TransferPair) => SimulationResult | null;
  onPick: (inId: number) => void;
  onCancel: () => void;
}

const LIMIT = 40;

/** Same-position replacements, ranked by prediction, with live legality. */
export function ReplacementPicker({
  out,
  sellingPrice,
  players,
  ownedIds,
  teamShort,
  preview,
  onPick,
  onCancel,
}: ReplacementPickerProps) {
  const [q, setQ] = useState('');
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...players.values()]
      .filter(
        (p) => p.position === out.position && !ownedIds.has(p.id) && availabilityOf(p) !== 'out',
      )
      .filter(
        (p) =>
          !needle ||
          p.webName.toLowerCase().includes(needle) ||
          teamShort(p.teamId).toLowerCase() === needle,
      )
      .sort((a, b) => b.prediction.points - a.prediction.points)
      .slice(0, LIMIT)
      .map((p) => {
        const sim = preview({ outId: out.id, inId: p.id });
        const blocking =
          sim?.violations.filter((v) => v.kind === 'budget' || v.kind === 'club-limit') ?? [];
        return { p, blocking };
      });
  }, [players, out, ownedIds, q, teamShort, preview]);
  const max = Math.max(1, ...candidates.map((c) => c.p.prediction.high));

  return (
    <Card aria-labelledby="picker-title">
      <CardHeader
        id="picker-title"
        title={`Replace ${out.webName}`}
        description={`${out.position} · sells for ${formatPrice(sellingPrice)} · ${out.prediction.points.toFixed(1)} predicted`}
        actions={
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel replacement">
            <X aria-hidden className="h-4 w-4" />
          </Button>
        }
      />
      <CardBody className="flex flex-col gap-3 pt-3">
        <SearchField
          label={`Search ${out.position} replacements`}
          value={q}
          onChange={setQ}
          placeholder="Name or club (e.g. ARS)"
        />
        {candidates.length === 0 ? (
          <EmptyState title="No matches" description="Try a different name, or clear the search." />
        ) : (
          <ul className="divide-border border-border max-h-[28rem] divide-y overflow-y-auto rounded-lg border">
            {candidates.map(({ p, blocking }) => {
              const delta = p.prediction.points - out.prediction.points;
              const reason = blocking[0] ? describeViolation(blocking[0], teamShort) : null;
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <PlayerName
                        name={p.webName}
                        teamShort={teamShort(p.teamId)}
                        position={p.position}
                        showAvatar={false}
                      />
                      <BanRiskFlag
                        variant="compact"
                        yellowCards={p.yellowCards}
                        oneYellowFromBan={p.oneYellowFromBan}
                        className="mr-auto"
                      />
                      <PriceTag price={p.price} />
                    </div>
                    <PredictionRange prediction={p.prediction} max={max} />
                    {reason ? <p className="text-negative text-xs">{reason}</p> : null}
                  </div>
                  <Button
                    size="sm"
                    variant={reason ? 'secondary' : 'primary'}
                    disabled={reason !== null}
                    onClick={() => onPick(p.id)}
                    aria-label={`Bring in ${p.webName}${reason ? ` (blocked: ${reason})` : `, ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} points`}`}
                  >
                    {delta >= 0 ? '+' : '−'}
                    {Math.abs(delta).toFixed(1)}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

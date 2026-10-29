import { Crown } from 'lucide-react';
import { Badge, Card, CardBody, CardHeader } from '@/components/atoms';
import { PlayerName, PredictionRange } from '@/components/molecules';
import type { Player, Prediction } from '@/lib/api/schemas';

export interface CaptainCandidate {
  player: Player;
  teamShort: string;
  /** Single-gameweek prediction — captaincy is always 1-GW. */
  oneGw: Prediction;
}

export interface CaptaincyPanelProps {
  candidates: readonly CaptainCandidate[];
  captainId: number;
  viceCaptainId: number;
  /** How many options to list. */
  limit?: number;
  className?: string;
}

/**
 * Captain options ranked by single-GW projection, with ranges, so overlapping
 * options read as the coin-flips they often are.
 */
export function CaptaincyPanel({
  candidates,
  captainId,
  viceCaptainId,
  limit = 5,
  className,
}: CaptaincyPanelProps) {
  const ranked = [...candidates].sort((a, b) => b.oneGw.points - a.oneGw.points).slice(0, limit);
  const max = Math.max(...ranked.map((c) => c.oneGw.high), 1);
  const [first, second] = ranked;
  const closeCall =
    first &&
    second &&
    second.oneGw.high >= first.oneGw.points &&
    first.oneGw.low <= second.oneGw.points;

  return (
    <Card aria-labelledby="captaincy-title" className={className}>
      <CardHeader
        id="captaincy-title"
        title="Captaincy"
        description="Ranked on this gameweek only (captain scores double)."
      />
      <CardBody className="pt-4">
        <ol className="space-y-3">
          {ranked.map((c) => {
            const role =
              c.player.id === captainId ? 'C' : c.player.id === viceCaptainId ? 'VC' : null;
            return (
              <li key={c.player.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <PlayerName
                    name={c.player.webName}
                    fullName={`${c.player.firstName} ${c.player.secondName}`}
                    teamShort={c.teamShort}
                    position={c.player.position}
                  />
                  {role ? (
                    <Badge tone={role === 'C' ? 'accent' : 'neutral'}>
                      {role === 'C' ? <Crown aria-hidden className="h-3 w-3" /> : null}
                      {role === 'C' ? 'Captain' : 'Vice'}
                    </Badge>
                  ) : null}
                </div>
                <PredictionRange prediction={c.oneGw} max={max} />
              </li>
            );
          })}
        </ol>
        {closeCall ? (
          <p className="bg-surface-2 text-muted mt-4 rounded-md px-3 py-2 text-xs">
            <strong className="text-text">Close call.</strong> The top two ranges overlap heavily —
            either is a defensible armband.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

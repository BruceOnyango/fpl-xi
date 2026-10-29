import { ShieldCheck } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/atoms';
import { AvailabilityFlag, EmptyState, PlayerName } from '@/components/molecules';
import type { Player } from '@/lib/api/schemas';
import { flaggedPlayers } from '@/lib/fpl/players';

export interface FlaggedPlayersProps {
  players: readonly Player[];
  teamShort: (teamId: number) => string;
  /** Reasons the availability gate gave, keyed by player id. */
  excludedReasons?: ReadonlyMap<number, string>;
  title?: string;
  className?: string;
}

/** Injury/suspension/doubt watchlist for a set of players (usually the squad). */
export function FlaggedPlayers({
  players,
  teamShort,
  excludedReasons,
  title = 'Availability watch',
  className,
}: FlaggedPlayersProps) {
  const flagged = flaggedPlayers(players);
  return (
    <Card aria-labelledby="flagged-title" className={className}>
      <CardHeader
        id="flagged-title"
        title={title}
        description="FPL status flags as of the last data pull."
      />
      <CardBody className="pt-3">
        {flagged.length === 0 ? (
          <EmptyState
            className="py-4"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No flags in your squad"
            description="Nobody is injured, suspended or doubtful. Re-check close to the deadline."
          />
        ) : (
          <ul className="divide-border divide-y">
            {flagged.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
                <PlayerName
                  name={p.webName}
                  teamShort={teamShort(p.teamId)}
                  position={p.position}
                  showAvatar={false}
                />
                <AvailabilityFlag
                  status={p.status}
                  chanceOfPlaying={p.chanceOfPlaying}
                  news={p.news}
                />
                {excludedReasons?.has(p.id) ? (
                  <p className="text-muted text-xs">
                    Benched by the availability gate before the solver ran.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

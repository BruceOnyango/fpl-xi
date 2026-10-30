import { X } from 'lucide-react';
import { Button, Card, FormDot, PriceTag } from '@/components/atoms';
import {
  AvailabilityFlag,
  BanRiskFlag,
  BlankFixtureChip,
  FixtureChip,
  PlayerName,
  PredictionRange,
} from '@/components/molecules';
import type { Player } from '@/lib/api/schemas';
import type { TeamFixture } from '@/lib/fpl/fixtures';
import { formatPercent } from '@/lib/format';
import { valueScore } from '@/lib/fpl/players';
import { cn } from '@/lib/utils/cn';

export interface PlayerCardProps {
  player: Player;
  teamShort: (teamId: number) => string;
  /** Upcoming fixtures for the player's club. */
  fixtures?: readonly TeamFixture[];
  /** Shared axis max so cards side by side are comparable. */
  predictionMax: number;
  horizonLabel: string;
  onRemove?: () => void;
  className?: string;
}

/** Full player profile, used in the comparison view. */
export function PlayerCard({
  player: p,
  teamShort,
  fixtures = [],
  predictionMax,
  horizonLabel,
  onRemove,
  className,
}: PlayerCardProps) {
  const stats: [string, string][] = [
    ['Total pts', String(p.totalPoints)],
    ['Pts / game', p.pointsPerGame.toFixed(1)],
    ['Minutes', String(p.minutes)],
    ['xG', p.xg.toFixed(2)],
    ['xA', p.xa.toFixed(2)],
    ['Owned', formatPercent(p.selectedByPercent)],
    ['Pts / £m', valueScore(p).toFixed(2)],
  ];
  return (
    <Card as="article" aria-label={p.webName} className={cn('flex flex-col gap-4 p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <PlayerName
          name={p.webName}
          fullName={`${p.firstName} ${p.secondName}`}
          teamShort={teamShort(p.teamId)}
          position={p.position}
          meta={<PriceTag price={p.price} className="text-xs" />}
        />
        {onRemove ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Remove ${p.webName} from comparison`}
          >
            <X aria-hidden className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <AvailabilityFlag status={p.status} chanceOfPlaying={p.chanceOfPlaying} news={p.news} />
      <BanRiskFlag yellowCards={p.yellowCards} oneYellowFromBan={p.oneYellowFromBan} />
      <div>
        <p className="text-muted mb-1 text-xs font-medium">Predicted · {horizonLabel}</p>
        <PredictionRange prediction={p.prediction} max={predictionMax} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Form</span>
        <FormDot form={p.form} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {stats.map(([k, v]) => (
          <div key={k} className="border-border flex justify-between gap-2 border-b pb-1">
            <dt className="text-muted">{k}</dt>
            <dd className="tabular font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {fixtures.length ? (
        <div>
          <p className="text-muted mb-1.5 text-xs font-medium">Next fixtures</p>
          <ul className="flex flex-wrap gap-1">
            {fixtures.map((f) => (
              <li key={f.fixtureId}>
                <FixtureChip
                  size="sm"
                  opponentShort={teamShort(f.opponentId)}
                  home={f.home}
                  difficulty={f.difficulty}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <BlankFixtureChip size="sm" />
      )}
    </Card>
  );
}

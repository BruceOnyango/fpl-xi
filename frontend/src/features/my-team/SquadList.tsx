import { PriceTag } from '@/components/atoms';
import { AvailabilityFlag, BanRiskFlag, PlayerName, PredictionRange } from '@/components/molecules';
import type { Position } from '@/lib/api/schemas';
import type { SquadView } from '@/lib/api/views';

const ORDER: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
const HEADINGS: Record<Position, string> = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
};

/** The 15, grouped by position, with selling price and prediction range. */
export function SquadList({
  view,
  teamShort,
}: {
  view: SquadView;
  teamShort: (id: number) => string;
}) {
  const starterIds = new Set(view.starters.map((s) => s.player.id));
  const max = Math.max(1, ...view.squad.map((p) => p.prediction.high));
  return (
    <div className="flex flex-col gap-5">
      {ORDER.map((pos) => (
        <section key={pos} aria-labelledby={`squad-${pos}`}>
          <h3
            id={`squad-${pos}`}
            className="text-muted mb-2 text-xs font-semibold tracking-wide uppercase"
          >
            {HEADINGS[pos]}
          </h3>
          <ul className="divide-border border-border divide-y rounded-lg border">
            {view.squad
              .filter((p) => p.position === pos)
              .sort((a, b) => b.prediction.points - a.prediction.points)
              .map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 max-sm:grid-cols-1"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <PlayerName
                      name={p.webName}
                      fullName={`${p.firstName} ${p.secondName}`}
                      teamShort={teamShort(p.teamId)}
                      position={p.position}
                    />
                    {starterIds.has(p.id) ? null : (
                      <span className="text-2xs text-muted font-semibold uppercase">Bench</span>
                    )}
                    <AvailabilityFlag
                      variant="icon"
                      status={p.status}
                      chanceOfPlaying={p.chanceOfPlaying}
                      news={p.news}
                    />
                    <BanRiskFlag
                      variant="compact"
                      yellowCards={p.yellowCards}
                      oneYellowFromBan={p.oneYellowFromBan}
                    />
                  </div>
                  <PredictionRange prediction={p.prediction} max={max} />
                  <span className="text-muted text-right text-xs">
                    sell{' '}
                    <PriceTag price={view.sellingPrices.get(p.id) ?? p.price} className="text-xs" />
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import { Armchair } from 'lucide-react';
import { AvailabilityFlag, FixtureChip, PitchPlayer } from '@/components/molecules';
import type { SlotView } from '@/lib/api/views';
import { availabilityOf } from '@/lib/fpl/players';
import { pitchRows } from '@/lib/fpl/lineup';
import { cn } from '@/lib/utils/cn';

export interface SquadPitchProps {
  starters: readonly SlotView[];
  bench: readonly SlotView[];
  captainId: number;
  viceCaptainId: number;
  /** Makes tokens selectable (planner, detail view). */
  onSelectPlayer?: (playerId: number) => void;
  selectedId?: number | null;
  /** Players the availability gate excluded — shown dimmed on the bench. */
  excludedIds?: ReadonlySet<number>;
  /** Accessible name for the pitch region. */
  label?: string;
  className?: string;
}

/**
 * The formation view. Rows are GK→FWD top to bottom so the DOM/reading order is
 * the same as the visual order — keyboard users tab through it like a list.
 */
export function SquadPitch({
  starters,
  bench,
  captainId,
  viceCaptainId,
  onSelectPlayer,
  selectedId = null,
  excludedIds,
  label = 'Starting eleven',
  className,
}: SquadPitchProps) {
  const rows = pitchRows(starters.map((s) => ({ ...s, position: s.player.position })));

  const token = (s: SlotView, onBench = false) => (
    <li key={s.player.id}>
      <PitchPlayer
        name={s.player.webName}
        teamShort={s.teamShort}
        position={s.player.position}
        predicted={s.predicted}
        armband={s.player.id === captainId ? 'C' : s.player.id === viceCaptainId ? 'V' : undefined}
        fixture={
          s.nextFixture ? (
            <FixtureChip
              size="sm"
              opponentShort={s.nextFixture.opponentShort}
              home={s.nextFixture.home}
              difficulty={s.nextFixture.difficulty}
            />
          ) : undefined
        }
        flag={
          availabilityOf(s.player) !== 'available' ? (
            <AvailabilityFlag
              variant="icon"
              status={s.player.status}
              chanceOfPlaying={s.player.chanceOfPlaying}
              news={s.player.news}
            />
          ) : undefined
        }
        dimmed={onBench && (excludedIds?.has(s.player.id) ?? false)}
        selected={selectedId === s.player.id}
        onSelect={onSelectPlayer ? () => onSelectPlayer(s.player.id) : undefined}
      />
    </li>
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        role="region"
        aria-label={label}
        className="relative overflow-hidden rounded-xl bg-[repeating-linear-gradient(180deg,var(--pitch-1)_0_56px,var(--pitch-2)_56px_112px)] px-2 py-5 sm:px-6"
      >
        {/* Pitch markings — decorative */}
        <div
          aria-hidden
          className="border-pitch-line pointer-events-none absolute inset-3 rounded-md border-2"
        />
        <div
          aria-hidden
          className="border-pitch-line pointer-events-none absolute top-3 left-1/2 h-14 w-2/5 -translate-x-1/2 border-2 border-t-0"
        />
        <div
          aria-hidden
          className="border-pitch-line pointer-events-none absolute bottom-3 left-1/2 h-24 w-24 -translate-x-1/2 translate-y-1/2 rounded-full border-2"
        />
        <ol className="relative flex flex-col gap-4 sm:gap-6">
          {rows.map((row, i) =>
            row.length ? (
              <li key={i}>
                <ul className="flex justify-center gap-1 sm:gap-4">{row.map((s) => token(s))}</ul>
              </li>
            ) : null,
          )}
        </ol>
      </div>
      {bench.length ? (
        <section
          aria-label="Bench"
          className="border-border bg-surface-2 rounded-xl border px-3 py-3"
        >
          <h3 className="text-muted mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <Armchair aria-hidden className="h-3.5 w-3.5" /> Bench
          </h3>
          <ol className="[&_.bg-surface]:bg-surface flex justify-center gap-1 sm:gap-4">
            {bench.map((s) => token(s, true))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

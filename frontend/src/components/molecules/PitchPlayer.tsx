import type { ReactNode } from 'react';
import type { Position } from '@/lib/api/schemas';
import { formatPoints } from '@/lib/format';
import { cn } from '@/lib/utils/cn';

export interface PitchPlayerProps {
  name: string;
  teamShort: string;
  position: Position;
  /** Points shown under the name (already includes horizon). */
  predicted: number;
  /** Slot under the points — typically a FixtureChip. */
  fixture?: ReactNode;
  armband?: 'C' | 'V';
  /** Availability icon slot (AvailabilityFlag variant="icon"). */
  flag?: ReactNode;
  /** When provided, the token is a button. */
  onSelect?: () => void;
  selected?: boolean;
  /**
   * Ruled out (e.g. benched by the availability gate). Shown as a grey, dashed shirt —
   * never via opacity, which drops text below 4.5:1 contrast (§7).
   */
  dimmed?: boolean;
  className?: string;
}

const shirt: Record<Position, string> = {
  GK: 'bg-pos-gk',
  DEF: 'bg-pos-def',
  MID: 'bg-pos-mid',
  FWD: 'bg-pos-fwd',
};

/** A player token on the pitch: shirt, name plate, points, fixture. */
export function PitchPlayer({
  name,
  teamShort,
  position,
  predicted,
  fixture,
  armband,
  flag,
  onSelect,
  selected = false,
  dimmed = false,
  className,
}: PitchPlayerProps) {
  const label = `${name}, ${teamShort} ${position}, ${formatPoints(predicted)} predicted points${
    armband === 'C' ? ', captain' : armband === 'V' ? ', vice-captain' : ''
  }${dimmed ? ', ruled out' : ''}`;
  const body = (
    <>
      <span className="relative">
        <span
          aria-hidden
          className={cn(
            'text-2xs flex h-10 w-10 items-center justify-center rounded-t-xl rounded-b-md font-bold shadow-md sm:h-12 sm:w-12',
            dimmed
              ? 'bg-surface-3 text-muted border-muted border-2 border-dashed shadow-none'
              : ['text-pos-fg', shirt[position]],
          )}
        >
          {teamShort}
        </span>
        {armband ? (
          <span
            aria-hidden
            className={cn(
              'border-pitch-2 text-2xs absolute -top-1.5 -right-2 flex h-5 w-5 items-center justify-center rounded-full border-2 font-bold',
              armband === 'C' ? 'bg-text text-surface' : 'bg-surface-3 text-text',
            )}
          >
            {armband}
          </span>
        ) : null}
        {flag ? (
          <span className="bg-surface absolute -top-1.5 -left-2 flex h-5 w-5 items-center justify-center rounded-full">
            {flag}
          </span>
        ) : null}
      </span>
      <span className="bg-surface mt-1 w-full max-w-24 overflow-hidden rounded-md text-center shadow-sm">
        <span className="text-2xs text-text block truncate px-1.5 py-0.5 font-semibold sm:text-xs">
          {name}
        </span>
        <span className="tabular bg-surface-3 text-2xs text-text block px-1 py-0.5 font-bold">
          {formatPoints(predicted)} pts
        </span>
      </span>
      {fixture ? <span className="mt-1">{fixture}</span> : null}
    </>
  );
  const classes = cn(
    'flex w-[4.5rem] flex-col items-center sm:w-24',
    selected && 'rounded-lg ring-2 ring-focus ring-offset-2 ring-offset-pitch-1',
    className,
  );
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={label}
        aria-pressed={selected}
        className={cn(classes, 'rounded-lg')}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={classes} role="group" aria-label={label}>
      {body}
    </div>
  );
}

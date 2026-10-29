import { fdrFill } from '@/components/atoms';
import { DIFFICULTY_LABEL, type Difficulty } from '@/lib/fpl/fixtures';
import { cn } from '@/lib/utils/cn';

export interface FixtureChipProps {
  opponentShort: string;
  home: boolean;
  difficulty: Difficulty;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * "ARS (H) 4" — opponent, venue and difficulty. The FDR number is always printed, so the
 * chip reads correctly without colour (PROMPT.md §7).
 */
export function FixtureChip({
  opponentShort,
  home,
  difficulty,
  size = 'md',
  className,
}: FixtureChipProps) {
  const venue = home ? 'H' : 'A';
  return (
    <span
      title={`${opponentShort} ${home ? 'home' : 'away'} — difficulty ${difficulty} (${DIFFICULTY_LABEL[difficulty]})`}
      className={cn(
        'tabular inline-flex items-center justify-between gap-1 rounded-md font-semibold',
        size === 'sm' ? 'text-2xs h-6 px-1.5' : 'h-8 px-2 text-xs',
        fdrFill[difficulty],
        className,
      )}
    >
      <span>
        {opponentShort}
        <span className="ml-0.5 font-medium">({venue})</span>
      </span>
      <span className="sr-only">
        {home ? 'home' : 'away'}, difficulty {difficulty} of 5
      </span>
      <span aria-hidden className="rounded bg-black/15 px-1">
        {difficulty}
      </span>
    </span>
  );
}

/** Blank gameweek cell. */
export function BlankFixtureChip({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'border-border text-muted inline-flex items-center justify-center rounded-md border border-dashed',
        size === 'sm' ? 'text-2xs h-6 px-1.5' : 'h-8 px-2 text-xs',
        className,
      )}
    >
      Blank
    </span>
  );
}

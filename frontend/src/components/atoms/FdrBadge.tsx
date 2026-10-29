import { DIFFICULTY_LABEL, type Difficulty } from '@/lib/fpl/fixtures';
import { cn } from '@/lib/utils/cn';

export interface FdrBadgeProps {
  difficulty: Difficulty;
  className?: string;
}

const styles: Record<Difficulty, string> = {
  1: 'bg-fdr-1 text-fdr-1-fg',
  2: 'bg-fdr-2 text-fdr-2-fg',
  3: 'bg-fdr-3 text-fdr-3-fg',
  4: 'bg-fdr-4 text-fdr-4-fg',
  5: 'bg-fdr-5 text-fdr-5-fg',
};

/** Fixture difficulty 1–5. Always shows the number — colour alone fails colour-blind users (§7). */
export function FdrBadge({ difficulty, className }: FdrBadgeProps) {
  return (
    <span
      title={`Difficulty ${difficulty}: ${DIFFICULTY_LABEL[difficulty]}`}
      className={cn(
        'tabular text-2xs inline-flex h-5 w-5 items-center justify-center rounded font-bold',
        styles[difficulty],
        className,
      )}
    >
      <span className="sr-only">Difficulty </span>
      {difficulty}
    </span>
  );
}

/** Classes for a cell/chip filled with the FDR colour. Exported for FixtureChip. */
export const fdrFill = styles;

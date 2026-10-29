import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/atoms';
import { cn } from '@/lib/utils/cn';

export interface GameweekSelectorProps {
  gw: number;
  min?: number;
  max?: number;
  onChange: (gw: number) => void;
  className?: string;
}

/** Previous / current / next gameweek stepper. */
export function GameweekSelector({
  gw,
  min = 1,
  max = 38,
  onChange,
  className,
}: GameweekSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Gameweek"
      className={cn('inline-flex items-center gap-1', className)}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous gameweek"
        disabled={gw <= min}
        onClick={() => onChange(gw - 1)}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
      </Button>
      <output
        aria-live="polite"
        className="tabular font-display min-w-16 text-center text-lg font-bold"
      >
        GW {gw}
      </output>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next gameweek"
        disabled={gw >= max}
        onClick={() => onChange(gw + 1)}
      >
        <ChevronRight aria-hidden className="h-4 w-4" />
      </Button>
    </div>
  );
}

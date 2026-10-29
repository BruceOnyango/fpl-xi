import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatDelta } from '@/lib/format';
import { cn } from '@/lib/utils/cn';

export interface DeltaProps {
  value: number;
  /** Text after the number, e.g. "pts". */
  unit?: string;
  /** For ranks, going down is good. */
  invert?: boolean;
  digits?: number;
  className?: string;
}

/** Signed change with an arrow icon and sign — never colour alone. */
export function Delta({ value, unit, invert = false, digits = 1, className }: DeltaProps) {
  const good = invert ? value < 0 : value > 0;
  const flat = Number(value.toFixed(digits)) === 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-0.5 text-xs font-semibold',
        flat ? 'text-muted' : good ? 'text-positive' : 'text-negative',
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {formatDelta(value, digits)}
      {unit ? <span className="ml-0.5 font-medium">{unit}</span> : null}
    </span>
  );
}

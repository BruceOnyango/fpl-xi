import type { Position } from '@/lib/api/schemas';
import { cn } from '@/lib/utils/cn';

export interface PositionPillProps {
  position: Position;
  className?: string;
}

const styles: Record<Position, string> = {
  GK: 'bg-pos-gk',
  DEF: 'bg-pos-def',
  MID: 'bg-pos-mid',
  FWD: 'bg-pos-fwd',
};
const names: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

/** GK/DEF/MID/FWD. The text is the signal; colour only reinforces it. */
export function PositionPill({ position, className }: PositionPillProps) {
  return (
    <abbr
      title={names[position]}
      className={cn(
        'text-2xs text-pos-fg inline-flex h-5 min-w-9 items-center justify-center rounded px-1.5 font-bold no-underline',
        styles[position],
        className,
      )}
    >
      {position}
    </abbr>
  );
}

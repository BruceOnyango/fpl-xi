import type { ReactNode } from 'react';
import { Avatar, PositionPill } from '@/components/atoms';
import type { Position } from '@/lib/api/schemas';
import { cn } from '@/lib/utils/cn';

export interface PlayerNameProps {
  /** Display name (FPL web_name). */
  name: string;
  /** Full name for the avatar initials. Defaults to `name`. */
  fullName?: string;
  teamShort: string;
  position: Position;
  /** Extra line under the name (price, fixture…). */
  meta?: ReactNode;
  showAvatar?: boolean;
  className?: string;
}

export function PlayerName({
  name,
  fullName,
  teamShort,
  position,
  meta,
  showAvatar = true,
  className,
}: PlayerNameProps) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {showAvatar ? <Avatar name={fullName ?? name} size="sm" /> : null}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="text-muted flex items-center gap-1.5 text-xs">
          <PositionPill position={position} />
          <span>{teamShort}</span>
          {meta ? (
            <>
              <span aria-hidden>·</span>
              {meta}
            </>
          ) : null}
        </span>
      </span>
    </span>
  );
}

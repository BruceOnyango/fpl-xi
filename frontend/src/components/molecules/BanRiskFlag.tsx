import { cn } from '@/lib/utils/cn';

export interface BanRiskFlagProps {
  yellowCards: number;
  /** From the API: one more booking next GW triggers a suspension. */
  oneYellowFromBan: boolean;
  /** `icon` for tight rows and pitch tokens (label goes to sr-only + title). */
  variant?: 'full' | 'icon';
  className?: string;
}

/** A referee's yellow card. Fixed colour on purpose: it should read as a card in both themes. */
function YellowCard({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] bg-[#f5c518] ring-1 ring-black/20',
        className,
      )}
    />
  );
}

/** Warns that a player is one yellow card from a suspension. Renders nothing otherwise. */
export function BanRiskFlag({
  yellowCards,
  oneYellowFromBan,
  variant = 'full',
  className,
}: BanRiskFlagProps) {
  if (!oneYellowFromBan) return null;
  const label = 'One yellow from a ban';
  const title = `${label}: on ${yellowCards} yellow cards, one more booking means a suspension`;

  if (variant === 'icon') {
    return (
      <span title={title} className={cn('inline-flex', className)}>
        <YellowCard />
        <span className="sr-only">{title}</span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex min-w-0 items-start gap-1.5 text-xs', className)}>
      <YellowCard className="mt-px" />
      <span className="min-w-0">
        <span className="text-warning font-semibold">{label}</span>
        <span className="text-muted block">
          On {yellowCards} yellow cards. One more booking means a suspension.
        </span>
      </span>
    </span>
  );
}

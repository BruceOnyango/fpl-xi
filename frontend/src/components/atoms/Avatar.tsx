import { cn } from '@/lib/utils/cn';

export interface AvatarProps {
  /** Full name; initials are derived from it. */
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'h-7 w-7 text-2xs', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Initials avatar. Decorative — the name is always rendered as text beside it. */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'border-border bg-surface-3 text-muted inline-flex shrink-0 items-center justify-center rounded-full border font-bold',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

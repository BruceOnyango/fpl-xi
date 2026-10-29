import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** Longer description for screen readers / tooltip. */
  description?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  /** Accessible group name. */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Radio group styled as a segmented toggle. Arrow keys move and select, with a roving
 * tabindex, matching the WAI-ARIA radio-group pattern.
 */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (current + delta + options.length) % options.length;
    const opt = options[next];
    if (opt) {
      onChange(opt.value);
      refs.current[next]?.focus();
    }
  };

  return (
    // Focus lives on the radios (roving tabindex); the group only handles arrow keys.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('border-border bg-surface-2 inline-flex rounded-lg border p-0.5', className)}
    >
      {options.map((o, i) => {
        const checked = i === current;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={o.description}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              checked ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

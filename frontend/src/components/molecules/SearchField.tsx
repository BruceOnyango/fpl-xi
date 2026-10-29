import { Search, X } from 'lucide-react';
import { useId } from 'react';
import { Input } from '@/components/atoms';
import { cn } from '@/lib/utils/cn';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Visible label text; hidden visually when `hideLabel`. */
  label: string;
  hideLabel?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  label,
  hideLabel = true,
  placeholder,
  className,
}: SearchFieldProps) {
  const id = useId();
  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={id}
        className={cn('text-muted mb-1 block text-xs font-medium', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="text-subtle pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        />
        <Input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && value) {
              e.preventDefault();
              onChange('');
            }
          }}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-muted hover:text-text absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded"
            aria-label="Clear search"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'border-border bg-surface-2 text-text h-10 w-full rounded-md border px-3 text-sm',
        'placeholder:text-subtle focus-visible:border-focus',
        invalid && 'border-negative',
        className,
      )}
      {...props}
    />
  );
});

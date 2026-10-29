import { cn } from '@/lib/utils/cn';

export type FormTier = 'hot' | 'steady' | 'cold';

/** FPL "form" is points-per-game over ~30 days. Thresholds are a UI convention. */
export function formTier(form: number): FormTier {
  if (form >= 6) return 'hot';
  if (form >= 3) return 'steady';
  return 'cold';
}

const styles: Record<FormTier, { dot: string; label: string; glyph: string }> = {
  hot: { dot: 'bg-positive', label: 'Hot form', glyph: '▲' },
  steady: { dot: 'bg-warning', label: 'Steady form', glyph: '●' },
  cold: { dot: 'bg-negative', label: 'Cold form', glyph: '▼' },
};

export interface FormDotProps {
  form: number;
  /** Show the numeric value next to the dot. */
  showValue?: boolean;
  className?: string;
}

/** Form indicator — a glyph + value carry the meaning, the colour just reinforces it (§7). */
export function FormDot({ form, showValue = true, className }: FormDotProps) {
  const tier = styles[formTier(form)];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)} title={tier.label}>
      <span aria-hidden className={cn('inline-block h-2 w-2 rounded-full', tier.dot)} />
      <span aria-hidden className="text-2xs text-muted">
        {tier.glyph}
      </span>
      <span className="sr-only">{tier.label}:</span>
      {showValue ? <span className="tabular">{form.toFixed(1)}</span> : null}
    </span>
  );
}

import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils/cn';

export interface PriceTagProps {
  /** £m */
  price: number;
  className?: string;
}

export function PriceTag({ price, className }: PriceTagProps) {
  return (
    <span className={cn('tabular text-muted text-sm font-medium', className)}>
      <span className="sr-only">Price </span>
      {formatPrice(price)}
    </span>
  );
}

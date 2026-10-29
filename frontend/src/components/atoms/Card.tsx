import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** `section` when the card has its own heading (default), `div` for purely visual grouping. */
  as?: 'section' | 'div' | 'article';
}

/** The base surface every dashboard panel sits on. */
export function Card({ as: Tag = 'section', className, ...props }: CardProps) {
  return (
    <Tag
      className={cn('border-border bg-surface rounded-xl border shadow-sm', className)}
      {...props}
    />
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Heading level for document outline; the page owns the h1. */
  level?: 2 | 3;
  description?: ReactNode;
  /** Right-aligned slot: actions, freshness, badges. */
  actions?: ReactNode;
  id?: string;
  className?: string;
}

export function CardHeader({
  title,
  level = 2,
  description,
  actions,
  id,
  className,
}: CardHeaderProps) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0">
        <H id={id} className="font-display text-lg leading-tight font-bold tracking-wide uppercase">
          {title}
        </H>
        {description ? <p className="text-muted mt-0.5 text-xs">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface PageLayoutProps {
  /** The page's one <h1>. */
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right-aligned header controls (horizon toggle, filters). */
  actions?: ReactNode;
  /** Full-width strip under the header (freshness banners). */
  banner?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  eyebrow,
  description,
  actions,
  banner,
  children,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-accent-text text-xs font-semibold tracking-widest uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-3xl leading-tight font-bold tracking-wide uppercase">
            {title}
          </h1>
          {description ? <p className="text-muted mt-1 max-w-2xl text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </header>
      {banner}
      {children}
    </div>
  );
}

export interface SplitPaneLayoutProps {
  main: ReactNode;
  aside: ReactNode;
  /** Aside width on large screens. */
  asideWidth?: 'sm' | 'md';
  className?: string;
}

/** Two-column layout that stacks on small screens; aside follows main in reading order. */
export function SplitPaneLayout({
  main,
  aside,
  asideWidth = 'md',
  className,
}: SplitPaneLayoutProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        asideWidth === 'sm' ? 'xl:grid-cols-[1fr_20rem]' : 'xl:grid-cols-[1fr_24rem]',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <div className="flex min-w-0 flex-col gap-6">{aside}</div>
    </div>
  );
}

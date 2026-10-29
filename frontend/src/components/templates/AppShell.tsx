import type { ReactNode } from 'react';

export interface AppShellProps {
  /** Brand + primary nav for the desktop sidebar. */
  sidebar: ReactNode;
  topBar: ReactNode;
  /** Shown above page content on every route (e.g. global mock-data notice). */
  notice?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

/** Sidebar + sticky top bar + scrolling main. Layout only; no data. */
export function AppShell({ sidebar, topBar, notice, footer, children }: AppShellProps) {
  return (
    <div className="bg-bg text-text min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <a
        href="#main"
        className="bg-accent text-accent-contrast sr-only z-[var(--z-toast)] rounded-md px-3 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="border-border bg-surface sticky top-0 hidden h-dvh flex-col gap-8 border-r px-4 py-5 lg:flex">
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-col">
        {topBar}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8"
        >
          {notice}
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}

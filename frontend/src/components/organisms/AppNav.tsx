import {
  ArrowLeftRight,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Shirt,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-team', label: 'My Team', icon: Shirt },
  { to: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/fixtures', label: 'Fixtures', icon: CalendarDays },
  { to: '/leagues', label: 'Leagues', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export interface AppNavProps {
  /** Called after navigating (closes the mobile drawer). */
  onNavigate?: () => void;
  className?: string;
}

/** Primary navigation. Used as the desktop sidebar and inside the mobile drawer. */
export function AppNav({ onNavigate, className }: AppNavProps) {
  return (
    <nav aria-label="Main" className={cn('flex flex-col gap-1', className)}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-accent-soft text-accent-text'
                    : 'text-muted hover:bg-surface-2 hover:text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'h-5 w-1 rounded-full',
                      isActive ? 'bg-accent' : 'bg-transparent',
                    )}
                  />
                  <Icon aria-hidden className="h-[18px] w-[18px]" />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Brand lockup shown above the nav. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="bg-accent text-accent-contrast flex h-9 w-9 items-center justify-center rounded-lg"
      >
        <svg
          viewBox="0 0 32 32"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="16" cy="16" r="10" />
          <path d="M16 6v20M6 16h20" strokeWidth="2" />
        </svg>
      </span>
      <span className="font-display text-xl leading-none font-bold tracking-wide uppercase">
        FPL<span className="text-accent-text"> XI</span>
      </span>
    </span>
  );
}

import * as Dialog from '@radix-ui/react-dialog';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/components/atoms';
import { useMeta } from '@/lib/api/hooks';
import { countdownTo } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { AppNav, Brand } from './AppNav';

/**
 * Sticky header: mobile menu, next-deadline summary, team chip and theme toggle.
 * Reads meta through useMeta — never fetches directly.
 */
export function TopBar() {
  const meta = useMeta();
  const { settings, update, resolvedTheme } = useSettings();
  const [open, setOpen] = useState(false);

  const deadline = meta.data ? new Date(meta.data.nextDeadline) : null;
  const c = deadline ? countdownTo(deadline) : null;

  return (
    <header className="border-border bg-bg/85 sticky top-0 z-[var(--z-nav)] flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu aria-hidden className="h-5 w-5" />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50" />
          <Dialog.Content className="border-border bg-surface fixed inset-y-0 left-0 z-[var(--z-modal)] flex w-72 max-w-[85vw] flex-col gap-6 border-r p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <Dialog.Title asChild>
                <span>
                  <Brand />
                </span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close navigation">
                  <X aria-hidden className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
            <AppNav onNavigate={() => setOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Brand className="lg:hidden" />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {meta.isPending ? (
          <Skeleton className="h-6 w-36" />
        ) : meta.data && c ? (
          <p className="hidden items-center gap-2 text-sm sm:flex">
            <span className="text-muted">GW {meta.data.nextGw} deadline</span>
            <Badge
              tone={!c.passed && c.days === 0 ? 'negative' : 'neutral'}
              className="tabular normal-case"
            >
              {c.passed
                ? 'passed'
                : c.days > 0
                  ? `${c.days}d ${c.hours}h`
                  : `${c.hours}h ${c.minutes}m`}
            </Badge>
          </p>
        ) : null}
        {settings.teamId ? (
          <Link
            to="/settings"
            className="border-border text-muted hover:text-text hidden rounded-md border px-2.5 py-1 text-xs font-semibold md:inline-block"
          >
            Team #{settings.teamId}
          </Link>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link to="/settings">Add team ID</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {resolvedTheme === 'dark' ? (
            <Sun aria-hidden className="h-5 w-5" />
          ) : (
            <Moon aria-hidden className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}

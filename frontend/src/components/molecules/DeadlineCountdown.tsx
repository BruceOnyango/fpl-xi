import { useEffect, useState } from 'react';
import { countdownTo, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils/cn';

export interface DeadlineCountdownProps {
  gw: number;
  deadline: string;
  /** Freeze time (tests/stories). When set the clock does not tick. */
  now?: Date;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function DeadlineCountdown({ gw, deadline, now, className }: DeadlineCountdownProps) {
  const [tick, setTick] = useState(() => now ?? new Date());
  useEffect(() => {
    if (now) return;
    const id = window.setInterval(() => setTick(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [now]);

  const target = new Date(deadline);
  const c = countdownTo(target, now ?? tick);
  const urgent = !c.passed && c.days === 0 && c.hours < 6;
  const units: [number, string, string][] = [
    [c.days, 'd', 'days'],
    [c.hours, 'h', 'hours'],
    [c.minutes, 'm', 'minutes'],
    [c.seconds, 's', 'seconds'],
  ];

  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-muted text-xs font-medium tracking-wide uppercase">GW {gw} deadline</p>
      {c.passed ? (
        <p className="font-display mt-1 text-2xl font-bold">Deadline passed</p>
      ) : (
        <p
          role="timer"
          aria-label={`${c.days} days ${c.hours} hours ${c.minutes} minutes until the gameweek ${gw} deadline`}
          className={cn(
            'tabular font-display mt-1 flex items-baseline gap-1.5 text-2xl font-bold',
            urgent && 'text-negative',
          )}
        >
          {units.map(([v, short], i) => (
            <span key={short} aria-hidden={true}>
              {i === 0 ? v : pad(v)}
              <span className="text-muted ml-0.5 text-sm font-semibold">{short}</span>
            </span>
          ))}
        </p>
      )}
      <p className="text-muted mt-1 text-xs">
        <time dateTime={deadline}>{formatDateTime(target)}</time>
      </p>
    </div>
  );
}

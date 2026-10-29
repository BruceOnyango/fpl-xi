/**
 * User preferences (team ID, theme, default horizon). Client state, not server
 * state — so it lives in Context + localStorage, never in TanStack Query (§8).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { safeStorage } from '@/lib/utils/storage';
import type { Horizon } from '@/lib/api/schemas';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  teamId: number | null;
  theme: ThemePreference;
  horizon: Horizon;
}

const DEFAULTS: Settings = { teamId: null, theme: 'system', horizon: 1 };
const KEY = 'fpl-xi:settings';

function load(): Settings {
  const raw = safeStorage.get(KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      teamId: typeof parsed.teamId === 'number' && parsed.teamId > 0 ? parsed.teamId : null,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system',
      horizon: parsed.horizon === 3 || parsed.horizon === 6 ? parsed.horizon : 1,
    };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** 'light' | 'dark' after resolving 'system'. */
  resolvedTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function SettingsProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /** Override persisted values (tests, Storybook). */
  initial?: Partial<Settings> | undefined;
}) {
  const [settings, setSettings] = useState<Settings>(() =>
    initial ? { ...DEFAULTS, ...initial } : load(),
  );
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const update = useCallback(
    (patch: Partial<Settings>) =>
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (!initial) safeStorage.set(KEY, JSON.stringify(next));
        return next;
      }),
    [initial],
  );

  const value = useMemo(
    () => ({ settings, update, resolvedTheme }),
    [settings, update, resolvedTheme],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

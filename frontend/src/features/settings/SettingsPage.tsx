import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button, Card, CardBody, CardHeader } from '@/components/atoms';
import { DataFreshness, SegmentedControl } from '@/components/molecules';
import { HORIZON_OPTIONS, TeamIdForm } from '@/components/organisms';
import { PageLayout } from '@/components/templates';
import { useMeta } from '@/lib/api/hooks';
import { queryKeys } from '@/lib/api/queryKeys';
import { useSettings, type ThemePreference } from '@/lib/settings';
import { usePageTitle } from '@/lib/utils/usePageTitle';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsPage() {
  usePageTitle('Settings');
  const { settings, update } = useSettings();
  const meta = useMeta();
  const client = useQueryClient();
  const fetching = useIsFetching({ queryKey: queryKeys.all });

  return (
    <PageLayout title="Settings" description="Saved in this browser only.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="team-settings">
          <CardHeader
            id="team-settings"
            title="Your team"
            description="Used to load your squad, leagues and transfer plans."
          />
          <CardBody className="flex flex-col gap-4 pt-4">
            <TeamIdForm submitLabel="Save" showDemo={settings.teamId === null} />
            {settings.teamId !== null ? (
              <Button
                variant="danger"
                size="sm"
                className="self-start"
                onClick={() => update({ teamId: null })}
              >
                Forget team ID
              </Button>
            ) : null}
          </CardBody>
        </Card>

        <Card aria-labelledby="display-settings">
          <CardHeader id="display-settings" title="Display" />
          <CardBody className="flex flex-col gap-5 pt-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Theme</span>
              <SegmentedControl
                label="Theme"
                options={THEMES}
                value={settings.theme}
                onChange={(theme) => update({ theme })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Default prediction horizon</span>
              <SegmentedControl
                label="Default prediction horizon"
                options={HORIZON_OPTIONS}
                value={settings.horizon}
                onChange={(horizon) => update({ horizon })}
              />
              <p className="text-muted text-xs">
                Longer horizons average out single-match noise (backtest Spearman ≈0.27 at 1 GW,
                ≈0.47 at 6 GW) and are the better basis for transfers. Captaincy always uses the
                next gameweek.
              </p>
            </div>
          </CardBody>
        </Card>

        <Card aria-labelledby="data-settings" className="lg:col-span-2">
          <CardHeader
            id="data-settings"
            title="Data"
            description="The backend pulls from the FPL API on a schedule; this only re-reads from it."
          />
          <CardBody className="flex flex-wrap items-center justify-between gap-4 pt-4">
            {meta.data ? (
              <DataFreshness
                dataFetchedAt={meta.data.dataFetchedAt}
                predictionsGeneratedAt={meta.data.predictionsGeneratedAt}
                source={meta.data.source}
                nextDeadline={meta.data.nextDeadline}
              />
            ) : (
              <span className="text-muted text-sm">Loading data status…</span>
            )}
            <Button
              variant="secondary"
              onClick={() => void client.invalidateQueries({ queryKey: queryKeys.all })}
              disabled={fetching > 0}
            >
              <RefreshCw
                aria-hidden
                className={fetching > 0 ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              />
              {fetching > 0 ? 'Refreshing…' : 'Reload from server'}
            </Button>
          </CardBody>
        </Card>
      </div>
    </PageLayout>
  );
}

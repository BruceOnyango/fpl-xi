import { SegmentedControl, type SegmentOption } from '@/components/molecules';
import type { Horizon } from '@/lib/api/schemas';
import { useSettings } from '@/lib/settings';

export const HORIZON_OPTIONS: readonly SegmentOption<Horizon>[] = [
  { value: 1, label: '1 GW', description: 'Next gameweek only — noisiest' },
  { value: 3, label: '3 GW', description: 'Next three gameweeks' },
  { value: 6, label: '6 GW', description: 'Next six gameweeks — best basis for transfers' },
];

export function horizonLabel(h: Horizon): string {
  return h === 1 ? 'next GW' : `next ${h} GWs`;
}

/** Prediction-horizon switch bound to user settings, shared by every prediction page. */
export function HorizonToggle({ className }: { className?: string }) {
  const { settings, update } = useSettings();
  return (
    <SegmentedControl
      label="Prediction horizon"
      options={HORIZON_OPTIONS}
      value={settings.horizon}
      onChange={(horizon) => update({ horizon })}
      size="sm"
      className={className}
    />
  );
}

import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatTile } from './StatTile';

const meta = { title: 'Molecules/StatTile' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const StatTiles: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-3 gap-4">
      <StatTile label="Projected" value="61.4" hint="range 34–96" tone="accent" />
      <StatTile label="Last GW" value="54" delta={{ value: 8, unit: 'pts', digits: 0 }} />
      <StatTile label="Rank" value="1.2M" loading />
    </div>
  ),
};

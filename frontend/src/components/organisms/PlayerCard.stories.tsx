import type { Meta, StoryObj } from '@storybook/react-vite';
import { fixturesFrom, teamShort, topPlayers } from '@/test/fixtures';
import { fixturesForTeam } from '@/lib/fpl/fixtures';
import { PlayerCard } from './PlayerCard';

const p = topPlayers(1)[0]!;

const meta = {
  title: 'Organisms/PlayerCard',
  component: PlayerCard,
  args: {
    player: p,
    teamShort,
    fixtures: fixturesForTeam(fixturesFrom(10, 5), p.teamId),
    predictionMax: 20,
    horizonLabel: 'next GW',
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Removable: Story = { args: { onRemove: () => {} } };
export const Injured: Story = {
  args: {
    player: { ...p, status: 'i', chanceOfPlaying: 0, news: 'Ankle injury - Unknown return date' },
  },
};
export const NoFixtures: Story = { args: { fixtures: [] } };

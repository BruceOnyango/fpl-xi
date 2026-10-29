import type { Meta, StoryObj } from '@storybook/react-vite';
import { teamShort, topPlayers } from '@/test/fixtures';
import { FlaggedPlayers } from './FlaggedPlayers';

const players = topPlayers(6);
const flagged = [
  {
    ...players[0]!,
    status: 'i' as const,
    chanceOfPlaying: 0,
    news: 'Hamstring injury - Expected back 14 Nov',
  },
  {
    ...players[1]!,
    status: 'd' as const,
    chanceOfPlaying: 50,
    news: 'Knock - 50% chance of playing',
  },
  ...players.slice(2).map((p) => ({ ...p, status: 'a' as const, chanceOfPlaying: null })),
];

const meta = {
  title: 'Organisms/FlaggedPlayers',
  component: FlaggedPlayers,
  args: { players: flagged, teamShort },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FlaggedPlayers>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithFlags: Story = {};
export const Empty: Story = { args: { players: flagged.slice(2) } };

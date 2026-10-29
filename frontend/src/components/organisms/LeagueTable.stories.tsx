import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEMO_TEAM, league } from '@/test/fixtures';
import { LeagueTable } from './LeagueTable';

const meta = {
  title: 'Organisms/LeagueTable',
  component: LeagueTable,
  args: { league: league(), selfEntryId: DEMO_TEAM },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LeagueTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NotInLeague: Story = { args: { selfEntryId: null } };

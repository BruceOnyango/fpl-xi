import type { Meta, StoryObj } from '@storybook/react-vite';
import { allTeams, fixturesFrom } from '@/test/fixtures';
import { FixtureTicker } from './FixtureTicker';

const meta = {
  title: 'Organisms/FixtureTicker',
  component: FixtureTicker,
  args: {
    teams: allTeams,
    fixtures: fixturesFrom(10, 5),
    fromGw: 10,
    toGw: 14,
    caption: 'Fixture difficulty, GW 10–14',
  },
} satisfies Meta<typeof FixtureTicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Alphabetical: Story = {};
export const EasiestFirst: Story = { args: { sortByEase: true } };
export const Highlighted: Story = {
  args: { highlight: new Set([allTeams[0]!.id, allTeams[3]!.id]) },
};
export const WithBlanks: Story = {
  args: { fixtures: fixturesFrom(10, 5).filter((f) => f.gw !== 12) },
};

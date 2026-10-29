import type { Meta, StoryObj } from '@storybook/react-vite';
import { BlankFixtureChip, FixtureChip } from './FixtureChip';

const meta = { title: 'Molecules/FixtureChip' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const FixtureChips: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <FixtureChip opponentShort="SHU" home difficulty={1} />
      <FixtureChip opponentShort="BRE" home={false} difficulty={2} />
      <FixtureChip opponentShort="FUL" home difficulty={3} />
      <FixtureChip opponentShort="LIV" home={false} difficulty={4} />
      <FixtureChip opponentShort="MCI" home={false} difficulty={5} />
      <BlankFixtureChip />
      <FixtureChip opponentShort="ARS" home difficulty={4} size="sm" />
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerName } from './PlayerName';

const meta = { title: 'Molecules/PlayerName' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const PlayerNameStory: Story = {
  render: () => (
    <PlayerName
      name="Haaland"
      fullName="Erling Haaland"
      teamShort="MCI"
      position="FWD"
      meta="£15.7m"
    />
  ),
};

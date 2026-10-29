import type { Meta, StoryObj } from '@storybook/react-vite';
import { AvailabilityFlag } from './AvailabilityFlag';

const meta = { title: 'Molecules/AvailabilityFlag' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Availability: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <AvailabilityFlag status="a" chanceOfPlaying={null} />
      <AvailabilityFlag status="d" chanceOfPlaying={75} news="Knock - 75% chance of playing" />
      <AvailabilityFlag
        status="i"
        chanceOfPlaying={0}
        news="Hamstring injury - Expected back 14 Nov"
      />
    </div>
  ),
};

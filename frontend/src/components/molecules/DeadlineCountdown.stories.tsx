import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeadlineCountdown } from './DeadlineCountdown';

const meta = { title: 'Molecules/DeadlineCountdown' } satisfies Meta;
export default meta;
type Story = StoryObj;

const NOW = new Date('2026-10-30T12:00:00Z');

export const Countdown: Story = {
  render: () => (
    <DeadlineCountdown
      gw={10}
      deadline={new Date(NOW.getTime() + 2.3 * 86_400_000).toISOString()}
      now={NOW}
    />
  ),
};

export const CountdownUrgent: Story = {
  render: () => (
    <DeadlineCountdown
      gw={10}
      deadline={new Date(NOW.getTime() + 2 * 3_600_000).toISOString()}
      now={NOW}
    />
  ),
};

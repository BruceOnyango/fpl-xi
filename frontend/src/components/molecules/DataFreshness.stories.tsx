import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataFreshness } from './DataFreshness';

const meta = { title: 'Molecules/DataFreshness' } satisfies Meta;
export default meta;
type Story = StoryObj;

const NOW = new Date('2026-10-30T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

export const FreshnessOk: Story = {
  render: () => (
    <DataFreshness
      dataFetchedAt={hoursAgo(2)}
      predictionsGeneratedAt={hoursAgo(1)}
      source="live"
      now={NOW}
    />
  ),
};

export const FreshnessNearDeadline: Story = {
  render: () => (
    <DataFreshness
      dataFetchedAt={hoursAgo(5)}
      source="live"
      nextDeadline={new Date(NOW.getTime() + 4 * 3_600_000).toISOString()}
      now={NOW}
    />
  ),
};

export const FreshnessStaleBanner: Story = {
  render: () => (
    <DataFreshness dataFetchedAt={hoursAgo(80)} source="mock" now={NOW} variant="banner" />
  ),
};

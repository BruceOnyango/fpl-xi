import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/atoms';
import { EmptyState, ErrorState, QueryState } from './StateViews';

const meta = { title: 'Molecules/StateViews' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const States: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-4">
      <EmptyState
        title="No team ID yet"
        description="Add your FPL team ID to load your squad."
        action={<Button size="sm">Add team ID</Button>}
      />
      <ErrorState
        message="Couldn't reach the server. Check your connection and try again."
        onRetry={() => {}}
      />
      <QueryState
        query={{ isPending: true, isError: false, error: null, refetch: () => {} }}
        loading={<p>Loading skeleton…</p>}
      >
        content
      </QueryState>
    </div>
  ),
};

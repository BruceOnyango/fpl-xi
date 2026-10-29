import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { teamShort, topPlayers } from '@/test/fixtures';
import { PlayerTable } from './PlayerTable';

const players = topPlayers(200);

const meta = {
  title: 'Organisms/PlayerTable',
  component: PlayerTable,
  args: { players, teamShort, caption: 'Top 200 players' },
} satisfies Meta<typeof PlayerTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithComparison: Story = {
  render: function Render(args) {
    const [ids, setIds] = useState<Set<number>>(new Set());
    return (
      <PlayerTable
        {...args}
        compareIds={ids}
        onToggleCompare={(id) =>
          setIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
      />
    );
  },
};
export const SortedByPrice: Story = { args: { initialSorting: [{ id: 'price', desc: true }] } };

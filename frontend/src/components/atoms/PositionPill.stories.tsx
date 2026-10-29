import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Position } from '@/lib/api/schemas';
import { PositionPill } from './PositionPill';

const meta = {
  title: 'Atoms/PositionPill',
  component: PositionPill,
  args: { position: 'MID' },
} satisfies Meta<typeof PositionPill>;
export default meta;
type Story = StoryObj<typeof meta>;

const positions: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

export const All: Story = {
  render: () => (
    <div className="flex gap-2">
      {positions.map((p) => (
        <PositionPill key={p} position={p} />
      ))}
    </div>
  ),
};
export const Midfielder: Story = {};

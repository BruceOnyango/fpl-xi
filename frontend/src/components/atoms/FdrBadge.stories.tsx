import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Difficulty } from '@/lib/fpl/fixtures';
import { FdrBadge } from './FdrBadge';

const meta = {
  title: 'Atoms/FdrBadge',
  component: FdrBadge,
  args: { difficulty: 2 },
} satisfies Meta<typeof FdrBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

const scale: Difficulty[] = [1, 2, 3, 4, 5];

export const Scale: Story = {
  render: () => (
    <div className="flex gap-2">
      {scale.map((d) => (
        <FdrBadge key={d} difficulty={d} />
      ))}
    </div>
  ),
};
export const Easy: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Meter } from './Meter';

const meta = {
  title: 'Atoms/Meter',
  component: Meter,
  args: { value: 75, label: 'Chance of playing' },
  decorators: [
    (Story) => (
      <div className="w-60">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Meter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Warning: Story = { args: { value: 50, tone: 'warning' } };
export const Negative: Story = { args: { value: 25, tone: 'negative' } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stat } from './Stat';

const meta = {
  title: 'Atoms/Stat',
  component: Stat,
  args: { label: 'Projected', value: '58.2', hint: 'range 31–92' },
} satisfies Meta<typeof Stat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 'lg' } };

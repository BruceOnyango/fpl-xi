import type { Meta, StoryObj } from '@storybook/react-vite';
import { Delta } from './Delta';

const meta = {
  title: 'Atoms/Delta',
  component: Delta,
  args: { value: 3.4, unit: 'pts' },
} satisfies Meta<typeof Delta>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Up: Story = {};
export const Down: Story = { args: { value: -2.1 } };
export const Flat: Story = { args: { value: 0 } };
export const RankImproved: Story = { args: { value: -12000, invert: true, digits: 0 } };

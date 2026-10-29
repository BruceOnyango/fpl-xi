import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriceTag } from './PriceTag';

const meta = {
  title: 'Atoms/PriceTag',
  component: PriceTag,
  args: { price: 7.5 },
} satisfies Meta<typeof PriceTag>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Premium: Story = { args: { price: 15.7 } };

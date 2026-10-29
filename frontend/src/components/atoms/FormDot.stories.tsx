import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormDot } from './FormDot';

const meta = {
  title: 'Atoms/FormDot',
  component: FormDot,
  args: { form: 6.4 },
} satisfies Meta<typeof FormDot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Hot: Story = {};
export const Steady: Story = { args: { form: 4.1 } };
export const Cold: Story = { args: { form: 1.2 } };
export const DotOnly: Story = { args: { showValue: false } };

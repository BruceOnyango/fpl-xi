import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  args: { placeholder: 'e.g. 8350133', 'aria-label': 'Team ID' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { invalid: true, defaultValue: 'abc' } };
export const Disabled: Story = { args: { disabled: true } };

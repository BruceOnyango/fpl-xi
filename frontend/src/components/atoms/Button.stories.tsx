import type { Meta, StoryObj } from '@storybook/react-vite';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { children: 'Save team' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Reset transfers' } };
export const Small: Story = { args: { size: 'sm' } };
export const Icon: Story = {
  args: {
    size: 'icon',
    variant: 'ghost',
    'aria-label': 'Refresh',
    children: <RefreshCw className="h-4 w-4" />,
  },
};
export const Disabled: Story = { args: { disabled: true } };

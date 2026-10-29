import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, type BadgeTone } from './Badge';

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  args: { children: 'Mock data' },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

const tones: BadgeTone[] = [
  'neutral',
  'accent',
  'secondary',
  'positive',
  'negative',
  'warning',
  'info',
];

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {tones.map((t) => (
        <Badge key={t} tone={t}>
          {t}
        </Badge>
      ))}
    </div>
  ),
};
export const Warning: Story = { args: { tone: 'warning' } };

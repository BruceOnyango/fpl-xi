import type { Meta, StoryObj } from '@storybook/react-vite';
import { teamShort, topPlayers } from '@/test/fixtures';
import { TransferRow } from './TransferRow';

const [a, b] = topPlayers(40).filter((p) => p.position === 'MID');

const meta = {
  title: 'Organisms/TransferRow',
  component: TransferRow,
  args: {
    out: b!,
    in: a!,
    sellingPrice: b!.price,
    teamShort,
    horizonLabel: 'next GW',
    onRemove: () => {},
  },
  decorators: [
    (Story) => (
      <ul className="max-w-xl">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof TransferRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Upgrade: Story = {};
export const Downgrade: Story = { args: { out: a!, in: b!, sellingPrice: a!.price } };

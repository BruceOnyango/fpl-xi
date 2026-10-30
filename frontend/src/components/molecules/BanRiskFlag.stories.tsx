import type { Meta, StoryObj } from '@storybook/react-vite';
import { BanRiskFlag } from './BanRiskFlag';

const meta = { title: 'Molecules/BanRiskFlag' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const BanRisk: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <BanRiskFlag yellowCards={4} oneYellowFromBan />
      <BanRiskFlag yellowCards={9} oneYellowFromBan variant="compact" />
      <BanRiskFlag yellowCards={9} oneYellowFromBan variant="icon" />
    </div>
  ),
};

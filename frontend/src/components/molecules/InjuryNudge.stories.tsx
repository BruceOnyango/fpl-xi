import type { Meta, StoryObj } from '@storybook/react-vite';
import { InjuryNudge } from './InjuryNudge';

const meta = { title: 'Molecules/InjuryNudge' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Nudge: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <InjuryNudge />
      <InjuryNudge compact />
    </div>
  ),
};

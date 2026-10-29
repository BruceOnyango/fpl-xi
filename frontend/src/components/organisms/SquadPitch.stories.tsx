import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { squadView } from '@/test/fixtures';
import { SquadPitch } from './SquadPitch';

const view = squadView();

const meta = {
  title: 'Organisms/SquadPitch',
  component: SquadPitch,
  args: {
    starters: view.starters,
    bench: view.bench,
    captainId: view.lineup.captainId,
    viceCaptainId: view.lineup.viceCaptainId,
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SquadPitch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoBench: Story = { args: { bench: [] } };
export const Selectable: Story = {
  render: function Render(args) {
    const [selected, setSelected] = useState<number | null>(null);
    return <SquadPitch {...args} onSelectPlayer={setSelected} selectedId={selected} />;
  },
};

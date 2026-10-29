import type { Meta, StoryObj } from '@storybook/react-vite';
import { PredictionRange } from './PredictionRange';

const meta = { title: 'Molecules/PredictionRange' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Range: Story = {
  render: () => (
    <div className="w-72 space-y-3">
      <PredictionRange prediction={{ points: 6.2, low: 2.1, high: 11.8 }} max={14} />
      <PredictionRange prediction={{ points: 2.4, low: 0.8, high: 5.1 }} max={14} />
    </div>
  ),
};

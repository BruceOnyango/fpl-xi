import type { Meta, StoryObj } from '@storybook/react-vite';
import { ModelConfidence } from './ModelConfidence';

/** Fetches through the mock API (started in .storybook/preview.tsx). */
const meta = {
  title: 'Organisms/ModelConfidence',
  component: ModelConfidence,
  args: { horizon: 1 },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ModelConfidence>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OneGameweek: Story = {};
export const SixGameweeks: Story = { args: { horizon: 6 } };

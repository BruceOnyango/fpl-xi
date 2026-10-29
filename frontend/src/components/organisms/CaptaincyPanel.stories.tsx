import type { Meta, StoryObj } from '@storybook/react-vite';
import { squadView } from '@/test/fixtures';
import { CaptaincyPanel } from './CaptaincyPanel';

const view = squadView();

const meta = {
  title: 'Organisms/CaptaincyPanel',
  component: CaptaincyPanel,
  args: {
    candidates: view.captainPool,
    captainId: view.lineup.captainId,
    viceCaptainId: view.lineup.viceCaptainId,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CaptaincyPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TopThree: Story = { args: { limit: 3 } };

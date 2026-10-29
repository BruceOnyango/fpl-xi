import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppNav, Brand } from './AppNav';

const meta = {
  title: 'Organisms/AppNav',
  component: AppNav,
  decorators: [
    (Story) => (
      <div className="bg-surface flex w-60 flex-col gap-8 p-4">
        <Brand />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppNav>;
export default meta;

export const Sidebar: StoryObj<typeof meta> = {};

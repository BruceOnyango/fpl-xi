import type { Meta, StoryObj } from '@storybook/react-vite';
import { TeamIdForm } from './TeamIdForm';

const meta = { title: 'Organisms/TeamIdForm', component: TeamIdForm } satisfies Meta<
  typeof TeamIdForm
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SettingsVariant: Story = { args: { submitLabel: 'Save', showDemo: false } };

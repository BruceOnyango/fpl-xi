import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopBar } from './TopBar';

/** Reads meta through the mock API; resize the canvas to see the mobile menu button. */
const meta = { title: 'Organisms/TopBar', component: TopBar } satisfies Meta<typeof TopBar>;
export default meta;

export const Default: StoryObj<typeof meta> = {};

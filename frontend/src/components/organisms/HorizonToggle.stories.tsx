import type { Meta, StoryObj } from '@storybook/react-vite';
import { HorizonToggle } from './HorizonToggle';

const meta = { title: 'Organisms/HorizonToggle', component: HorizonToggle } satisfies Meta<
  typeof HorizonToggle
>;
export default meta;

export const Default: StoryObj<typeof meta> = {};

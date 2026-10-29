import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { GameweekSelector } from './GameweekSelector';

const meta = { title: 'Molecules/GameweekSelector' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Gameweek: Story = {
  render: function Render() {
    const [gw, setGw] = useState(10);
    return <GameweekSelector gw={gw} onChange={setGw} />;
  },
};

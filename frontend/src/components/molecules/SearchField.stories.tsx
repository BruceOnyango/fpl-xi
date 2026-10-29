import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './SearchField';

const meta = { title: 'Molecules/SearchField' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Search: Story = {
  render: function Render() {
    const [v, setV] = useState('Saka');
    return (
      <SearchField label="Search players" value={v} onChange={setV} placeholder="Search players" />
    );
  },
};

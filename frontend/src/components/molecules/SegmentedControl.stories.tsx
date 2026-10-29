import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';

const meta = { title: 'Molecules/SegmentedControl' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Segmented: Story = {
  render: function Render() {
    const [h, setH] = useState<1 | 3 | 6>(1);
    return (
      <SegmentedControl
        label="Horizon"
        value={h}
        onChange={setH}
        options={[
          { value: 1, label: '1 GW' },
          { value: 3, label: '3 GW' },
          { value: 6, label: '6 GW' },
        ]}
      />
    );
  },
};

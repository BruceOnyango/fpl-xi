import type { Meta, StoryObj } from '@storybook/react-vite';
import { AvailabilityFlag } from './AvailabilityFlag';
import { FixtureChip } from './FixtureChip';
import { PitchPlayer } from './PitchPlayer';

const meta = { title: 'Molecules/PitchPlayer' } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Pitch: Story = {
  render: () => (
    <div className="bg-pitch-1 flex gap-4 rounded-xl p-6">
      <PitchPlayer
        name="Haaland"
        teamShort="MCI"
        position="FWD"
        predicted={7.8}
        armband="C"
        fixture={<FixtureChip opponentShort="BRE" home difficulty={2} size="sm" />}
      />
      <PitchPlayer
        name="Saka"
        teamShort="ARS"
        position="MID"
        predicted={5.6}
        armband="V"
        onSelect={() => {}}
      />
      <PitchPlayer
        name="Gabriel"
        teamShort="ARS"
        position="DEF"
        predicted={1.2}
        flag={<AvailabilityFlag status="d" chanceOfPlaying={50} variant="icon" />}
        dimmed
      />
    </div>
  ),
};

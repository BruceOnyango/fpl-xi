import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';
import { Card, CardBody, CardHeader } from './Card';

const meta = { title: 'Atoms/Card', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithHeader: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader
        title="Captaincy"
        description="Single-gameweek projection"
        actions={<Badge tone="accent">GW 10</Badge>}
      />
      <CardBody>Panel content</CardBody>
    </Card>
  ),
};
export const Plain: Story = { args: { as: 'div', className: 'p-5', children: 'Just a surface' } };

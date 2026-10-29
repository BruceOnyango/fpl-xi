import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardBody, CardHeader } from '@/components/atoms';
import { AppShell } from './AppShell';
import { PageLayout, SplitPaneLayout } from './PageLayout';

/** Templates are layout only — these stories use placeholder blocks, never real data. */
const meta = { title: 'Templates/Layouts' } satisfies Meta;
export default meta;
type Story = StoryObj;

const Block = ({ label, h = 'h-40' }: { label: string; h?: string }) => (
  <Card as="div" className={`${h} text-muted flex items-center justify-center text-sm`}>
    {label}
  </Card>
);

export const Shell: Story = {
  render: () => (
    <AppShell
      sidebar={<p className="font-semibold">Sidebar slot</p>}
      topBar={<div className="border-border h-16 border-b px-6 py-5 text-sm">Top bar slot</div>}
      footer={<div className="border-border border-t px-6 py-4 text-xs">Footer slot</div>}
    >
      <Block label="Page content" h="h-96" />
    </AppShell>
  ),
};

export const Page: Story = {
  render: () => (
    <PageLayout
      eyebrow="Gameweek 10"
      title="Page title"
      description="One h1 per page, set here."
      actions={<Block label="actions" h="h-8" />}
    >
      <Block label="content" />
    </PageLayout>
  ),
};

export const SplitPane: Story = {
  render: () => (
    <SplitPaneLayout
      main={<Block label="main" h="h-96" />}
      aside={
        <Card>
          <CardHeader title="Aside" />
          <CardBody>Stacks under main below xl.</CardBody>
        </Card>
      }
    />
  ),
};

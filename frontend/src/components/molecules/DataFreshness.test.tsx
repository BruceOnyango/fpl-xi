import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { DataFreshness } from './index';

const NOW = new Date('2026-10-30T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe('DataFreshness', () => {
  it('shows relative age and a mock badge', async () => {
    const { container } = render(
      <DataFreshness
        dataFetchedAt={hoursAgo(2)}
        predictionsGeneratedAt={hoursAgo(1)}
        source="mock"
        now={NOW}
      />,
    );
    expect(container).toHaveTextContent('Data pulled 2 hours ago · model run 1 hour ago');
    expect(screen.getByText('Mock data')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('escalates to a stale banner', () => {
    render(<DataFreshness dataFetchedAt={hoursAgo(72)} source="live" now={NOW} variant="banner" />);
    expect(screen.getByRole('status')).toHaveTextContent('This data is stale.');
  });

  it('renders no banner when fresh', () => {
    const { container } = render(
      <DataFreshness dataFetchedAt={hoursAgo(1)} source="live" now={NOW} variant="banner" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

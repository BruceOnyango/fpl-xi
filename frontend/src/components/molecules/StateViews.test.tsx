import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { EmptyState, ErrorState, QueryState } from './index';

describe('State views', () => {
  it('error state retries', async () => {
    const onRetry = vi.fn();
    const { container } = render(<ErrorState message="Boom" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it('empty state offers an action', () => {
    render(<EmptyState title="No squad" action={<button type="button">Add team ID</button>} />);
    expect(screen.getByRole('button', { name: 'Add team ID' })).toBeInTheDocument();
  });

  it('QueryState routes each status', () => {
    const base = { isPending: false, isError: false, error: null, refetch: () => {} };
    const { rerender } = render(
      <QueryState query={{ ...base, isPending: true }} loading={<p>loading</p>}>
        content
      </QueryState>,
    );
    expect(screen.getByText('loading')).toBeInTheDocument();
    rerender(
      <QueryState query={{ ...base, isError: true, error: new Error('nope') }} loading={null}>
        content
      </QueryState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('nope');
    rerender(
      <QueryState query={base} loading={null} isEmpty empty={<p>empty</p>}>
        content
      </QueryState>,
    );
    expect(screen.getByText('empty')).toBeInTheDocument();
    rerender(
      <QueryState query={base} loading={null}>
        content
      </QueryState>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

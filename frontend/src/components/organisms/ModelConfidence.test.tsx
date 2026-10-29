import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { expectNoA11yViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { ModelConfidence } from './ModelConfidence';

describe('ModelConfidence', () => {
  it('states the real headline numbers and offers a table fallback', async () => {
    const { container } = renderWithProviders(<ModelConfidence horizon={1} />);
    expect(await screen.findByText('0.27 ± 0.10')).toBeInTheDocument();
    expect(screen.getByText('Mock series')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show table' }));
    expect(screen.getByRole('table', { name: /model vs persistence/ })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('shows a retryable error', async () => {
    server.use(http.get('*/model/backtest', () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<ModelConfidence horizon={1} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('(500)');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

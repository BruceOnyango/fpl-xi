import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { renderWithProviders } from '@/test/render';
import { DEMO_TEAM_ID, TeamIdForm } from './TeamIdForm';

describe('TeamIdForm', () => {
  it('rejects non-numeric IDs with a linked error', async () => {
    const onSaved = vi.fn();
    const { container } = renderWithProviders(<TeamIdForm onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText('FPL team ID'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Load my team' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('numbers only');
    expect(screen.getByLabelText('FPL team ID')).toHaveAttribute('aria-invalid', 'true');
    expect(onSaved).not.toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it('saves a valid ID and offers a demo team', async () => {
    const onSaved = vi.fn();
    renderWithProviders(<TeamIdForm onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText('FPL team ID'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Load my team' }));
    expect(onSaved).toHaveBeenCalledWith(123456);
    await userEvent.click(screen.getByRole('button', { name: 'Or try a demo team' }));
    expect(onSaved).toHaveBeenLastCalledWith(DEMO_TEAM_ID);
  });
});

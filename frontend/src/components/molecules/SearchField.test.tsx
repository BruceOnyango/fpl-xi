import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expectNoA11yViolations } from '@/test/axe';
import { SearchField } from './index';

describe('SearchField', () => {
  function Harness() {
    const [v, setV] = useState('');
    return <SearchField label="Search players" value={v} onChange={setV} />;
  }
  it('types, clears with Escape and with the button', async () => {
    const { container } = render(<Harness />);
    const box = screen.getByRole('searchbox', { name: 'Search players' });
    await userEvent.type(box, 'salah');
    expect(box).toHaveValue('salah');
    await userEvent.keyboard('{Escape}');
    expect(box).toHaveValue('');
    await userEvent.type(box, 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(box).toHaveValue('');
    await expectNoA11yViolations(container);
  });
});

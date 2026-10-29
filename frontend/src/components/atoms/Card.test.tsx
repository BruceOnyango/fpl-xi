import { render, screen } from '@testing-library/react';
import { expectNoA11yViolations } from '@/test/axe';
import { Card, CardBody, CardHeader } from './Card';

describe('Card', () => {
  it('renders heading at the requested level and labels the region', async () => {
    const { container } = render(
      <Card aria-labelledby="t">
        <CardHeader id="t" title="Fixtures" level={3} />
        <CardBody>Body</CardBody>
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Fixtures' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Fixtures' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

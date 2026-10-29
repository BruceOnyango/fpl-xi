import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expectNoA11yViolations } from '@/test/axe';
import { teamShort, topPlayers } from '@/test/fixtures';
import { budgetImpact, TransferRow } from './TransferRow';

describe('TransferRow', () => {
  it('shows out → in with the points swing and can be undone', async () => {
    const [inn, out] = topPlayers(2);
    const onRemove = vi.fn();
    const { container } = render(
      <ul>
        <TransferRow
          out={out!}
          in={inn!}
          sellingPrice={out!.price}
          teamShort={teamShort}
          horizonLabel="next GW"
          onRemove={onRemove}
        />
      </ul>,
    );
    const delta = inn!.prediction.points - out!.prediction.points;
    expect(container).toHaveTextContent(`+${delta.toFixed(1)}pts`);
    await userEvent.click(
      screen.getByRole('button', { name: `Undo transfer ${out!.webName} to ${inn!.webName}` }),
    );
    expect(onRemove).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it('describes the money impact in words', () => {
    expect(budgetImpact(1.24)).toBe('Costs £1.2m');
    expect(budgetImpact(-0.4)).toBe('Frees £0.4m');
    expect(budgetImpact(0.01)).toBe('Same price');
  });
});

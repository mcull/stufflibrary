import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { CheckInDialog } from '../lender/CheckInDialog';

describe('CheckInDialog', () => {
  // #441: the API requires a condition on lender-return; the dialog must not
  // let a check-in through without one.
  it('disables Check In until a condition is selected', () => {
    const onConfirm = vi.fn();
    render(
      <CheckInDialog
        open
        busy={false}
        itemName="Dinner plate"
        onClose={() => {}}
        onConfirm={onConfirm}
      />
    );
    const confirm = screen.getByRole('button', { name: 'Check In' });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('button', { name: 'Check In' })).not.toBeDisabled();
  });

  it('passes the chosen condition and note to onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <CheckInDialog
        open
        busy={false}
        itemName="Dinner plate"
        onClose={() => {}}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Minor wear' }));
    fireEvent.change(screen.getByLabelText(/note/i), {
      target: { value: 'small chip on the rim' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));
    expect(onConfirm).toHaveBeenCalledWith(
      'MINOR_WEAR',
      'small chip on the rim'
    );
  });

  it('shows a busy state while the check-in is in flight', () => {
    render(
      <CheckInDialog
        open
        busy
        itemName="Dinner plate"
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /Checking In/ })).toBeDisabled();
  });
});

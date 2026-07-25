import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ArrivalWelcome } from '../ArrivalWelcome';

const base = {
  name: 'Nora',
  onBrowse: () => {},
  onAdd: () => {},
  onDismiss: () => {},
};

describe('ArrivalWelcome', () => {
  it('welcomes the new member by name with a MEMBER stamp', () => {
    render(<ArrivalWelcome {...base} />);
    expect(screen.getByText(/welcome in, nora/i)).toBeInTheDocument();
    expect(screen.getByText(/member/i)).toBeInTheDocument();
  });

  it('welcomes without a name gracefully', () => {
    render(<ArrivalWelcome {...base} name={null} />);
    expect(screen.getByText(/welcome in/i)).toBeInTheDocument();
    expect(screen.queryByText(/welcome in,/i)).toBeNull();
  });

  it('offers both verbs and wires them', () => {
    const onBrowse = vi.fn();
    const onAdd = vi.fn();
    render(<ArrivalWelcome {...base} onBrowse={onBrowse} onAdd={onAdd} />);
    fireEvent.click(
      screen.getByRole('button', { name: /browse the shelves/i })
    );
    fireEvent.click(
      screen.getByRole('button', { name: /add your first thing/i })
    );
    expect(onBrowse).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed', () => {
    const onDismiss = vi.fn();
    render(<ArrivalWelcome {...base} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /close|dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

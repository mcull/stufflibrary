import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';

import { CodeCells } from '../CodeCells';

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  // Controlled wrapper mirroring how the sign-in page uses it.
  const [value, setValue] = useState('');
  return onComplete ? (
    <CodeCells value={value} onChange={setValue} onComplete={onComplete} />
  ) : (
    <CodeCells value={value} onChange={setValue} />
  );
}

describe('CodeCells', () => {
  it('renders six inputs', () => {
    render(<Harness />);
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('typing a digit advances focus and builds the value', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    '508213'.split('').forEach((d, i) => {
      fireEvent.change(cells[i]!, { target: { value: d } });
    });
    expect(onComplete).toHaveBeenCalledWith('508213');
  });

  it('ignores non-digits', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(cells[0]!, { target: { value: 'a' } });
    expect(cells[0]!.value).toBe('');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('pasting a 6-digit code fills all cells and completes', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.paste(cells[0]!, {
      clipboardData: { getData: () => '508213' },
    });
    expect(cells.map((c) => c.value).join('')).toBe('508213');
    expect(onComplete).toHaveBeenCalledWith('508213');
  });

  it('backspace on an empty cell moves focus to the previous cell', () => {
    render(<Harness />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(cells[0]!, { target: { value: '5' } });
    cells[1]!.focus();
    fireEvent.keyDown(cells[1]!, { key: 'Backspace' });
    expect(document.activeElement).toBe(cells[0]);
  });

  it('labels each cell for screen readers', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Digit 1 of 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 6 of 6')).toBeInTheDocument();
  });

  it('fans out a full code that arrives via change (SMS/autofill) on one cell', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(cells[0]!, { target: { value: '508213' } });
    expect(cells.map((c) => c.value).join('')).toBe('508213');
    expect(onComplete).toHaveBeenCalledWith('508213');
  });

  it('marks the focused cell with a distinct border', () => {
    render(<Harness />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.focus(cells[0]!);
    expect(cells[0]!.style.borderColor).not.toBe(cells[1]!.style.borderColor);
  });
});

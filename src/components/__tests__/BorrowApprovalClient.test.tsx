import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BorrowApprovalClient } from '../BorrowApprovalClient';

// MuxPlayer is a web-component-heavy import jsdom can't run.
vi.mock('@mux/mux-player-react', () => ({
  default: () => null,
}));

global.fetch = vi.fn();

const borrowRequest = {
  id: 'req-1',
  videoUrl: 'https://stream.mux.com/abc.m3u8',
  promiseText: null,
  promisedReturnBy: null,
  requestedAt: new Date('2026-07-01'),
  borrower: { id: 'b1', name: 'Test Borrower', image: null, phone: null },
  lender: { id: 'l1', name: 'Item Owner', phone: null },
  item: {
    id: 'i1',
    name: 'Dinner plate',
    description: null,
    imageUrl: null,
  },
};

describe('BorrowApprovalClient (#447)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('starts the approve message empty with the example as a placeholder', () => {
    render(<BorrowApprovalClient borrowRequest={borrowRequest as any} />);

    fireEvent.click(screen.getByLabelText(/Approve/));

    const field = screen.getByLabelText('Your Message') as HTMLTextAreaElement;
    expect(field.value).toBe('');
    expect(field.placeholder).toMatch(/When would work for pickup/);
    // No literal tokens anywhere, and Send stays disabled until typed.
    expect(field.placeholder).not.toMatch(/\[/);
    expect(
      screen.getByRole('button', { name: /Send Response/i })
    ).toBeDisabled();

    fireEvent.change(field, {
      target: { value: 'Porch pickup after 6 works!' },
    });
    expect(
      screen.getByRole('button', { name: /Send Response/i })
    ).not.toBeDisabled();
  });

  it('keeps the complete, sendable decline prefill', () => {
    render(<BorrowApprovalClient borrowRequest={borrowRequest as any} />);
    fireEvent.click(screen.getByLabelText(/Politely Decline/));
    const field = screen.getByLabelText('Your Message') as HTMLTextAreaElement;
    expect(field.value).toMatch(/can't lend this right now/);
    expect(field.value).not.toMatch(/\[/);
  });

  it('shows a neutral helper before any decision is picked', () => {
    render(<BorrowApprovalClient borrowRequest={borrowRequest as any} />);
    expect(
      screen.getByText(/Pick a response above, then add a note/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText('A polite decline message')
    ).not.toBeInTheDocument();
  });
});

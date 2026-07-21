import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const mockSignOut = vi.hoisted(() => vi.fn());
vi.mock('next-auth/react', () => ({ signOut: mockSignOut }));

import { InviteNotice } from '../InviteNotice';

describe('InviteNotice — wrong account', () => {
  it('names the address the invitation was sent to, masked', () => {
    render(
      <InviteNotice status="wrong_account" maskedEmail="d•••@example.com" />
    );

    expect(screen.getAllByText(/d•••@example\.com/).length).toBeGreaterThan(0);
    // and never the address it masks
    expect(screen.queryByText(/dave@example\.com/)).toBeNull();
  });

  it('offers a way back in as that address', () => {
    render(
      <InviteNotice status="wrong_account" maskedEmail="d•••@example.com" />
    );

    const button = screen.getByRole('button', { name: /sign in as/i });
    button.click();

    expect(mockSignOut).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: '/auth/signin' })
    );
  });

  it('still explains itself when the invite cookie is gone', () => {
    render(<InviteNotice status="wrong_account" maskedEmail={null} />);

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText(/different address/i)).toBeInTheDocument();
  });
});

// These three have rendered nothing at all since long before this work — the
// homepage never read the query parameter.
describe('InviteNotice — the other dead ends', () => {
  it('distinguishes an invalid link from a wrong account', () => {
    render(<InviteNotice status="invalid" maskedEmail={null} />);

    const heading = screen.getByRole('heading').textContent ?? '';
    expect(heading).not.toMatch(/account/i);
    expect(screen.queryByText(/d•••@/)).toBeNull();
    expect(screen.queryByRole('button', { name: /sign in as/i })).toBeNull();
  });

  it('says an expired invitation is expired, not broken', () => {
    render(<InviteNotice status="expired" maskedEmail={null} />);

    expect(screen.getByRole('heading').textContent).toMatch(/expired/i);
  });

  it('gives invalid and expired different copy from each other', () => {
    const { container: invalid } = render(
      <InviteNotice status="invalid" maskedEmail={null} />
    );
    const { container: expired } = render(
      <InviteNotice status="expired" maskedEmail={null} />
    );

    expect(invalid.textContent).not.toBe(expired.textContent);
  });

  it('never leaks the address on a status that has no business showing one', () => {
    render(<InviteNotice status="expired" maskedEmail="d•••@example.com" />);

    expect(screen.queryByText(/d•••@example\.com/)).toBeNull();
  });

  it('has a way onward from every dead end', () => {
    for (const status of ['invalid', 'expired', 'error'] as const) {
      const { getAllByRole, unmount } = render(
        <InviteNotice status={status} maskedEmail={null} />
      );
      expect(getAllByRole('link').length).toBeGreaterThan(0);
      unmount();
    }
  });
});

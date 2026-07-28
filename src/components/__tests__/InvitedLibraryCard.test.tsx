import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { PendingInvitation } from '@/hooks/usePendingInvitations';

import { InvitedLibraryCard } from '../member-home/InvitedLibraryCard';

const INV: PendingInvitation = {
  id: 'inv1',
  token: 'tok1',
  collection: {
    id: 'lib1',
    name: 'Maple Street Tools',
    location: null,
    owner: { name: 'Dana' },
    memberCount: 14,
  },
  invitedBy: { name: 'Dana', email: 'dana@example.com' },
  createdAt: '2026-07-20T00:00:00.000Z',
  expiresAt: '2026-08-03T00:00:00.000Z',
};

describe('InvitedLibraryCard', () => {
  it('shows the library, inviter, member count, and expiry', () => {
    render(
      <InvitedLibraryCard
        invitation={INV}
        isClaiming={false}
        onClaim={() => {}}
      />
    );
    expect(screen.getByText('Maple Street Tools')).toBeInTheDocument();
    expect(
      screen.getByText(/Invited by Dana · 14 members/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Card expires/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /claim your card/i })
    ).toBeInTheDocument();
  });

  it('calls onClaim with the token when clicked', () => {
    const onClaim = vi.fn();
    render(
      <InvitedLibraryCard
        invitation={INV}
        isClaiming={false}
        onClaim={onClaim}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /claim your card/i }));
    expect(onClaim).toHaveBeenCalledWith('tok1');
  });

  it('disables its button while claiming', () => {
    render(
      <InvitedLibraryCard invitation={INV} isClaiming onClaim={() => {}} />
    );
    expect(
      screen.getByRole('button', { name: /claim your card/i })
    ).toBeDisabled();
  });

  it('singularizes a one-member library', () => {
    render(
      <InvitedLibraryCard
        invitation={{
          ...INV,
          collection: { ...INV.collection, memberCount: 1 },
        }}
        isClaiming={false}
        onClaim={() => {}}
      />
    );
    expect(screen.getByText(/Invited by Dana · 1 member$/)).toBeInTheDocument();
  });
});

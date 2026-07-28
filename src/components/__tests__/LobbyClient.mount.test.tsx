import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useCollections', () => ({
  useCollections: () => ({
    collections: [],
    isLoading: false,
    createCollection: vi.fn(),
  }),
}));
vi.mock('@/hooks/useUserItems', () => ({
  useUserItems: () => ({
    readyToLendItems: [],
    onLoanItems: [],
    offlineItems: [],
    borrowedItems: [],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ capabilities: null }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('../member-home/InvitedLibraries', () => ({
  InvitedLibraries: () => <div data-testid="invited-libraries" />,
}));

import { LobbyClient } from '../LobbyClient';

describe('LobbyClient', () => {
  it('mounts the pending-invitations band', () => {
    render(
      <LobbyClient
        user={{ id: 'u1', name: 'Marc', email: 'm@example.com' }}
        showWelcome={false}
      />
    );
    expect(screen.getByTestId('invited-libraries')).toBeInTheDocument();
  });
});

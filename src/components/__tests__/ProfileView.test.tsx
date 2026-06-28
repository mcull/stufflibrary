import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ProfileView } from '../ProfileView';

vi.mock('next/navigation');
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

global.fetch = vi.fn();

const baseUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  image: null,
  bio: null,
  shareInterests: [],
  borrowInterests: [],
  profileCompleted: true,
  onboardingStep: 'complete',
  currentAddressId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('ProfileView trust section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: vi.fn() });
  });

  it('renders the numeric trust score, tier badge, and hint', () => {
    render(
      <ProfileView
        user={{ ...baseUser, trustScore: 72, trustTier: 'TRUSTED' }}
        currentAddress={null}
      />
    );

    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('Trusted')).toBeInTheDocument();
    expect(
      screen.getByText(/return items on time to raise your score/i)
    ).toBeInTheDocument();
  });

  it('omits the trust section when no score or tier is present', () => {
    render(<ProfileView user={baseUser} currentAddress={null} />);

    expect(
      screen.queryByText(/return items on time to raise your score/i)
    ).not.toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
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

  it('leads with the warm tier name; the number stays tucked away', () => {
    render(
      <ProfileView
        user={{ ...baseUser, trustScore: 72, trustTier: 'TRUSTED' }}
        currentAddress={null}
      />
    );

    expect(screen.getByText('Trusted neighbor')).toBeInTheDocument();
    // The naked score is not shown until the user asks how it works.
    expect(screen.queryByText(/72/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/return items on time to raise your score/i)
    ).toBeInTheDocument();
  });

  it('reveals the score and mechanics behind "See how this works"', () => {
    render(
      <ProfileView
        user={{ ...baseUser, trustScore: 72, trustTier: 'TRUSTED' }}
        currentAddress={null}
      />
    );

    fireEvent.click(screen.getByText(/see how this works/i));

    expect(screen.getByText(/72/)).toBeInTheDocument();
    expect(screen.getByText(/on-time returns/i)).toBeInTheDocument();
  });

  it('omits the trust section when no score or tier is present', () => {
    render(<ProfileView user={baseUser} currentAddress={null} />);

    expect(
      screen.queryByText(/return items on time to raise your score/i)
    ).not.toBeInTheDocument();
  });

  it('does not tell a completed profile to complete their profile', () => {
    render(
      <ProfileView
        user={{
          ...baseUser,
          image: 'https://example.com/photo.jpg',
          trustScore: 51,
          trustTier: 'NEW',
        }}
        currentAddress={{
          address1: '1 Hill Rd',
          address2: null,
          city: 'Kensington',
          state: 'CA',
          zip: '94707',
          formattedAddress: '1 Hill Rd, Kensington, CA 94707',
        }}
      />
    );

    // Still coaches on behavior…
    expect(
      screen.getByText(/return items on time to raise your score/i)
    ).toBeInTheDocument();
    // …but no longer asks them to complete an already-complete profile.
    expect(
      screen.queryByText(/complete your profile/i)
    ).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ProfileView } from '../ProfileView';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));
vi.mock('../AddressAutocomplete', () => ({
  AddressAutocomplete: () => <input aria-label="address-stub" />,
}));

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    name: 'Marc',
    email: 'a@b.c',
    image: null,
    bio: null,
    phone: null,
    smsOptIn: false,
    shareInterests: [],
    borrowInterests: [],
    profileCompleted: true,
    onboardingStep: null,
    currentAddressId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as any;
}

describe('ProfileView SMS opt-in section (#477)', () => {
  it('renders a phone field and an SMS consent checkbox', () => {
    render(<ProfileView user={makeUser()} currentAddress={null} />);

    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /text me borrow requests/i })
    ).toBeInTheDocument();
  });

  it('the consent checkbox is unchecked by default', () => {
    render(<ProfileView user={makeUser()} currentAddress={null} />);

    expect(
      screen.getByRole('checkbox', { name: /text me borrow requests/i })
    ).not.toBeChecked();
  });

  it('shows the full carrier consent language', () => {
    render(<ProfileView user={makeUser()} currentAddress={null} />);

    expect(
      screen.getByText(
        /Message and data rates may apply\. Message frequency varies\. Reply HELP for help, STOP to cancel\./
      )
    ).toBeInTheDocument();
  });

  it('reflects an existing opt-in', () => {
    render(
      <ProfileView
        user={makeUser({ phone: '+14155552671', smsOptIn: true })}
        currentAddress={null}
      />
    );

    expect(
      screen.getByRole('checkbox', { name: /text me borrow requests/i })
    ).toBeChecked();
    expect(screen.getByLabelText(/mobile number/i)).toHaveValue('+14155552671');
  });
});

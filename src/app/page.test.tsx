import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());
const mockMaskedInvited = vi.hoisted(() => vi.fn());

vi.mock('@/lib/invite-notice', () => ({
  maskedInvitedAddressFromCookies: mockMaskedInvited,
}));
vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

// Home is a server component: mock the session check and next's redirect, and
// stub @/lib/auth so the test never pulls the real auth -> prisma graph.
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));

import Home from './page';

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaskedInvited.mockResolvedValue(null);
  });

  it('renders the main heading for signed-out visitors', async () => {
    mockGetServerSession.mockResolvedValue(null);

    render(await Home());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /share more, buy less/i
    );
  });

  it('renders the main subheading for signed-out visitors', async () => {
    mockGetServerSession.mockResolvedValue(null);

    render(await Home());

    expect(
      screen.getByText(
        /free platform that helps neighbors and friend groups share more/
      )
    ).toBeInTheDocument();
  });

  it('redirects signed-in visitors to /home before anything renders', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
    // In production next's redirect() throws to abort rendering; emulate that.
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(Home()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/home');
  });
});

describe('Home Page — invitation dead ends', () => {
  const home = (invite: string) =>
    Home({ searchParams: Promise.resolve({ invite }) });

  beforeEach(() => {
    vi.clearAllMocks();
    mockMaskedInvited.mockResolvedValue(null);
  });

  // A refused invitee is signed in as themselves, so the /home redirect would
  // eat the explanation before it ever painted. The notice has to win.
  it('explains a wrong-account refusal instead of bouncing the signed-in user to /home', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u2' } });
    mockMaskedInvited.mockResolvedValue('d•••@example.com');

    render(await home('wrong_account'));

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getAllByText(/d•••@example\.com/).length).toBeGreaterThan(0);
  });

  it('reads the address from the cookie, never from the URL', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u2' } });
    mockMaskedInvited.mockResolvedValue('d•••@example.com');

    render(
      await Home({
        // A forged parameter must not be what the screen believes.
        searchParams: Promise.resolve({
          invite: 'wrong_account',
          invited: 'z•••@attacker.test',
        }),
      })
    );

    expect(mockMaskedInvited).toHaveBeenCalled();
    expect(screen.queryByText(/attacker\.test/)).toBeNull();
  });

  it('gives invalid and expired links their own copy rather than the marketing page', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const invalid = render(await home('invalid'));
    expect(screen.queryByText(/share more, buy less/i)).toBeNull();
    const invalidHeading = invalid.getByRole('heading').textContent;
    invalid.unmount();

    const expired = render(await home('expired'));
    expect(expired.getByRole('heading').textContent).toMatch(/expired/i);
    expect(expired.getByRole('heading').textContent).not.toBe(invalidHeading);
  });

  it('ignores a status it does not recognize and shows the homepage', async () => {
    mockGetServerSession.mockResolvedValue(null);

    render(await home('banana'));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /share more, buy less/i
    );
  });

  it('does not go looking for an invite cookie when there is no invite status', async () => {
    mockGetServerSession.mockResolvedValue(null);

    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(mockMaskedInvited).not.toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());

// Home is a server component: mock the session check and next's redirect, and
// stub @/lib/auth so the test never pulls the real auth -> prisma graph.
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));

import Home from './page';

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main heading for signed-out visitors', async () => {
    mockGetServerSession.mockResolvedValue(null);

    render(await Home());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /borrow.*lend.*belong/i
    );
  });

  it('renders the main subheading for signed-out visitors', async () => {
    mockGetServerSession.mockResolvedValue(null);

    render(await Home());

    expect(
      screen.getByText(/A neighborly way to share what you have/)
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

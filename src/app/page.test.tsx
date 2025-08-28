import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { describe, it, expect, vi } from 'vitest';

import Home from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(
      <SessionProvider session={null}>
        <Home />
      </SessionProvider>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /share more.*buy less/i
    );
  });

  it('renders the main subheading', () => {
    render(
      <SessionProvider session={null}>
        <Home />
      </SessionProvider>
    );
    expect(
      screen.getByText(/A neighborhood platform for safely sharing stuff/)
    ).toBeInTheDocument();
  });
});

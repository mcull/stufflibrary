import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import RootLayout from '../layout';

// Mock Next.js fonts
vi.mock('next/font/google', () => ({
  Roboto: () => ({
    variable: '--font-roboto',
  }),
  Space_Grotesk: () => ({
    variable: '--font-space-grotesk',
  }),
  Merriweather: () => ({
    variable: '--font-merriweather',
  }),
  Roboto_Mono: () => ({
    variable: '--font-roboto-mono',
  }),
  Inter: () => ({
    variable: '--font-inter',
  }),
}));

vi.mock('next/font/local', () => ({
  default: () => ({
    variable: '--font-impact-label',
  }),
}));

// Mock the Analytics component
vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="vercel-analytics">Analytics</div>,
}));

// Mock other components that might have complex dependencies
vi.mock('@/components/ClientThemeProvider', () => ({
  ClientThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ConditionalFooter', () => ({
  ConditionalFooter: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('@/components/ConditionalHeader', () => ({
  ConditionalHeader: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/ProfileDraftCleanup', () => ({
  ProfileDraftCleanup: () => (
    <div data-testid="profile-cleanup">Profile Cleanup</div>
  ),
}));

vi.mock('@/components/providers/session-provider', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('RootLayout', () => {
  it('renders the layout with Analytics component', () => {
    const { getByTestId } = render(
      <RootLayout>
        <div data-testid="child-content">Test Content</div>
      </RootLayout>
    );

    // Check that main components are rendered
    expect(getByTestId('header')).toBeInTheDocument();
    expect(getByTestId('footer')).toBeInTheDocument();
    expect(getByTestId('profile-cleanup')).toBeInTheDocument();
    expect(getByTestId('child-content')).toBeInTheDocument();

    // Most importantly, check that the Analytics component is rendered
    expect(getByTestId('vercel-analytics')).toBeInTheDocument();
  });

  it('renders with proper structure', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    // Verify the component renders without errors
    expect(container.firstChild).toBeTruthy();
  });
});

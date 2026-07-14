import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The admin console brings its own chrome (ConsoleShell); the app's global
// header, bottom nav, and marketing footer must all stand down on /admin.

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'u1', name: 'Marc' } },
    status: 'authenticated',
  }),
}));

vi.mock('../GlobalHeader', () => ({
  GlobalHeader: () => <div data-testid="global-header" />,
}));
vi.mock('../BottomNav', () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));
vi.mock('../Header', () => ({
  Header: () => <div data-testid="marketing-header" />,
}));
vi.mock('../Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

import { ConditionalFooter } from '../ConditionalFooter';
import { ConditionalNavigation } from '../ConditionalNavigation';

describe('admin console chrome suppression', () => {
  it('renders no app navigation on /admin routes', () => {
    mockUsePathname.mockReturnValue('/admin');
    render(<ConditionalNavigation />);
    expect(screen.queryByTestId('global-header')).toBeNull();
    expect(screen.queryByTestId('bottom-nav')).toBeNull();
    expect(screen.queryByTestId('marketing-header')).toBeNull();
  });

  it('renders no footer on /admin sub-routes', () => {
    mockUsePathname.mockReturnValue('/admin/members');
    render(<ConditionalFooter />);
    expect(screen.queryByTestId('footer')).toBeNull();
  });

  it('still renders navigation and footer elsewhere', () => {
    mockUsePathname.mockReturnValue('/home');
    render(<ConditionalNavigation />);
    expect(screen.getByTestId('global-header')).toBeInTheDocument();
    render(<ConditionalFooter />);
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ConsoleShell } from '../ConsoleShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/members',
}));

describe('ConsoleShell', () => {
  it('marks the tab for the current path active, and only that one', () => {
    render(
      <ConsoleShell userName="Marc">
        <div>desk contents</div>
      </ConsoleShell>
    );

    expect(screen.getByRole('link', { name: 'MEMBERS' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'DESK' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('has no WAITLIST or REPORTS tab (deliberate product decision)', () => {
    render(
      <ConsoleShell userName="Marc">
        <div>desk contents</div>
      </ConsoleShell>
    );

    expect(screen.queryByText(/waitlist/i)).toBeNull();
    expect(screen.queryByText(/reports/i)).toBeNull();
  });

  it('renders the clock (placeholder or a ticking HH:MM:SS) and children', () => {
    render(
      <ConsoleShell userName="Marc">
        <div>desk contents</div>
      </ConsoleShell>
    );

    expect(
      screen.getByText(/^(\d{2}:\d{2}:\d{2}|--:--:--)$/)
    ).toBeInTheDocument();
    expect(screen.getByText('desk contents')).toBeInTheDocument();
  });
});

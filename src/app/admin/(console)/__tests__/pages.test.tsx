import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import AdminConsoleAuditPage from '../audit/page';
import AdminConsoleBorrowsPage from '../borrows/page';

describe('AdminConsoleBorrowsPage', () => {
  it('renders the honest placeholder with no fake data', () => {
    const { container } = render(<AdminConsoleBorrowsPage />);

    expect(screen.getByText('BORROW BOARD — QUEUED')).toBeInTheDocument();
    expect(screen.getByText('PLACEHOLDER')).toBeInTheDocument();
    expect(container.querySelector('.MuiSkeleton-root')).toBeNull();
  });
});

describe('AdminConsoleAuditPage', () => {
  it('renders the blocked-out audit ledger with ghost headers and chips', () => {
    const { container } = render(<AdminConsoleAuditPage />);

    expect(screen.getByText('AUDIT LEDGER — BLOCKED OUT')).toBeInTheDocument();
    expect(screen.getByText('PLACEHOLDER')).toBeInTheDocument();

    for (const header of ['TIME', 'ACTOR', 'ACTION', 'TARGET', 'DETAIL']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }

    for (const chip of [
      'Admin actions',
      'Security events',
      'System jobs',
      'Append-only, exportable',
    ]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }

    expect(container.querySelector('.MuiSkeleton-root')).toBeNull();
  });
});

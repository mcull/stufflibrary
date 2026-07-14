import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import AdminConsoleAuditPage from '../audit/page';

// The borrows page is now the live state board; its behavior is covered in
// src/components/admin/console/__tests__/BorrowsBoardClient.test.tsx.

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

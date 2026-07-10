import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { BorrowRequestDetail } from '../BorrowRequestDetail';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('next/navigation');

// Mock fetch
global.fetch = vi.fn();

const mockPush = vi.fn();
const mockSession = {
  user: { id: 'user-2', name: 'Item Owner' },
};

const mockReturnPendingRequest = {
  id: 'request-1',
  status: 'RETURN_PENDING',
  requestMessage: 'Can I borrow this?',
  lenderMessage: 'Sure, take good care of it',
  requestedReturnDate: '2023-12-31T00:00:00Z',
  createdAt: '2023-12-01T00:00:00Z',
  approvedAt: '2023-12-02T00:00:00Z',
  returnedAt: '2023-12-25T00:00:00Z',
  borrower: {
    id: 'user-1',
    name: 'Test Borrower',
    email: 'test@example.com',
  },
  lender: {
    id: 'user-2',
    name: 'Item Owner',
  },
  item: {
    id: 'item-1',
    name: 'Test Item',
    description: 'A test item',
    imageUrl: 'http://example.com/image.jpg',
    condition: 'good',
  },
};

describe('lender BorrowRequestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    (useRouter as any).mockReturnValue({ push: mockPush });

    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ borrowRequest: mockReturnPendingRequest }),
      })
    );
  });

  // #440: honest attribution — after a direct lender check-in, the page must
  // not claim the borrower marked the return, and the approval message must
  // still be shown as "Your Response".
  it('attributes a lender check-in honestly and keeps the approval message', async () => {
    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            borrowRequest: {
              ...mockReturnPendingRequest,
              status: 'RETURNED',
              returnInitiatedBy: 'user-2',
              returnMessage: 'Found it on the porch, all good.',
            },
          }),
      })
    );
    render(<BorrowRequestDetail requestId="request-1" />);
    await waitFor(() => {
      expect(screen.getByText(/You checked this item in/)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Test Borrower marked this item as returned/)
    ).not.toBeInTheDocument();
    // Approval-time response still intact, return message shown separately.
    expect(screen.getByText(/Sure, take good care of it/)).toBeInTheDocument();
    expect(
      screen.getByText(/Found it on the porch, all good./)
    ).toBeInTheDocument();
  });

  it('shows the handshake attribution when the borrower initiated the return', async () => {
    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            borrowRequest: {
              ...mockReturnPendingRequest,
              status: 'RETURNED',
              returnInitiatedBy: 'user-1',
            },
          }),
      })
    );
    render(<BorrowRequestDetail requestId="request-1" />);
    await waitFor(() => {
      expect(
        screen.getByText(/Test Borrower marked this item as returned/)
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/confirmed by you/)).toBeInTheDocument();
  });

  it('shows awaiting confirmation label for RETURN_PENDING', async () => {
    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(
          screen.getByText('Awaiting your confirmation')
        ).toBeInTheDocument();
        expect(screen.getByText('Confirm Return Received')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('disables confirm action until a condition is selected', async () => {
    render(<BorrowRequestDetail requestId="request-1" />);

    const openButton = await screen.findByText(
      'Confirm Return Received',
      {},
      { timeout: 5000 }
    );
    fireEvent.click(openButton);

    // Dialog open: the confirm button should be disabled until a condition is picked
    const confirmButton = await screen.findByRole('button', {
      name: 'Confirm Return',
    });
    expect(confirmButton).toBeDisabled();

    // Pick a condition
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Confirm Return' })
      ).not.toBeDisabled();
    });
  });

  it('sends PATCH with condition DAMAGED when confirming as damaged', async () => {
    render(<BorrowRequestDetail requestId="request-1" />);

    const openButton = await screen.findByText(
      'Confirm Return Received',
      {},
      { timeout: 5000 }
    );
    fireEvent.click(openButton);

    await screen.findByRole('button', { name: 'Confirm Return' });

    // Select Damaged
    fireEvent.click(screen.getByRole('button', { name: 'Damaged' }));

    // Confirm
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Return' }));

    await waitFor(
      () => {
        const patchCall = (fetch as any).mock.calls.find(
          (call: any[]) => call[1]?.method === 'PATCH'
        );
        expect(patchCall).toBeTruthy();
        const body = JSON.parse(patchCall[1].body);
        expect(body.action).toBe('confirm-return');
        expect(body.condition).toBe('DAMAGED');
      },
      { timeout: 10000 }
    );
  });

  it('shows the borrower trust tier badge to the owner', async () => {
    const requestWithTier = {
      ...mockReturnPendingRequest,
      borrower: { ...mockReturnPendingRequest.borrower, trustTier: 'TRUSTED' },
    };

    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ borrowRequest: requestWithTier }),
      })
    );

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Trusted neighbor')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('displays the borrower return note to the owner', async () => {
    const requestWithNote = {
      ...mockReturnPendingRequest,
      borrowerReturnNote: 'left it on the porch',
    };

    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ borrowRequest: requestWithNote }),
      })
    );

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(screen.getByText(/left it on the porch/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('opens the report-problem dialog and submits a dispute', async () => {
    render(<BorrowRequestDetail requestId="request-1" />);

    const reportButton = await screen.findByText(
      'Report a Problem',
      {},
      { timeout: 5000 }
    );
    fireEvent.click(reportButton);

    await screen.findByRole('button', { name: 'Submit Report' });

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Item came back broken' },
    });
    fireEvent.change(screen.getByLabelText('Describe the problem'), {
      target: { value: 'The handle was snapped off.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(
      () => {
        const patchCall = (fetch as any).mock.calls.find((call: any[]) => {
          if (call[1]?.method !== 'PATCH') return false;
          const body = JSON.parse(call[1].body);
          return body.action === 'report-problem';
        });
        expect(patchCall).toBeTruthy();
        const body = JSON.parse(patchCall[1].body);
        expect(body.disputeType).toBe('ITEM_DAMAGED');
        expect(body.title).toBe('Item came back broken');
        expect(body.message).toBe('The handle was snapped off.');
      },
      { timeout: 10000 }
    );
  });
});

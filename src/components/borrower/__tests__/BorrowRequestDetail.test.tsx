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
  user: { id: 'user-1', name: 'Test User' },
};

const mockActiveRequest = {
  id: 'request-1',
  status: 'ACTIVE',
  requestMessage: 'Can I borrow this?',
  lenderMessage: 'Sure, take good care of it',
  requestedReturnDate: '2023-12-31T00:00:00Z',
  createdAt: '2023-12-01T00:00:00Z',
  approvedAt: '2023-12-02T00:00:00Z',
  borrower: {
    id: 'user-1',
    name: 'Test User',
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

const mockReturnedRequest = {
  ...mockActiveRequest,
  status: 'RETURNED',
  returnedAt: '2023-12-25T00:00:00Z',
};

describe('BorrowRequestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Ensure session is properly mocked
    (useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });

    // Ensure router is properly mocked
    (useRouter as any).mockReturnValue({ push: mockPush });

    // Reset fetch mock to default successful response with proper implementation
    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ borrowRequest: mockActiveRequest }),
      })
    );
  });

  it('renders active request with mark returned button', async () => {
    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
        expect(screen.getByText('Mark as Returned')).toBeInTheDocument();
        expect(screen.getByText('Ready to Return?')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('shows overdue warning for past due date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    const overdueRequest = {
      ...mockActiveRequest,
      requestedReturnDate: pastDate.toISOString(),
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ borrowRequest: overdueRequest }),
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('OVERDUE')).toBeInTheDocument();
        expect(screen.getByText(/This item is overdue/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('opens return confirmation dialog when mark returned clicked', async () => {
    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
        expect(screen.getByText('Mark as Returned')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    fireEvent.click(screen.getByText('Mark as Returned'));

    await waitFor(
      () => {
        expect(
          screen.getByText('Mark "Test Item" as Returned')
        ).toBeInTheDocument();
        expect(
          screen.getByLabelText('Return notes (optional)')
        ).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('submits return when confirmed', async () => {
    // Set up specific sequence for this test
    (fetch as any).mockClear();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ borrowRequest: mockActiveRequest }),
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    // Wait for component to load and find the button
    const markReturnedButton = await screen.findByText(
      'Mark as Returned',
      {},
      { timeout: 5000 }
    );

    // Open dialog
    fireEvent.click(markReturnedButton);

    // Wait for dialog to open
    await screen.findByText('Mark "Test Item" as Returned');

    // Add return notes
    const notesField = screen.getByLabelText('Return notes (optional)');
    fireEvent.change(notesField, {
      target: { value: 'Returned in good condition' },
    });

    // Set up mocks for the actual return submission
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ borrowRequest: mockReturnedRequest }),
      });

    // Confirm return - get the dialog button specifically
    const dialogButtons = screen.getAllByText('Mark as Returned');
    const dialogButton = dialogButtons.find((btn) =>
      btn.closest('[role="dialog"]')
    );
    fireEvent.click(dialogButton!);

    await waitFor(
      () => {
        expect(fetch).toHaveBeenCalledWith('/api/borrow-requests/request-1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'return',
            message: 'Returned in good condition',
          }),
        });
      },
      { timeout: 10000 }
    );
  });

  it('shows returned status for returned items', async () => {
    // Clear any previous mocks and set up fresh mock for this test
    (fetch as any).mockClear();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ borrowRequest: mockReturnedRequest }),
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Item Returned')).toBeInTheDocument();
        expect(screen.queryByText('Mark as Returned')).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('displays return instructions for active requests', async () => {
    // Clear any previous mocks and set up fresh mock for this test
    (fetch as any).mockClear();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ borrowRequest: mockActiveRequest }),
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Return Instructions')).toBeInTheDocument();
        expect(
          screen.getByText(/Return the item to Item Owner/)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Click "Mark as Returned"/)
        ).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('handles API errors gracefully', async () => {
    // Clear any previous mocks and set up error mock for this test
    (fetch as any).mockClear();
    (fetch as any).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    );

    render(<BorrowRequestDetail requestId="request-1" />);

    // Increase timeout for CI environments and be more specific about what we're waiting for
    await waitFor(
      () => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});

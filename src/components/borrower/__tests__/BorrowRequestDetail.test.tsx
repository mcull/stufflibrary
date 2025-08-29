import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { BorrowRequestDetail } from '../BorrowRequestDetail';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('next/navigation');

// Mock fetch
global.fetch = vi.fn();

const mockPush = vi.fn();
const mockSession = {
  user: { id: 'user-1', name: 'Test User' }
};

describe('BorrowRequestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    });
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

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
      email: 'test@example.com'
    },
    lender: {
      id: 'user-2',
      name: 'Item Owner'
    },
    item: {
      id: 'item-1',
      name: 'Test Item',
      description: 'A test item',
      imageUrl: 'http://example.com/image.jpg',
      condition: 'good'
    }
  };

  const mockReturnedRequest = {
    ...mockActiveRequest,
    status: 'RETURNED',
    returnedAt: '2023-12-25T00:00:00Z'
  };

  it('renders active request with mark returned button', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ borrowRequest: mockActiveRequest })
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByText('Mark as Returned')).toBeInTheDocument();
      expect(screen.getByText('Ready to Return?')).toBeInTheDocument();
    });
  });

  it('shows overdue warning for past due date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday
    
    const overdueRequest = {
      ...mockActiveRequest,
      requestedReturnDate: pastDate.toISOString()
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ borrowRequest: overdueRequest })
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText('OVERDUE')).toBeInTheDocument();
      expect(screen.getByText(/This item is overdue/)).toBeInTheDocument();
    });
  });

  it('opens return confirmation dialog when mark returned clicked', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ borrowRequest: mockActiveRequest })
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText('Mark as Returned')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark as Returned'));

    await waitFor(() => {
      expect(screen.getByText('Mark "Test Item" as Returned')).toBeInTheDocument();
      expect(screen.getByLabelText('Return notes (optional)')).toBeInTheDocument();
    });
  });

  it('submits return when confirmed', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ borrowRequest: mockActiveRequest })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ borrowRequest: mockReturnedRequest })
      });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText('Mark as Returned')).toBeInTheDocument();
    });

    // Open dialog - use getAllByText to get the first button
    const markReturnedButtons = screen.getAllByText('Mark as Returned');
    fireEvent.click(markReturnedButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Mark "Test Item" as Returned')).toBeInTheDocument();
    });

    // Add return notes
    const notesField = screen.getByLabelText('Return notes (optional)');
    fireEvent.change(notesField, { 
      target: { value: 'Returned in good condition' } 
    });

    // Confirm return - use the button in the dialog
    const confirmButtons = screen.getAllByText('Mark as Returned');
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!); // Last one should be in the dialog

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/borrow-requests/request-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'return',
          message: 'Returned in good condition'
        })
      });
    });
  });

  it('shows returned status for returned items', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ borrowRequest: mockReturnedRequest })
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText('Item Returned')).toBeInTheDocument();
      expect(screen.queryByText('Mark as Returned')).not.toBeInTheDocument();
    });
  });

  it('displays return instructions for active requests', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ borrowRequest: mockActiveRequest })
    });

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText('Return Instructions')).toBeInTheDocument();
      expect(screen.getByText(/Return the item to Item Owner/)).toBeInTheDocument();
      expect(screen.getByText(/Click "Mark as Returned"/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<BorrowRequestDetail requestId="request-1" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
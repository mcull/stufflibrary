import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LenderRequestsPage } from '../LenderRequestsPage';

// Mock next-auth
vi.mock('next-auth/react');
vi.mock('next/navigation');

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPush = vi.fn();
const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  },
  expires: '2024-12-31T23:59:59.000Z',
};

const mockBorrowRequests = {
  receivedRequests: [
    {
      id: 'request-1',
      status: 'PENDING',
      requestMessage: 'Can I borrow this?',
      videoUrl: 'https://example.com/video.mp4',
      requestedReturnDate: '2024-01-15T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      borrower: {
        id: 'borrower-1',
        name: 'John Doe',
        image: 'https://example.com/avatar.jpg',
      },
      item: {
        id: 'item-1',
        name: 'Power Drill',
        imageUrl: 'https://example.com/drill.jpg',
      },
    },
  ],
};

describe('LenderRequestsPage', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: vi.fn(),
    });

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBorrowRequests),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    });

    render(<LenderRequestsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirects to sign in when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    render(<LenderRequestsPage />);
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
  });

  it('renders lending requests page with header and tabs', async () => {
    render(<LenderRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Lending Requests')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Review and respond to borrowing requests for your items'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /completed/i })).toBeInTheDocument();
  });

  it('displays pending requests correctly', async () => {
    render(<LenderRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Power Drill')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('"Can I borrow this?"')).toBeInTheDocument();
    expect(screen.getByText('Video message')).toBeInTheDocument();
    expect(screen.getByText('Review & Respond')).toBeInTheDocument();
  });

  it('displays empty state for no requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ receivedRequests: [] }),
    });

    render(<LenderRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('No pending requests')).toBeInTheDocument();
    });

    expect(
      screen.getByText('New borrowing requests will appear here')
    ).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<LenderRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('fetches requests on component mount', async () => {
    render(<LenderRequestsPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/borrow-requests');
    });
  });
});

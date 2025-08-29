import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { UserDetailModal } from '../UserDetailModal';

// Mock fetch
global.fetch = vi.fn();

const mockUserDetails = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  phoneVerified: true,
  bio: 'Test user bio',
  status: 'active',
  profileCompleted: true,
  shareInterests: ['books', 'tools'],
  borrowInterests: ['electronics'],
  movedInDate: '2023-01-01T00:00:00Z',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
  addresses: [],
  borrowRequests: [],
  items: [],
  metrics: {
    trustScore: 85,
    activityLevel: 'high',
    recentActivity: 5,
    totalBorrowRequests: 10,
    approvedRequests: 8,
    rejectedRequests: 1,
    pendingRequests: 1,
    approvalRate: 80,
  },
};

describe('UserDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <UserDetailModal userId="user-1" isOpen={false} onClose={() => {}} />
    );

    expect(screen.queryByText('User Details')).not.toBeInTheDocument();
  });

  it('renders loading state when open', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {}));

    render(
      <UserDetailModal userId="user-1" isOpen={true} onClose={() => {}} />
    );

    expect(screen.getByText('User Details')).toBeInTheDocument();
    expect(screen.getByText('Loading user details...')).toBeInTheDocument();
  });

  it('renders user details when fetch succeeds', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUserDetails }),
    });

    render(
      <UserDetailModal userId="user-1" isOpen={true} onClose={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Trust Score: 85/100')).toBeInTheDocument();
      expect(screen.getByText('High Activity')).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <UserDetailModal userId="user-1" isOpen={true} onClose={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('calls correct API endpoint', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUserDetails }),
    });

    render(
      <UserDetailModal userId="user-123" isOpen={true} onClose={() => {}} />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/users/user-123/details');
    });
  });
});

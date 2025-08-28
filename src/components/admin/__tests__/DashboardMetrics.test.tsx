import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { DashboardMetrics } from '../DashboardMetrics';

// Mock fetch
global.fetch = vi.fn();

const mockMetrics = {
  totalUsers: 150,
  activeUsers: 125,
  totalItems: 500,
  totalLibraries: 12,
  pendingRequests: 8,
  suspendedUsers: 2,
  recentUsers: 5,
  recentItems: 15,
};

describe('DashboardMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DashboardMetrics />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders metrics data when fetch succeeds', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: mockMetrics }),
    });

    render(<DashboardMetrics />);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('125 active')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Libraries')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<DashboardMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls the correct API endpoint', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: mockMetrics }),
    });

    render(<DashboardMetrics />);

    expect(fetch).toHaveBeenCalledWith('/api/admin/dashboard-metrics');
  });
});

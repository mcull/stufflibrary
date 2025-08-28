import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { RecentActivity } from '../RecentActivity';

// Mock fetch
global.fetch = vi.fn();

const mockActivities = [
  {
    id: 'user-1',
    type: 'user_created',
    title: 'New user registered',
    description: 'john@example.com joined the platform',
    timestamp: '2024-01-15T10:00:00Z',
    metadata: {},
  },
  {
    id: 'item-1',
    type: 'item_created',
    title: 'New item added',
    description: 'Jane added "Bicycle"',
    timestamp: '2024-01-15T09:30:00Z',
    metadata: {},
  },
];

describe('RecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {}));

    render(<RecentActivity />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('generic')
        .some((el) => el.classList.contains('animate-pulse'))
    ).toBeTruthy();
  });

  it('renders activity data when fetch succeeds', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: mockActivities }),
    });

    render(<RecentActivity />);

    await waitFor(() => {
      expect(screen.getByText('New user registered')).toBeInTheDocument();
      expect(
        screen.getByText('john@example.com joined the platform')
      ).toBeInTheDocument();
      expect(screen.getByText('New item added')).toBeInTheDocument();
      expect(screen.getByText('Jane added "Bicycle"')).toBeInTheDocument();
    });
  });

  it('renders empty state when no activities', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [] }),
    });

    render(<RecentActivity />);

    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<RecentActivity />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('calls API with correct limit parameter', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [] }),
    });

    render(<RecentActivity limit={10} />);

    expect(fetch).toHaveBeenCalledWith('/api/admin/recent-activity?limit=10');
  });

  it('uses default limit when not specified', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [] }),
    });

    render(<RecentActivity />);

    expect(fetch).toHaveBeenCalledWith('/api/admin/recent-activity?limit=20');
  });
});

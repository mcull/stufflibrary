import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationList } from '../NotificationList';

vi.mock('next/navigation');

global.fetch = vi.fn();

const mockPush = vi.fn();

const notifications = [
  {
    id: 'n1',
    type: 'BORROW_REQUEST_RECEIVED',
    title: 'New borrow request',
    message: 'Someone wants your ladder',
    actionUrl: '/borrow-approval/req-1',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    type: 'SYSTEM_ANNOUNCEMENT',
    title: 'Welcome to the beta',
    message: 'No action needed',
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

describe('NotificationList (#449)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (fetch as any).mockImplementation((url: string) => {
      if (String(url).includes('/api/notifications?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ notifications, hasMore: false }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it('renders actionable notifications as real buttons (keyboard/SR reachable)', async () => {
    render(<NotificationList />);
    const row = await screen.findByRole('button', {
      name: /New borrow request/,
    });
    expect(row).toBeInTheDocument();
    // The no-action announcement stays a plain row.
    expect(
      screen.queryByRole('button', { name: /Welcome to the beta/ })
    ).not.toBeInTheDocument();
  });

  it('navigates and tells the host to close on selection', async () => {
    const onNavigate = vi.fn();
    render(<NotificationList onNavigate={onNavigate} />);
    const row = await screen.findByRole('button', {
      name: /New borrow request/,
    });
    fireEvent.click(row);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/borrow-approval/req-1');
    });
    expect(onNavigate).toHaveBeenCalled();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { TrustSafetyDashboard } from '../TrustSafetyDashboard';

// Mock fetch
global.fetch = vi.fn();

describe('TrustSafetyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with stats', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    render(<TrustSafetyDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Trust & Safety Dashboard')).toBeInTheDocument();
      expect(
        screen.getByText('Platform safety overview and controls')
      ).toBeInTheDocument();
    });

    // Check stats display
    expect(screen.getByText('Total Reports')).toBeInTheDocument();
    expect(screen.getByText('Pending Reports')).toBeInTheDocument();
    expect(screen.getByText('Open Disputes')).toBeInTheDocument();
    expect(screen.getByText('Suspended Users')).toBeInTheDocument();
    expect(screen.getByText('Avg Trust Score')).toBeInTheDocument();
  });

  it('displays quick action form', () => {
    render(<TrustSafetyDashboard />);

    expect(screen.getByText('Quick Trust Actions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Target User ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Select Action Type')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Action description (required)')
    ).toBeInTheDocument();
    expect(screen.getByText('Execute Action')).toBeInTheDocument();
  });

  it('handles trust action submission', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'action-1' }),
    });

    render(<TrustSafetyDashboard />);

    const userIdInput = screen.getByPlaceholderText('Target User ID');
    const actionSelect = screen.getByDisplayValue('Select Action Type');
    const descriptionInput = screen.getByPlaceholderText(
      'Action description (required)'
    );
    const submitButton = screen.getByText('Execute Action');

    fireEvent.change(userIdInput, { target: { value: 'user-123' } });
    fireEvent.change(actionSelect, { target: { value: 'USER_WARNING' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test warning description' },
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/trust-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'user-123',
          type: 'USER_WARNING',
          description: 'Test warning description',
          reason: '',
          metadata: {},
        }),
      });
    });
  });

  it('validates required fields before submission', async () => {
    render(<TrustSafetyDashboard />);

    const submitButton = screen.getByText('Execute Action');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Target user ID, action type, and description are required/
        )
      ).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it.skip('handles API errors gracefully', async () => {
    // Mock the initial fetchStats call when component mounts
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalReports: 45,
          pendingReports: 12,
          openDisputes: 8,
          suspendedUsers: 3,
          avgTrustScore: 876,
          recentActions: [],
        }),
      })
      // Mock the rejected trust action creation call
      .mockRejectedValueOnce(new Error('Network error'));

    render(<TrustSafetyDashboard />);

    const userIdInput = screen.getByPlaceholderText('Target User ID');
    const actionSelect = screen.getByDisplayValue('Select Action Type');
    const descriptionInput = screen.getByPlaceholderText(
      'Action description (required)'
    );
    const submitButton = screen.getByText('Execute Action');

    fireEvent.change(userIdInput, { target: { value: 'user-123' } });
    fireEvent.change(actionSelect, { target: { value: 'USER_WARNING' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('displays automated flagging rules', () => {
    render(<TrustSafetyDashboard />);

    expect(screen.getByText('Automated Flagging System')).toBeInTheDocument();
    expect(screen.getByText('Multiple Failed Returns')).toBeInTheDocument();
    expect(screen.getByText('Suspicious Activity Pattern')).toBeInTheDocument();
    expect(screen.getByText('Trust Score Threshold')).toBeInTheDocument();
    expect(screen.getByText('Multiple Reports')).toBeInTheDocument();
  });

  it('shows empty state for recent actions', () => {
    render(<TrustSafetyDashboard />);

    expect(screen.getByText('Recent Admin Actions')).toBeInTheDocument();
    expect(screen.getByText('No recent actions')).toBeInTheDocument();
    expect(
      screen.getByText('Admin actions will appear here')
    ).toBeInTheDocument();
  });

  it('clears form after successful submission', async () => {
    // Mock the initial fetchStats call when component mounts
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalReports: 45,
          pendingReports: 12,
          openDisputes: 8,
          suspendedUsers: 3,
          avgTrustScore: 876,
          recentActions: [],
        }),
      })
      // Mock the trust action creation call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'action-1' }),
      })
      // Mock the fetchStats call that happens after successful submission
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalReports: 45,
          pendingReports: 12,
          openDisputes: 8,
          suspendedUsers: 3,
          avgTrustScore: 876,
          recentActions: [],
        }),
      });

    render(<TrustSafetyDashboard />);

    const userIdInput = screen.getByPlaceholderText('Target User ID');
    const actionSelect = screen.getByDisplayValue('Select Action Type');
    const descriptionInput = screen.getByPlaceholderText(
      'Action description (required)'
    );
    const reasonInput = screen.getByPlaceholderText('Reason (optional)');

    fireEvent.change(userIdInput, { target: { value: 'user-123' } });
    fireEvent.change(actionSelect, { target: { value: 'USER_WARNING' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });

    fireEvent.click(screen.getByText('Execute Action'));

    await waitFor(() => {
      expect(userIdInput).toHaveValue('');
      expect(actionSelect).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
      expect(reasonInput).toHaveValue('');
    });
  });

  it('handles error dismissal', async () => {
    render(<TrustSafetyDashboard />);

    const submitButton = screen.getByText('Execute Action');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Target user ID, action type, and description are required/
        )
      ).toBeInTheDocument();
    });

    const dismissButton = screen.getByText('×');
    fireEvent.click(dismissButton);

    expect(
      screen.queryByText(
        /Target user ID, action type, and description are required/
      )
    ).not.toBeInTheDocument();
  });
});

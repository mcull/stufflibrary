import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LibraryManagement } from '../LibraryManagement';

// Mock fetch globally
global.fetch = vi.fn();

describe('LibraryManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    render(<LibraryManagement />);

    expect(screen.getByText('Loading libraries...')).toBeInTheDocument();
  });

  it('displays libraries after loading', async () => {
    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  it('has search and filter inputs', async () => {
    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    expect(
      screen.getByPlaceholderText('Search libraries...')
    ).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
    expect(screen.getByText('Reset Filters')).toBeInTheDocument();
  });

  it('updates search filter when typing', async () => {
    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search libraries...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(searchInput).toHaveValue('test query');
  });

  it('updates status filter when changed', async () => {
    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    expect(statusSelect).toHaveValue('active');
  });

  it('resets filters when reset button clicked', async () => {
    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    // Set some filter values
    const searchInput = screen.getByPlaceholderText('Search libraries...');
    const statusSelect = screen.getByDisplayValue('All Status');

    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    expect(searchInput).toHaveValue('test');
    expect(statusSelect).toHaveValue('active');

    // Click reset
    const resetButton = screen.getByText('Reset Filters');
    fireEvent.click(resetButton);

    // Check filters are reset
    expect(searchInput).toHaveValue('');
    expect(statusSelect).toHaveValue('');
  });
});

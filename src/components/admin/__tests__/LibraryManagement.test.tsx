import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { LibraryManagement } from '../LibraryManagement';

// Mock fetch
global.fetch = vi.fn();

const mockLibraries = [
  {
    id: 'library-1',
    name: 'Test Library',
    description: 'Test library description',
    location: 'Test Location',
    isPublic: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    owner: {
      id: 'owner-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      image: null,
    },
    members: [
      {
        id: 'member-1',
        role: 'member',
        joinedAt: '2023-01-02T00:00:00Z',
        isActive: true,
        user: {
          id: 'user-1',
          name: 'Member One',
          email: 'member@example.com',
        },
      },
    ],
    totalMembers: 2,
    totalItems: 5,
    totalInvitations: 3,
    activeMembers: 2,
  },
];

const mockApiResponse = {
  libraries: mockLibraries,
  pagination: {
    total: 1,
    page: 1,
    limit: 50,
    pages: 1,
  },
};

describe('LibraryManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {}));

    render(<LibraryManagement />);

    expect(screen.getByText('Loading libraries...')).toBeInTheDocument();
  });

  it('renders libraries when fetch succeeds', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('Members: 2 (2 active)')).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('calls correct API endpoint', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/libraries?search=&isPublic=&page=1&limit=50'
      );
    });
  });

  it('allows filtering by search term', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      'Search libraries, owners...'
    );
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      );
    });
  });

  it('allows visibility filtering', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    const visibilitySelect = screen.getByDisplayValue('All Visibility');
    fireEvent.change(visibilitySelect, { target: { value: 'true' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('isPublic=true')
      );
    });
  });

  it('handles library selection', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[1]; // Skip "select all" checkbox
    if (checkbox) {
      fireEvent.click(checkbox);
    }

    expect(screen.getByText('1 library(ies) selected')).toBeInTheDocument();
  });

  it('expands library details when view details clicked', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(screen.getByText('Library Members')).toBeInTheDocument();
    expect(screen.getByText('Member One')).toBeInTheDocument();
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
  });

  it('collapses details when hide details clicked', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    // Expand first
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(screen.getByText('Library Members')).toBeInTheDocument();

    // Now collapse
    const hideDetailsButton = screen.getByText('Hide Details');
    fireEvent.click(hideDetailsButton);

    expect(screen.queryByText('Library Members')).not.toBeInTheDocument();
  });

  it('displays "No members found" when library has no members', async () => {
    const librariesWithNoMembers = {
      ...mockApiResponse,
      libraries: [
        {
          ...mockLibraries[0],
          members: [],
        },
      ],
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => librariesWithNoMembers,
    });

    render(<LibraryManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(screen.getByText('No members found')).toBeInTheDocument();
  });

  it('resets filters when reset button clicked', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<LibraryManagement />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Library')).toBeInTheDocument();
    });

    // Set some filters
    const searchInput = screen.getByPlaceholderText(
      'Search libraries, owners...'
    );
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Click reset
    const resetButton = screen.getByText('Reset Filters');
    fireEvent.click(resetButton);

    expect(searchInput).toHaveValue('');
  });
});

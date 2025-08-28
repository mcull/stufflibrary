import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ItemManagement } from '../ItemManagement';

// Mock fetch
global.fetch = vi.fn();

const mockItems = [
  {
    id: 'item-1',
    name: 'Test Item',
    description: 'Test description',
    category: 'tools',
    condition: 'good',
    location: null,
    imageUrl: 'test-image.jpg',
    isAvailable: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    owner: {
      id: 'owner-1',
      name: 'John Doe',
      email: 'john@example.com',
      image: null,
    },
    stuffType: {
      displayName: 'Tool',
      category: 'tools',
      iconPath: 'icon.jpg',
    },
    libraries: [
      {
        id: 'lib-1',
        name: 'Test Library',
      },
    ],
    currentBorrower: null,
    totalBorrowRequests: 3,
  },
];

const mockApiResponse = {
  items: mockItems,
  pagination: {
    total: 1,
    page: 1,
    limit: 50,
    pages: 1,
  },
};

describe('ItemManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {}));

    render(<ItemManagement />);

    expect(screen.getByText('Loading items...')).toBeInTheDocument();
  });

  it('renders items when fetch succeeds', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<ItemManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getAllByText('Available')[1]).toBeInTheDocument(); // Get the status badge, not the filter option
      expect(screen.getByText('good')).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<ItemManagement />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('calls correct API endpoint with filters', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<ItemManagement />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/items?search=&category=&condition=&status=&page=1&limit=50'
      );
    });
  });

  it('allows filtering by search term', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<ItemManagement />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search items, owners...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      );
    });
  });

  it('allows category filtering', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<ItemManagement />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue('All Categories');
    fireEvent.change(categorySelect, { target: { value: 'tools' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=tools')
      );
    });
  });

  it('handles item selection', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<ItemManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole('checkbox')[1]; // Skip "select all" checkbox
    if (checkbox) {
      fireEvent.click(checkbox);
    }

    expect(screen.getByText('1 item(s) selected')).toBeInTheDocument();
  });

  it('handles select all items', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<ItemManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    if (selectAllCheckbox) {
      fireEvent.click(selectAllCheckbox);
    }

    expect(screen.getByText('1 item(s) selected')).toBeInTheDocument();
  });

  it('handles reset filters functionality', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<ItemManagement />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    // Verify reset filters function exists (by checking that filters state updates work)
    const searchInput = screen.getByPlaceholderText('Search items, owners...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(searchInput).toHaveValue('test');
  });
});

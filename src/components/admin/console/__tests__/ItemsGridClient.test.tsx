import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ItemsGridClient } from '../ItemsGridClient';

const item = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  name: 'Stand mixer',
  category: 'kitchen',
  active: true,
  isAvailable: true,
  imageUrl: null,
  watercolorUrl: 'https://cdn.example/mixer.png',
  watercolorThumbUrl: null,
  owner: { id: 'o1', name: 'Jenny L.', email: 'jenny@example.com' },
  libraries: [{ id: 'l1', name: 'Maple St Library' }],
  ...over,
});

const payload = (items: unknown[], total = items.length) => ({
  items,
  pagination: {
    total,
    page: 1,
    limit: 25,
    pages: Math.max(1, Math.ceil(total / 25)),
  },
});

function stubFetch(body: unknown = payload([item()]), ok = true) {
  const mock = vi.fn((_url: string, _init?: RequestInit) =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body })
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ItemsGridClient', () => {
  it('renders a card: name, category · owner line, and library', async () => {
    stubFetch();
    render(<ItemsGridClient />);

    expect(await screen.findByText('Stand mixer')).toBeInTheDocument();
    expect(screen.getByText('kitchen · Jenny L.')).toBeInTheDocument();
    expect(screen.getByText('Maple St Library')).toBeInTheDocument();
    // The card links to the public item page in a new tab
    const link = screen.getByRole('link', { name: /Stand mixer/ });
    expect(link).toHaveAttribute('href', '/stuff/i1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('wears the three honest shelf stamps for draft, on-shelf, and out items', async () => {
    stubFetch(
      payload([
        item({ id: 'draft', name: 'Draft item', active: false }),
        item({
          id: 'shelf',
          name: 'Shelf item',
          active: true,
          isAvailable: true,
        }),
        item({ id: 'out', name: 'Out item', active: true, isAvailable: false }),
      ])
    );
    render(<ItemsGridClient />);

    expect(await screen.findByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('ON SHELF')).toBeInTheDocument();
    expect(screen.getByText('OUT')).toBeInTheDocument();
  });

  it('falls back to a 📦 box and an em-dash line when an item has no art or owner', async () => {
    stubFetch(
      payload([
        item({
          watercolorUrl: null,
          watercolorThumbUrl: null,
          imageUrl: null,
          category: null,
          owner: { id: 'o2', name: null, email: null },
          libraries: [],
        }),
      ])
    );
    render(<ItemsGridClient />);

    expect(await screen.findByText('📦')).toBeInTheDocument();
    expect(screen.getByText('— · —')).toBeInTheDocument();
    // Library falls back to an em dash too, never a fabricated name
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('refetches with category=tools when the Tools chip is clicked', async () => {
    const fetchMock = stubFetch();
    render(<ItemsGridClient />);
    await screen.findByText('Stand mixer');

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('category=tools'))).toBe(true);
    });
  });

  it('debounces search into a search= query param', async () => {
    const fetchMock = stubFetch();
    render(<ItemsGridClient />);
    await screen.findByText('Stand mixer');

    fireEvent.change(screen.getByLabelText('Search items'), {
      target: { value: 'ladder' },
    });

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('search=ladder'))).toBe(true);
    });
  });

  it('shows the pagination label and disables PREV on page one', async () => {
    stubFetch(payload([item()], 312));
    render(<ItemsGridClient />);

    expect(await screen.findByText('SHOWING 1–1 OF 312')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PREV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'NEXT' })).toBeEnabled();
  });

  it('shows the empty line when nothing matches', async () => {
    stubFetch(payload([]));
    render(<ItemsGridClient />);

    expect(await screen.findByText('No items match.')).toBeInTheDocument();
    expect(screen.getByText('SHOWING 0 OF 0')).toBeInTheDocument();
  });

  it('shows the honest error line when the catalog fetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch({ error: 'nope' }, false);
    render(<ItemsGridClient />);

    expect(
      await screen.findByText('COULD NOT REACH THE DESK — refresh to retry')
    ).toBeInTheDocument();
  });
});

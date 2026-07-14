import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminLibraryRow } from '@/app/api/admin/libraries/route';

import { BranchAtlasClient } from '../BranchAtlasClient';

// jsdom has no window.google and there's no API key in tests, so the real
// BranchAtlasMap already renders its honest no-key note. We render it live to
// prove the Atlas never crashes without Maps — no Google behavior is asserted.

const branch = (over: Partial<AdminLibraryRow> = {}): AdminLibraryRow => ({
  id: 'lib1',
  name: 'Maple St Library',
  isArchived: false,
  createdAt: '2026-03-15T12:00:00Z',
  ownerName: 'Jenny L.',
  memberCount: 214,
  itemCount: 612,
  borrows30d: 88,
  centroid: { lat: 10, lng: 20 },
  ...over,
});

function stubFetch(libraries: AdminLibraryRow[], ok = true) {
  const mock = vi.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: async () => ({ libraries }),
    })
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

// Force the map's no-key degradation path so this suite can't flake on a dev
// machine that happens to have the Maps key set in its env.
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BranchAtlasClient', () => {
  it('renders a register row with name, members·items, and borrows/mo', async () => {
    stubFetch([branch()]);
    render(<BranchAtlasClient />);

    expect(await screen.findByText('Maple St Library')).toBeInTheDocument();
    expect(screen.getByText('214 members · 612 items')).toBeInTheDocument();
    expect(screen.getByText('88/mo')).toBeInTheDocument();
    expect(screen.getByText('1 BRANCHES')).toBeInTheDocument();
    // Map degrades to its honest note (no key / no google in jsdom)
    expect(
      screen.getByText(/Map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY/)
    ).toBeInTheDocument();
  });

  it('opens the casefile with the right stats and steward on row click', async () => {
    stubFetch([branch()]);
    render(<BranchAtlasClient />);

    // Before selection: the prompt
    expect(
      await screen.findByText('Select a branch to see its casefile.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Maple St Library'));

    expect(await screen.findByText('Steward · Jenny L.')).toBeInTheDocument();
    expect(screen.getByText('MEMBERS')).toBeInTheDocument();
    expect(screen.getByText('BORROWS · 30D')).toBeInTheDocument();
    expect(screen.getByText('ESTABLISHED')).toBeInTheDocument();
    // Established reads Mar 2026 in the casefile
    expect(screen.getByText('Mar 2026')).toBeInTheDocument();
    // OPEN LIBRARY links to the library, new tab, noopener
    const link = screen.getByRole('link', { name: /OPEN LIBRARY/i });
    expect(link).toHaveAttribute('href', '/library/lib1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('selects a focused register row with the Enter key', async () => {
    stubFetch([branch()]);
    render(<BranchAtlasClient />);

    await screen.findByText('Maple St Library');
    // The register is a keyboard-navigable listbox of options
    const option = screen.getByRole('option', { name: /Maple St Library/i });
    option.focus();
    fireEvent.keyDown(option, { key: 'Enter' });

    expect(await screen.findByText('Steward · Jenny L.')).toBeInTheDocument();
    expect(option).toHaveAttribute('aria-selected', 'true');
  });

  it('marks an off-map branch in the register and its casefile', async () => {
    stubFetch([branch({ id: 'off', name: 'Ghost Branch', centroid: null })]);
    render(<BranchAtlasClient />);

    expect(await screen.findByText('Ghost Branch')).toBeInTheDocument();
    expect(screen.getByText('OFF MAP')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ghost Branch'));
    expect(
      await screen.findByText('off map — no located members')
    ).toBeInTheDocument();
  });

  it('dims an archived branch and tags it ARCHIVED', async () => {
    stubFetch([
      branch({ id: 'arch', name: 'Retired Branch', isArchived: true }),
    ]);
    const { container } = render(<BranchAtlasClient />);

    expect(await screen.findByText('Retired Branch')).toBeInTheDocument();
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
    expect(container.querySelector('[style*="opacity: 0.55"]')).not.toBeNull();
  });

  it('shows an empty state when there are no libraries', async () => {
    stubFetch([]);
    render(<BranchAtlasClient />);
    expect(await screen.findByText('No libraries yet.')).toBeInTheDocument();
  });

  it('shows the desk error line when the fetch fails', async () => {
    stubFetch([], false);
    render(<BranchAtlasClient />);
    await waitFor(() => {
      expect(
        screen.getAllByText(/COULD NOT REACH THE DESK/).length
      ).toBeGreaterThan(0);
    });
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AddressAutocomplete } from '../AddressAutocomplete';

// The bug: Google returns canonical abbreviations ("6891 Exeter Dr"), but the
// user types the full form ("6891 Exeter Drive"). MUI's default filterOptions
// substring-matches the typed input against each option label, so the correct
// suggestion — already filtered by the server — is discarded and the dropdown
// shows "No options". This asserts the suggestion survives.

const ABBREVIATED = '6891 Exeter Dr, Oakland, CA 94611';

beforeEach(() => {
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      predictions: [
        {
          description: ABBREVIATED,
          place_id: 'place-123',
          structured_formatting: {
            main_text: '6891 Exeter Dr',
            secondary_text: 'Oakland, CA 94611',
          },
        },
      ],
    }),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AddressAutocomplete does not re-filter server results', () => {
  it('shows the abbreviated suggestion even when the user types the full street type', async () => {
    render(<AddressAutocomplete onChange={vi.fn()} />);

    const input = screen.getByRole('combobox');
    // The exact case that breaks under MUI's default filter: the option label
    // ("...Exeter Dr...") is NOT a substring of this typed value.
    fireEvent.change(input, {
      target: { value: '6891 Exeter Drive, Oakland, CA 94611' },
    });

    // Debounce is 300ms; waitFor polls until the fetched option renders.
    await waitFor(
      () => {
        expect(screen.getByText(ABBREVIATED)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});

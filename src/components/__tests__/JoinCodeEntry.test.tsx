import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { JoinCodeEntry } from '../JoinCodeEntry';

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function reveal() {
  fireEvent.click(screen.getByRole('button', { name: /have a code/i }));
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('JoinCodeEntry', () => {
  it('does not fetch on mount', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<JoinCodeEntry />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reveals the field only after the prompt is clicked', () => {
    render(<JoinCodeEntry />);
    expect(screen.queryByLabelText('Join code')).toBeNull();
    reveal();
    expect(screen.getByLabelText('Join code')).toBeTruthy();
  });

  it('navigates to /join on a valid code', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    );
    render(<JoinCodeEntry />);
    reveal();
    fireEvent.change(screen.getByLabelText('Join code'), {
      target: { value: 'xkf7-2m9q' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/join/xkf7-2m9q'));
  });

  it('shows an inline error and does not navigate on a bad code', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { ok: false }))
    );
    render(<JoinCodeEntry />);
    reveal();
    fireEvent.change(screen.getByLabelText('Join code'), {
      target: { value: 'ZZZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    await waitFor(() => expect(screen.getByText(/didn't match/i)).toBeTruthy());
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows a throttle message on 429 and does not navigate', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(429, {})));
    render(<JoinCodeEntry />);
    reveal();
    fireEvent.change(screen.getByLabelText('Join code'), {
      target: { value: 'ZZZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    await waitFor(() =>
      expect(screen.getByText(/too many tries/i)).toBeTruthy()
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('shows an inline error when the request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<JoinCodeEntry />);
    reveal();
    fireEvent.change(screen.getByLabelText('Join code'), {
      target: { value: 'ZZZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));
    await waitFor(() => expect(screen.getByText(/didn't match/i)).toBeTruthy());
  });
});

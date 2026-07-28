import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { usePendingInvitations } from '../usePendingInvitations';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE = {
  id: 'inv1',
  token: 'tok1',
  collection: {
    id: 'lib1',
    name: 'Maple Street Tools',
    location: null,
    owner: { name: 'Dana', email: 'dana@example.com' },
    memberCount: 14,
  },
  invitedBy: { name: 'Dana', email: 'dana@example.com' },
  createdAt: '2026-07-20T00:00:00.000Z',
  expiresAt: '2026-08-03T00:00:00.000Z',
};

describe('usePendingInvitations', () => {
  it('returns the invitations from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { invitations: [SAMPLE] }))
    );
    const { result } = renderHook(() => usePendingInvitations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.invitations).toHaveLength(1);
    expect(result.current.invitations[0]!.collection.name).toBe(
      'Maple Street Tools'
    );
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error and empties the list on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, {})));
    const { result } = renderHook(() => usePendingInvitations());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.invitations).toEqual([]);
  });
});

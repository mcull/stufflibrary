import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SystemHealthCard } from '../SystemHealthCard';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubHealthFetch(body: unknown, ok: boolean, status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok, status, json: async () => body }))
  );
}

describe('SystemHealthCard', () => {
  it('reads a degraded 503 body and stamps ATTENTION with the failing service', async () => {
    // /api/health answers 503 WITH a full per-service body when degraded —
    // the body is the signal, not the HTTP status.
    stubHealthFetch(
      {
        status: 'DEGRADED',
        services: {
          database: { status: 'OK', message: 'Database connection successful' },
          redis: { status: 'ERROR', message: 'Redis connection refused' },
          storage: { status: 'OK', message: 'Storage connection successful' },
          ai: { status: 'OK', message: 'AI service connection successful' },
        },
        timestamp: '2026-07-13T14:24:48.000Z',
      },
      false,
      503
    );
    render(<SystemHealthCard />);

    expect(await screen.findByText('ATTENTION')).toBeInTheDocument();
    expect(screen.getByText('Redis cache')).toBeInTheDocument();
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.queryByText('ALL SYSTEMS NOMINAL')).toBeNull();
  });

  it('shows the failure line when the response has no services shape', async () => {
    stubHealthFetch({ message: 'gateway timeout' }, true, 200);
    render(<SystemHealthCard />);

    expect(
      await screen.findByText('COULD NOT REACH THE DESK — refresh to retry')
    ).toBeInTheDocument();
  });
});

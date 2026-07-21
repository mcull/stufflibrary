import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockSearchParams = vi.hoisted(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
// AuthLayout pulls the session provider and site chrome in; the form is what
// this file is about.
vi.mock('@/components/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import SignIn from '../page';

const emailField = () =>
  screen.getByPlaceholderText('your.email@example.com') as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [...mockSearchParams.keys()]) mockSearchParams.delete(key);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stubs the one endpoint the bound-invite effect calls. */
function stubInviteContext(invite: unknown) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/invite/context') {
      return { json: async () => ({ invite }) } as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('sign-in with a bound personal invite', () => {
  it('prefills the invited address from the cookie-backed endpoint', async () => {
    stubInviteContext({ email: 'dave@example.com', libraryName: 'Tool Shed' });

    render(<SignIn />);

    await waitFor(() => expect(emailField().value).toBe('dave@example.com'));
  });

  // Binding is the whole point. A field that prefills but stays editable lets
  // a forwardee retarget Dave's invitation by typing over it.
  it('locks the field so the invitation cannot be retargeted by typing', async () => {
    stubInviteContext({ email: 'dave@example.com', libraryName: 'Tool Shed' });

    render(<SignIn />);

    await waitFor(() => expect(emailField().value).toBe('dave@example.com'));
    expect(emailField()).toBeDisabled();
  });

  it('says whose invitation this is', async () => {
    stubInviteContext({ email: 'dave@example.com', libraryName: 'Tool Shed' });

    render(<SignIn />);

    expect(await screen.findByText(/you were invited as/i)).toHaveTextContent(
      'dave@example.com'
    );
  });

  it('never puts the address in the URL it asks for', async () => {
    const fetchMock = stubInviteContext({
      email: 'dave@example.com',
      libraryName: 'Tool Shed',
    });

    render(<SignIn />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    for (const [url] of fetchMock.mock.calls) {
      expect(url).not.toContain('@');
      expect(url).not.toContain('email=');
    }
  });

  it('leaves the field open and empty when there is no invite', async () => {
    const fetchMock = stubInviteContext(null);

    render(<SignIn />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(emailField()).not.toBeDisabled());
    expect(emailField().value).toBe('');
    expect(screen.queryByText(/you were invited as/i)).toBeNull();
  });

  it('leaves the field open when the endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      })
    );

    render(<SignIn />);

    await waitFor(() => expect(emailField()).not.toBeDisabled());
  });

  // The legacy `?invitation=` and `?email=` paths carry their own prefill and
  // are explicitly not bound — they must not be locked by this effect.
  it('does not consult the invite cookie on the legacy magic-link path', async () => {
    mockSearchParams.set('email', 'someone@else.com');
    const fetchMock = stubInviteContext({
      email: 'dave@example.com',
      libraryName: 'Tool Shed',
    });

    render(<SignIn />);

    await waitFor(() => expect(emailField()).not.toBeDisabled());
    expect(fetchMock).not.toHaveBeenCalledWith('/api/invite/context');
  });
});

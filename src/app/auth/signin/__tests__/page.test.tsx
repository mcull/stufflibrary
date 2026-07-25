import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signIn } from 'next-auth/react';
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

/**
 * Stubs both the bound-invite lookup and the send-code endpoint, so a test
 * can drive the form past the email step into the code step.
 */
function stubInviteAndSendCode(invite: unknown) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/invite/context') {
      return { json: async () => ({ invite }) } as Response;
    }
    if (url === '/api/auth/send-code') {
      return { ok: true, json: async () => ({}) } as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Submits the email step's form to advance to the code step. */
async function advanceToCodeStep() {
  const continueButton = await screen.findByRole('button', {
    name: /continue/i,
  });
  fireEvent.click(continueButton);
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

describe('the code step, staged as the stamp', () => {
  it('frames a bound invite as "we stamped your card" with a masked, locked address', async () => {
    stubInviteAndSendCode({
      email: 'dave@example.com',
      libraryName: 'Tool Shed',
    });

    render(<SignIn />);

    await waitFor(() => expect(emailField().value).toBe('dave@example.com'));
    await advanceToCodeStep();

    expect(
      await screen.findByText(/we stamped your card/i)
    ).toBeInTheDocument();
    // Masked: first char of the local part, then the domain in full.
    expect(screen.getByText(/d•••@example\.com/)).toBeInTheDocument();
    // The full local part must never appear on this step.
    expect(screen.queryByText(/dave@example\.com/)).toBeNull();
  });

  it('keeps plain sign-in neutral, with no masked address chip', async () => {
    const fetchMock = stubInviteAndSendCode(null);

    render(<SignIn />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.change(emailField(), { target: { value: 'newby@example.com' } });
    await advanceToCodeStep();

    expect(await screen.findByText(/enter your code/i)).toBeInTheDocument();
    expect(screen.queryByText(/we stamped your card/i)).toBeNull();
    expect(screen.queryByText(/•••@/)).toBeNull();
    // Six single-digit cells replace the old one-line code field.
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('starts a disabled resend countdown once the code has been sent', async () => {
    const fetchMock = stubInviteAndSendCode(null);

    render(<SignIn />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.change(emailField(), { target: { value: 'newby@example.com' } });
    await advanceToCodeStep();

    const resendButton = await screen.findByRole('button', {
      name: /re-stamp in/i,
    });
    expect(resendButton).toBeDisabled();
  });

  // Regression: the sixth digit auto-submits, and the submit must carry the
  // full six-digit value — not the five-digit `code` state from before the
  // last cell re-rendered.
  it('auto-submits the full six-digit code, not a stale five', async () => {
    (signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: 'CredentialsSignin',
    });
    const fetchMock = stubInviteAndSendCode(null);

    render(<SignIn />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.change(emailField(), { target: { value: 'newby@example.com' } });
    await advanceToCodeStep();

    await screen.findByLabelText('Digit 1 of 6');
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(cells).toHaveLength(6);
    '508213'.split('').forEach((digit, i) => {
      fireEvent.change(cells[i]!, { target: { value: digit } });
    });

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith(
        'email-code',
        expect.objectContaining({ code: '508213' })
      )
    );
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ManageMembersModal } from '../ManageMembersModal';

function mockFetchOk(body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ManageMembersModal — personal note', () => {
  it('pre-fills the note with an editable default and posts it', async () => {
    const fetchMock = mockFetchOk({ members: [], invitations: [] });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <ManageMembersModal
        open
        onClose={() => {}}
        collectionId="lib_1"
        collectionName="HAASS"
        userRole="owner"
        initialTab={1}
      />
    );

    const note = (await screen.findByLabelText(/note/i)) as HTMLTextAreaElement;
    expect(note.value).toContain('HAASS');

    const emailField = screen.getByLabelText(/email/i);
    fireEvent.change(emailField, { target: { value: 'nora@example.com' } });
    fireEvent.change(note, { target: { value: 'Come borrow the saw.' } });
    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      const inviteCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          String(url).endsWith('/invite') && opts?.method === 'POST'
      );
      expect(inviteCall).toBeTruthy();
      const sent = JSON.parse(inviteCall![1].body);
      expect(sent.email).toBe('nora@example.com');
      expect(sent.note).toBe('Come borrow the saw.');
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemberRecordModal } from '../MemberRecordModal';

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const borrow = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  status: 'PENDING',
  createdAt: daysAgo(2),
  item: { id: 'i1', name: 'Circular saw' },
  ...over,
});

const record = (over: Record<string, unknown> = {}) => ({
  user: {
    id: 'u1',
    name: 'Jenny L.',
    email: 'jenny@example.com',
    phone: null,
    phoneVerified: false,
    bio: null,
    status: 'active',
    createdAt: '2026-03-15T12:00:00Z',
    // The regression that matters: the PERSISTED score, not a recomputed one.
    trustScore: 50,
    trustTier: 'TRUSTED',
    addresses: [],
    borrowRequests: [],
    _count: { items: 3, borrowRequests: 0, ownedCollections: 0 },
    metrics: {
      recentActivity: 0,
      totalBorrowRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      pendingRequests: 0,
      approvalRate: 0,
    },
    ...over,
  },
});

function stubFetch(body: unknown = record(), ok = true) {
  const mock = vi.fn((_url: string) =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body })
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MemberRecordModal', () => {
  it('renders the card header: name, email, member-since line', async () => {
    stubFetch();
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    expect(await screen.findByText('Jenny L.')).toBeInTheDocument();
    // Email prints twice: under the name and again in CONTACT.
    expect(screen.getAllByText('jenny@example.com')).toHaveLength(2);
    expect(screen.getByText('MEMBER SINCE Mar 2026')).toBeInTheDocument();
  });

  it('shows city and state only — never the street address', async () => {
    stubFetch(
      record({
        addresses: [
          {
            id: 'a1',
            address1: '742 Evergreen Terrace',
            address2: 'Unit B',
            city: 'Berkeley',
            state: 'CA',
            zip: '94703',
          },
        ],
      })
    );
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    expect(await screen.findByText(/Berkeley, CA/)).toBeInTheDocument();
    expect(screen.queryByText(/Evergreen Terrace/)).toBeNull();
    expect(screen.queryByText(/94703/)).toBeNull();
  });

  it('shows the PERSISTED trust numeral and the warm tier name', async () => {
    // 50 with profile/phone unverified would have read near 0 under the
    // deleted legacy formula — the record must show the trust system's 50.
    stubFetch();
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    expect(await screen.findByText('50')).toBeInTheDocument();
    expect(screen.getByText('Trusted neighbor')).toBeInTheDocument();
  });

  it('reads — for approval rate at zero requests and "not provided" for no phone', async () => {
    stubFetch();
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    await screen.findByText('Jenny L.');
    expect(screen.getByText('APPROVAL')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('not provided')).toBeInTheDocument();
  });

  it('shows a verified phone with its green check', async () => {
    stubFetch(record({ phone: '+15551234567', phoneVerified: true }));
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    expect(await screen.findByText('+15551234567')).toBeInTheDocument();
    expect(screen.getByText('✓ verified')).toBeInTheDocument();
  });

  it('lists recent borrows with the item name and its status stamp', async () => {
    stubFetch(
      record({
        borrowRequests: [
          borrow(),
          borrow({
            id: 'b2',
            status: 'RETURNED',
            item: { id: 'i2', name: 'Ladder' },
          }),
        ],
        _count: { items: 3, borrowRequests: 2, ownedCollections: 0 },
        metrics: {
          recentActivity: 2,
          totalBorrowRequests: 2,
          approvedRequests: 0,
          rejectedRequests: 0,
          pendingRequests: 1,
          approvalRate: 0,
        },
      })
    );
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    expect(await screen.findByText('Circular saw')).toBeInTheDocument();
    expect(screen.getByText('REQUESTED')).toBeInTheDocument();
    expect(screen.getByText('Ladder')).toBeInTheDocument();
    expect(screen.getByText('RETURNED')).toBeInTheDocument();
  });

  it('renders the bio as a margin note when present', async () => {
    stubFetch(record({ bio: 'Happy to lend most weekends.' }));
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    expect(
      await screen.findByText('Happy to lend most weekends.')
    ).toBeInTheDocument();
  });

  it('shows the honest error line when the record cannot be pulled', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch({ error: 'nope' }, false);
    render(<MemberRecordModal userId="u1" isOpen onClose={() => {}} />);

    expect(
      await screen.findByText('COULD NOT REACH THE DESK — refresh to retry')
    ).toBeInTheDocument();
  });

  it('fires onClose from the CLOSE button and the corner ✕', async () => {
    stubFetch();
    const onClose = vi.fn();
    render(<MemberRecordModal userId="u1" isOpen onClose={onClose} />);

    await screen.findByText('Jenny L.');
    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

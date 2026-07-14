import { NextRequest, NextResponse } from 'next/server';

import { mapCirculationEvent } from '@/lib/admin/desk';
import type { RawCirculationEvent } from '@/lib/admin/desk';
import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

const PER_SOURCE_TAKE = 15;
const DEFAULT_LIMIT = 30;
// 5 sources × PER_SOURCE_TAKE = 75 events max, so a higher cap is unreachable.
const MAX_LIMIT = 75;

const FALLBACK_ACTOR = 'A member';

function dueLabel(date: Date): string {
  return `due ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const parsed = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(parsed, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const [openBorrows, returns, joins, renders, invites] = await Promise.all([
      db.borrowRequest.findMany({
        where: { status: { in: ['PENDING', 'ACTIVE', 'APPROVED'] } },
        // Ordered by updatedAt but stamped at createdAt/approvedAt below; the
        // mismatch can shuffle which rows make the cut — acceptable at current scale.
        orderBy: { updatedAt: 'desc' },
        take: PER_SOURCE_TAKE,
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          approvedAt: true,
          requestedReturnDate: true,
          borrower: { select: { name: true } },
          item: { select: { name: true } },
        },
      }),
      db.borrowRequest.findMany({
        where: { status: 'RETURNED' },
        orderBy: { returnedAt: 'desc' },
        take: PER_SOURCE_TAKE,
        select: {
          id: true,
          updatedAt: true,
          returnedAt: true,
          returnCondition: true,
          borrower: { select: { name: true } },
          item: { select: { name: true } },
        },
      }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: PER_SOURCE_TAKE,
        select: {
          id: true,
          name: true,
          createdAt: true,
          collectionMemberships: {
            orderBy: { joinedAt: 'asc' },
            take: 1,
            select: { collection: { select: { name: true } } },
          },
        },
      }),
      db.auditLog.findMany({
        where: { action: 'AI_RENDER' },
        orderBy: { createdAt: 'desc' },
        take: PER_SOURCE_TAKE,
        select: { id: true, createdAt: true, metadata: true },
      }),
      db.invitation.findMany({
        where: { sentAt: { not: null } },
        orderBy: { sentAt: 'desc' },
        take: PER_SOURCE_TAKE,
        select: {
          id: true,
          sentAt: true,
          createdAt: true,
          sender: { select: { name: true } },
          collection: { select: { name: true } },
        },
      }),
    ]);

    const events: RawCirculationEvent[] = [];

    for (const b of openBorrows) {
      if (b.status === 'PENDING') {
        events.push({
          id: `request-${b.id}`,
          at: b.createdAt,
          kind: 'request',
          actor: b.borrower.name ?? FALLBACK_ACTOR,
          subject: b.item.name,
        });
      } else {
        events.push({
          id: `borrow-${b.id}`,
          at: b.approvedAt ?? b.updatedAt,
          kind: 'borrow',
          actor: b.borrower.name ?? FALLBACK_ACTOR,
          subject: b.item.name,
          // No library name here: Item↔Collection is many-to-many via
          // ItemCollection, so "the" library of a borrow is ambiguous.
          detail: dueLabel(b.requestedReturnDate),
        });
      }
    }

    for (const r of returns) {
      events.push({
        id: `return-${r.id}`,
        at: r.returnedAt ?? r.updatedAt,
        kind: 'return',
        actor: r.borrower.name ?? FALLBACK_ACTOR,
        subject: r.item.name,
        detail: r.returnCondition
          ? `condition: ${r.returnCondition.toLowerCase()}`
          : '',
      });
    }

    for (const u of joins) {
      events.push({
        id: `join-${u.id}`,
        at: u.createdAt,
        kind: 'join',
        actor: u.name ?? FALLBACK_ACTOR,
        subject: u.collectionMemberships[0]?.collection.name ?? 'StuffLibrary',
      });
    }

    for (const log of renders) {
      const meta = (log.metadata ?? {}) as Record<string, unknown>;
      if (meta.status !== 'ok') continue; // failed renders aren't circulation
      const costCents = meta.cost_cents;
      events.push({
        id: `render-${log.id}`,
        at: log.createdAt,
        kind: 'render',
        // ai-usage metadata carries model/cost, not the item's name.
        subject: 'an item',
        detail:
          typeof costCents === 'number'
            ? `$${(costCents / 100).toFixed(2)} · ${String(meta.model)}`
            : undefined,
      });
    }

    for (const inv of invites) {
      events.push({
        id: `invite-${inv.id}`,
        at: inv.sentAt ?? inv.createdAt,
        kind: 'invite',
        actor: inv.sender?.name ?? FALLBACK_ACTOR,
        subject: inv.collection?.name ?? '',
      });
    }

    const rows = events
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit)
      .map(mapCirculationEvent);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Admin circulation ledger fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createJoinCode } from '@/lib/join-code-service';
import { getUserCapabilities } from '@/lib/user-capabilities';

/**
 * Minting a join code is inviting — the paper it goes on brings strangers into
 * a neighborhood — so it sits behind the same gate as sending an invitation
 * rather than behind bare owner/admin membership.
 */
async function gate(libraryId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return {
      userId: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const caps = await getUserCapabilities(userId, { libraryId });
  if (!caps.canInvite) {
    return {
      userId: null,
      response: NextResponse.json(
        {
          error:
            caps.reasons.canInvite === 'NEEDS_TRUST_TIER'
              ? 'You need to reach the Trusted tier before inviting others to this library.'
              : 'Add a photo and verify your address before inviting neighbors.',
          reason: caps.reasons.canInvite,
        },
        { status: 403 }
      ),
    };
  }

  return { userId, response: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { response } = await gate(id);
  if (response) return response;

  // Every live code, one row each, exactly as stored.
  //
  // Rotation creates the replacement BEFORE deactivating the old row, so that
  // a failed deactivation strands two live codes sharing one label instead of
  // leaving zero and silently killing every flyer already in a mailbox. Two is
  // survivable only because the admin can see both and rotate again. Grouping
  // or deduplicating by label here would hide precisely the failure that
  // ordering was chosen to expose.
  const codes = await db.joinCode.findMany({
    where: { collectionId: id, isActive: true },
    select: {
      id: true,
      code: true,
      label: true,
      useCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ codes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, response } = await gate(id);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as { label?: string };
  const label =
    typeof body.label === 'string' && body.label.trim()
      ? body.label.trim()
      : undefined;

  const created = await createJoinCode(id, userId!, label);

  return NextResponse.json(
    {
      code: {
        id: created.id,
        code: created.code,
        label: created.label,
        useCount: created.useCount,
        createdAt: created.createdAt,
      },
    },
    { status: 201 }
  );
}

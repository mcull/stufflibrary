import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { rotateJoinCode } from '@/lib/join-code-service';
import { getUserCapabilities } from '@/lib/user-capabilities';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; codeId: string }> }
) {
  const { id, codeId } = await params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const caps = await getUserCapabilities(userId, { libraryId: id });
  if (!caps.canInvite) {
    return NextResponse.json(
      {
        error:
          caps.reasons.canInvite === 'NEEDS_TRUST_TIER'
            ? 'You need to reach the Trusted tier before inviting others to this library.'
            : 'Add a photo and verify your address before inviting neighbors.',
        reason: caps.reasons.canInvite,
      },
      { status: 403 }
    );
  }

  // The library id is passed through, not just used for the gate: the caller
  // was authorized against `id`, but `codeId` is a separate path segment they
  // also chose. Without scoping the rotation to this library, an admin of one
  // library could revoke another library's corkboard by naming its id.
  const replacement = await rotateJoinCode(codeId, userId, id);
  if (!replacement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // The replacement, never the code just revoked — this response is what the
  // admin reprints.
  return NextResponse.json({
    code: {
      id: replacement.id,
      code: replacement.code,
      label: replacement.label,
      useCount: replacement.useCount,
      createdAt: replacement.createdAt,
    },
  });
}

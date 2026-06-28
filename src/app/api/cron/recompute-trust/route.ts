import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { recomputeUserTrustScore } from '@/lib/trust-score';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await db.user.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  for (const u of users) {
    await recomputeUserTrustScore(u.id);
  }

  return NextResponse.json({ processed: users.length });
}

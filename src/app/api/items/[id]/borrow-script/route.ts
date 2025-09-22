import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { AIService } from '@/lib/ai';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await params;
    // Fetch full item with owner (cast as any to allow newly added field access without regenerated types)
    const item: any = await db.item.findUnique({
      where: { id: itemId },
      include: { owner: { select: { name: true } } },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // If we already have one, return it
    if (item.suggestedBorrowScript) {
      return NextResponse.json({ script: item.suggestedBorrowScript });
    }

    // Generate and persist
    const result = await AIService.generateBorrowScript({
      lenderName: item.owner?.name || 'there',
      itemName: item.name,
      itemDescription: item.description ?? null,
      identifier: (session.user as any).id || 'anon',
    });

    const script =
      (result.success && result.script) ||
      `Hey ${(item.owner?.name || 'there').split(' ')[0]}, I'd love to borrow your ${item.name} for a few days. I'm putting together a little project and yours would be perfect — I could grab it any day after work.`;

    await (db.item.update as any)({
      where: { id: itemId },
      data: { suggestedBorrowScript: script },
    });

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error generating borrow script:', error);
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { itemId, libraryIds } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Activating item:', itemId);

    // Check ownership
    const item = await db.item.findUnique({
      where: { id: itemId },
      select: { ownerId: true, active: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Activate the item
    await db.item.update({
      where: { id: itemId },
      data: { active: true },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        stuffType: {
          select: { displayName: true, category: true, iconPath: true },
        },
        libraries: {
          include: {
            library: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Add to libraries if specified
    if (libraryIds && libraryIds.length > 0) {
      await db.$transaction(
        libraryIds.map((libraryId: string) =>
          db.itemLibrary.create({
            data: { itemId: itemId, libraryId: libraryId },
          })
        )
      );
    }

    // Fetch final item with libraries
    const finalItem = await db.item.findUnique({
      where: { id: itemId },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        stuffType: {
          select: { displayName: true, category: true, iconPath: true },
        },
        libraries: {
          include: {
            library: { select: { id: true, name: true } },
          },
        },
      },
    });

    console.log('✅ Item activated successfully');

    return NextResponse.json({
      itemId: finalItem!.id,
      item: {
        id: finalItem!.id,
        name: finalItem!.name,
        description: finalItem!.description,
        condition: finalItem!.condition,
        imageUrl: finalItem!.imageUrl,
        watercolorUrl: finalItem!.watercolorUrl,
        watercolorThumbUrl: finalItem!.watercolorThumbUrl,
        isAvailable: !finalItem!.currentBorrowRequestId,
        createdAt: finalItem!.createdAt,
        owner: finalItem!.owner,
        stuffType: finalItem!.stuffType,
        libraries: finalItem!.libraries.map((il) => il.library),
        active: finalItem!.active,
      },
    });
  } catch (error) {
    console.error('❌ Error activating item:', error);
    return NextResponse.json(
      {
        error: 'Failed to activate item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

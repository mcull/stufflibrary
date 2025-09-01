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

    const body = await request.json();
    const {
      itemId,
      watercolorUrl,
      watercolorThumbUrl,
      styleVersion,
      aiModel,
      flags,
    } = body;

    if (!itemId || !watercolorUrl) {
      return NextResponse.json(
        { error: 'Item ID and watercolor URL are required' },
        { status: 400 }
      );
    }

    console.log('🎨 Updating item with watercolor URLs:', itemId);

    // Update the item with watercolor data
    const updatedItem = await db.item.update({
      where: { id: itemId },
      data: {
        watercolorUrl: watercolorUrl,
        watercolorThumbUrl: watercolorThumbUrl,
        styleVersion: styleVersion,
        aiModel: aiModel,
        flags: flags,
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        stuffType: {
          select: { displayName: true, category: true, iconPath: true },
        },
      },
    });

    console.log('✅ Item updated with watercolor URLs');

    return NextResponse.json({
      itemId: updatedItem.id,
      watercolorUrl: updatedItem.watercolorUrl,
      watercolorThumbUrl: updatedItem.watercolorThumbUrl,
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        description: updatedItem.description,
        imageUrl: updatedItem.imageUrl,
        watercolorUrl: updatedItem.watercolorUrl,
        watercolorThumbUrl: updatedItem.watercolorThumbUrl,
        active: updatedItem.active,
      },
    });
  } catch (error) {
    console.error('❌ Error updating item watercolor:', error);
    return NextResponse.json(
      {
        error: 'Failed to update item watercolor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

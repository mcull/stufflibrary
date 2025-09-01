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
    const { itemId, name, description, category } = body;

    if (!itemId || !name) {
      return NextResponse.json(
        { error: 'Item ID and name are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Updating item with AI analysis results:', itemId);

    // Find or create stuff type
    const uniqueName = `${name.toLowerCase().replace(/\s+/g, '-')}-${category || 'other'}`;
    let stuffType = await db.stuffType.findFirst({
      where: { name: uniqueName },
    });

    if (!stuffType) {
      stuffType = await db.stuffType.create({
        data: {
          name: uniqueName,
          displayName: name,
          category: category || 'other',
          iconPath: '', // Will be set later if needed
        },
      });
    }

    // Update the item with analysis results
    const updatedItem = await db.item.update({
      where: { id: itemId },
      data: {
        name: name,
        description: description || 'Item captured via camera',
        stuffTypeId: stuffType.id,
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        stuffType: {
          select: { displayName: true, category: true, iconPath: true },
        },
      },
    });

    console.log('✅ Item updated with analysis results');

    return NextResponse.json({
      itemId: updatedItem.id,
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        description: updatedItem.description,
        category: updatedItem.stuffType?.category,
        imageUrl: updatedItem.imageUrl,
        watercolorUrl: updatedItem.watercolorUrl,
        watercolorThumbUrl: updatedItem.watercolorThumbUrl,
        active: updatedItem.active,
      },
    });
  } catch (error) {
    console.error('❌ Error updating item analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to update item analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

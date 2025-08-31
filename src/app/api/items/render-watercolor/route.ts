import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { WatercolorService } from '@/lib/watercolor-service';

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
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Find the item and verify ownership
    const item = await db.item.findUnique({
      where: { id: itemId },
      include: {
        stuffType: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.ownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!item.imageUrl) {
      return NextResponse.json(
        { error: 'Item has no image to process' },
        { status: 400 }
      );
    }

    // Check if watercolor already exists (idempotency)
    if (item.watercolorUrl && item.styleVersion === 'wc_v1') {
      return NextResponse.json({
        itemId: item.id,
        watercolorUrl: item.watercolorUrl,
        watercolorThumbUrl: item.watercolorThumbUrl,
        styleVersion: item.styleVersion,
        message: 'Watercolor already exists',
      });
    }

    // Fetch the original image
    console.log('📸 Fetching original image from:', item.imageUrl);
    const imageResponse = await fetch(item.imageUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch original image' },
        { status: 500 }
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const contentType =
      imageResponse.headers.get('content-type') || 'image/jpeg';
    const originalImageName = `item-${item.id}.jpg`;

    console.log('🎨 Starting watercolor rendering for item:', itemId);
    console.log('📏 Image size:', imageBuffer.length, 'bytes');

    // Initialize watercolor service
    const watercolorService = new WatercolorService();

    // Render watercolor
    const result = await watercolorService.renderWatercolor({
      itemId: item.id,
      originalImageBuffer: imageBuffer,
      originalImageName,
      mimeType: contentType,
    });

    console.log('✅ Watercolor rendering completed:', {
      watercolorUrl: result.watercolorUrl,
      flags: result.flags,
    });

    // Update item in database
    const updatedItem = await db.item.update({
      where: { id: item.id },
      data: {
        watercolorUrl: result.watercolorUrl,
        watercolorThumbUrl: result.watercolorThumbUrl,
        styleVersion: result.styleVersion,
        aiModel: result.aiModel,
        synthIdWatermark: result.synthIdWatermark,
        flags: result.flags,
      },
      include: {
        stuffType: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Update stuff type icon if generated
    if (result.iconUrl && item.stuffType) {
      await db.stuffType.update({
        where: { id: item.stuffType.id },
        data: {
          iconPath: result.iconUrl,
        },
      });
    }

    // TODO: Emit ITEM_IMAGE_RENDERED event for any listeners
    console.log('📢 Would emit ITEM_IMAGE_RENDERED event for item:', itemId);

    return NextResponse.json({
      itemId: updatedItem.id,
      watercolorUrl: updatedItem.watercolorUrl,
      watercolorThumbUrl: updatedItem.watercolorThumbUrl,
      iconUrl: result.iconUrl,
      styleVersion: updatedItem.styleVersion,
      flags: updatedItem.flags as string[],
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        description: updatedItem.description,
        condition: updatedItem.condition,
        imageUrl: updatedItem.imageUrl,
        watercolorUrl: updatedItem.watercolorUrl,
        watercolorThumbUrl: updatedItem.watercolorThumbUrl,
        isAvailable: !updatedItem.currentBorrowRequestId,
        createdAt: updatedItem.createdAt,
        owner: updatedItem.owner,
        stuffType: updatedItem.stuffType,
      },
    });
  } catch (error) {
    console.error('❌ Error in watercolor rendering:', error);

    if (
      error instanceof Error &&
      error.message?.includes('GOOGLE_AI_API_KEY')
    ) {
      return NextResponse.json(
        {
          error: 'Watercolor service not configured',
          details: 'Google AI API key is missing',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to render watercolor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

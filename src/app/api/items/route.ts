// no direct blob import; use StorageService
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { StorageService } from '@/lib/storage';
import { getUserCapabilities } from '@/lib/user-capabilities';

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

    const caps = await getUserCapabilities(userId);
    if (!caps.canLend) {
      return NextResponse.json(
        {
          error:
            'Complete your profile (photo + verified address) to list an item.',
          reason: caps.reasons.canLend,
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || null;
    const category = (formData.get('category') as string) || 'other';
    const libraryIdsString = formData.get('libraryIds') as string;
    const watercolorUrl = (formData.get('watercolorUrl') as string) || null;
    const watercolorThumbUrl =
      (formData.get('watercolorThumbUrl') as string) || null;
    let libraryIds: string[] = [];
    if (libraryIdsString) {
      try {
        libraryIds = JSON.parse(libraryIdsString);
      } catch {
        libraryIds = [libraryIdsString]; // fallback for single ID
      }
    }

    if (!image || !name) {
      return NextResponse.json(
        {
          error: 'Image and name are required',
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const filename = `items/${uuidv4()}.${fileExtension}`;

    console.log('📁 Saving image to blob storage:', filename);
    console.log('📏 Image size:', image.size, 'bytes');

    let imageUrl: string;

    try {
      // Upload to Vercel Blob storage
      console.log('☁️ Uploading to Vercel Blob...');
      const uploaded = await StorageService.uploadFile(filename, image, {
        contentType: image.type || 'image/jpeg',
        retries: 3,
        retryDelayMs: 250,
      });

      imageUrl = uploaded.url;
      console.log('✅ Image uploaded successfully:', imageUrl);
    } catch (err) {
      console.error('❌ Error uploading image to blob storage:', err);
      return NextResponse.json(
        {
          error: 'Failed to upload image',
        },
        { status: 500 }
      );
    }

    // Find or create stuff type for the category
    // Create a unique name by combining name and category to avoid conflicts
    const uniqueName = `${name.toLowerCase().replace(/\s+/g, '-')}-${category}`;

    let stuffType = await db.stuffType.findFirst({
      where: {
        name: uniqueName,
      },
    });

    if (!stuffType) {
      // Create new stuff type
      stuffType = await db.stuffType.create({
        data: {
          name: uniqueName,
          displayName: name,
          category: category,
          iconPath: imageUrl, // Use the uploaded blob URL as icon initially
        },
      });
    }

    // Create the item
    const item = await db.item.create({
      data: {
        name: name,
        description: description || `Added via camera capture`,
        condition: 'good', // Default condition
        imageUrl: imageUrl,
        watercolorUrl: watercolorUrl,
        watercolorThumbUrl: watercolorThumbUrl,
        styleVersion: watercolorUrl ? 'wc_v1' : null,
        currentBorrowRequestId: null,
        ownerId: userId,
        stuffTypeId: stuffType.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        stuffType: {
          select: {
            displayName: true,
            category: true,
            iconPath: true,
          },
        },
        collections: {
          include: {
            collection: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Create item-library relationships if libraryIds provided
    if (libraryIds.length > 0) {
      await db.$transaction(
        libraryIds.map((libraryId) =>
          db.itemCollection.create({
            data: {
              itemId: item.id,
              collectionId: libraryId,
            },
          })
        )
      );
    }

    // Fetch item with libraries for response
    const itemWithLibraries = await db.item.findUnique({
      where: { id: item.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        stuffType: {
          select: {
            displayName: true,
            category: true,
            iconPath: true,
          },
        },
        collections: {
          include: {
            collection: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Trigger asynchronous watercolor rendering only if we don't already have watercolor URLs
    if (process.env.GOOGLE_AI_API_KEY && !watercolorUrl) {
      console.log('🎨 Triggering watercolor rendering for item:', item.id);

      // Make async request to our watercolor endpoint
      fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/items/render-watercolor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('Cookie') || '',
          },
          body: JSON.stringify({ itemId: item.id }),
        }
      )
        .then(() => {
          console.log(
            '✅ Watercolor rendering request sent for item:',
            item.id
          );
        })
        .catch((error) => {
          console.error('❌ Failed to trigger watercolor rendering:', error);
        });
    } else if (watercolorUrl) {
      console.log('✅ Item created with existing watercolor:', watercolorUrl);
    } else {
      console.log('⚠️ Watercolor rendering disabled (no GOOGLE_AI_API_KEY)');
    }

    // Fire-and-forget generation of suggested borrow script
    try {
      fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/items/${item.id}/borrow-script`,
        {
          method: 'GET',
          headers: { Cookie: request.headers.get('Cookie') || '' },
        }
      ).catch(() => {});
    } catch {}

    return NextResponse.json({
      itemId: itemWithLibraries!.id,
      item: {
        id: itemWithLibraries!.id,
        name: itemWithLibraries!.name,
        description: itemWithLibraries!.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        suggestedBorrowScript: (itemWithLibraries as any).suggestedBorrowScript,
        condition: itemWithLibraries!.condition,
        imageUrl: itemWithLibraries!.imageUrl,
        watercolorUrl: itemWithLibraries!.watercolorUrl,
        watercolorThumbUrl: itemWithLibraries!.watercolorThumbUrl,
        isAvailable: !itemWithLibraries!.currentBorrowRequestId,
        createdAt: itemWithLibraries!.createdAt,
        owner: itemWithLibraries!.owner,
        stuffType: itemWithLibraries!.stuffType,
        libraries: itemWithLibraries!.collections.map((ic) => ic.collection),
      },
    });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}

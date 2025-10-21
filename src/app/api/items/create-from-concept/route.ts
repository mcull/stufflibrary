import crypto from 'crypto';

import { ItemConceptStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ItemConceptService } from '@/lib/item-concept-service';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  let concept: Awaited<
    ReturnType<ItemConceptService['consumeConcept']>
  > | null = null;

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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      conceptId,
      name: overrideName,
      description: overrideDescription,
      libraryIds,
      category = 'other',
    } = body;

    if (!conceptId || typeof conceptId !== 'string') {
      return NextResponse.json(
        { error: 'conceptId is required' },
        { status: 400 }
      );
    }

    const conceptService = new ItemConceptService();
    concept = await conceptService.consumeConcept(conceptId, userId);

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found or already used' },
        { status: 404 }
      );
    }

    const itemName = (
      overrideName ||
      concept.inputName ||
      concept.generatedName ||
      ''
    ).trim();
    if (!itemName) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    const itemDescription = (
      overrideDescription ||
      concept.inputDescription ||
      'Added via description flow'
    ).trim();

    const imageUrl = concept.originalImageUrl || concept.watercolorUrl;
    const watercolorUrl = concept.watercolorUrl;
    const watercolorThumbUrl = concept.watercolorThumbUrl;

    if (!watercolorUrl) {
      return NextResponse.json(
        { error: 'Concept is missing visual assets' },
        { status: 422 }
      );
    }

    const slug = slugify(itemName);
    const uniqueName = `${slug || crypto.randomUUID()}-${category}`;

    const libraryIdArray: string[] = Array.isArray(libraryIds)
      ? libraryIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    const itemId = await db.$transaction(async (tx) => {
      let stuffType = await tx.stuffType.findFirst({
        where: { name: uniqueName },
      });

      if (!stuffType) {
        stuffType = await tx.stuffType.create({
          data: {
            name: uniqueName,
            displayName: itemName,
            category,
            iconPath: watercolorUrl,
          },
        });
      }

      const createdItem = await tx.item.create({
        data: {
          name: itemName,
          description: itemDescription,
          category,
          condition: 'good',
          imageUrl,
          watercolorUrl,
          watercolorThumbUrl,
          styleVersion: watercolorUrl ? 'wc_v1' : null,
          ownerId: userId,
          stuffTypeId: stuffType.id,
          active: true,
        },
      });

      const uniqueLibraryIds = Array.from(new Set(libraryIdArray));
      if (uniqueLibraryIds.length > 0) {
        await tx.itemCollection.createMany({
          data: uniqueLibraryIds.map((libraryId) => ({
            itemId: createdItem.id,
            collectionId: libraryId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.itemConcept.update({
        where: { id: conceptId },
        data: {
          itemId: createdItem.id,
        },
      });

      return createdItem.id;
    });

    const item = await db.item.findUnique({
      where: { id: itemId },
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

    if (!item) {
      throw new Error('Created item could not be fetched');
    }

    return NextResponse.json({
      itemId: item.id,
      conceptId: concept.id,
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        condition: item.condition,
        imageUrl: item.imageUrl,
        watercolorUrl: item.watercolorUrl,
        watercolorThumbUrl: item.watercolorThumbUrl,
        isAvailable: !item.currentBorrowRequestId,
        createdAt: item.createdAt,
        owner: item.owner,
        stuffType: item.stuffType,
        libraries: item.collections.map((ic) => ic.collection),
      },
    });
  } catch (error) {
    console.error('Error creating item from concept:', error);
    if (concept) {
      try {
        await db.itemConcept.update({
          where: { id: concept.id },
          data: {
            status: ItemConceptStatus.READY,
            consumedAt: null,
            itemId: null,
          },
        });
      } catch (restoreError) {
        console.error(
          'Failed to restore concept status after error:',
          restoreError
        );
      }
    }
    return NextResponse.json(
      {
        error: 'Failed to create item from concept',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

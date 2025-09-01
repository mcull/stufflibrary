import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';

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

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const libraryIdsString = formData.get('libraryIds') as string;

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    let libraryIds: string[] = [];
    if (libraryIdsString) {
      try {
        libraryIds = JSON.parse(libraryIdsString);
      } catch {
        libraryIds = [libraryIdsString]; // fallback for single ID
      }
    }

    console.log('🔍 Starting item analysis and creation...');

    // Step 1: Analyze image to get item details
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const mimeType = image.type || 'image/jpeg';

    console.log('🔍 Analyzing image with Gemini...');
    let analysisResult;

    try {
      const analysisFormData = new FormData();
      analysisFormData.append(
        'image',
        new Blob([imageBuffer], { type: mimeType }),
        'capture.jpg'
      );

      const analysisResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analyze-item`,
        {
          method: 'POST',
          body: analysisFormData,
          headers: {
            Cookie: request.headers.get('Cookie') || '',
          },
        }
      );

      if (!analysisResponse.ok) {
        throw new Error('Analysis failed');
      }

      analysisResult = await analysisResponse.json();
      console.log('✅ Analysis complete:', analysisResult);
    } catch (analysisError) {
      console.error('⚠️ Analysis failed, using fallback:', analysisError);
      // Fallback analysis
      analysisResult = {
        recognized: true,
        name: 'Captured Item',
        description: 'Item captured via camera',
        category: 'other',
        confidence: 0.5,
      };
    }

    if (!analysisResult.recognized) {
      return NextResponse.json(
        { error: 'Could not identify the item' },
        { status: 400 }
      );
    }

    // Step 2: Upload original image to blob storage
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const filename = `items/${uuidv4()}.${fileExtension}`;

    console.log('☁️ Uploading image to blob storage:', filename);
    const blob = await put(filename, image, { access: 'public' });
    const imageUrl = blob.url;
    console.log('✅ Image uploaded:', imageUrl);

    // Step 3: Create stuff type
    const uniqueName = `${analysisResult.name.toLowerCase().replace(/\s+/g, '-')}-${analysisResult.category}`;
    let stuffType = await db.stuffType.findFirst({
      where: { name: uniqueName },
    });

    if (!stuffType) {
      stuffType = await db.stuffType.create({
        data: {
          name: uniqueName,
          displayName: analysisResult.name,
          category: analysisResult.category,
          iconPath: imageUrl,
        },
      });
    }

    // Step 4: Create item in database
    const item = await db.item.create({
      data: {
        name: analysisResult.name,
        description: analysisResult.description,
        condition: 'good',
        imageUrl: imageUrl,
        ownerId: userId,
        stuffTypeId: stuffType.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, image: true },
        },
        stuffType: {
          select: { displayName: true, category: true, iconPath: true },
        },
      },
    });

    console.log('✅ Item created:', item.id);

    // Step 5: Create library relationships if provided
    if (libraryIds.length > 0) {
      await db.$transaction(
        libraryIds.map((libraryId) =>
          db.itemLibrary.create({
            data: { itemId: item.id, libraryId: libraryId },
          })
        )
      );
    }

    // Step 6: Generate watercolor and wait for completion
    let finalItem: any = item;

    if (process.env.GOOGLE_AI_API_KEY) {
      console.log('🎨 Starting watercolor generation...');

      try {
        const watercolorService = new WatercolorService();
        const watercolorResult = await watercolorService.renderWatercolor({
          itemId: item.id,
          originalImageBuffer: imageBuffer,
          originalImageName: `item-${item.id}.jpg`,
          mimeType: mimeType,
        });

        // Update item with watercolor URLs
        finalItem = await db.item.update({
          where: { id: item.id },
          data: {
            watercolorUrl: watercolorResult.watercolorUrl,
            watercolorThumbUrl: watercolorResult.watercolorThumbUrl,
            styleVersion: watercolorResult.styleVersion,
            aiModel: watercolorResult.aiModel,
            synthIdWatermark: watercolorResult.synthIdWatermark,
            flags: watercolorResult.flags,
          },
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

        console.log(
          '✅ Watercolor generated and saved:',
          watercolorResult.watercolorUrl
        );
      } catch (watercolorError) {
        console.error('⚠️ Watercolor generation failed:', watercolorError);

        // Fetch item without watercolor
        finalItem = await db.item.findUnique({
          where: { id: item.id },
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
      }
    } else {
      // Fetch final item without watercolor generation
      finalItem = await db.item.findUnique({
        where: { id: item.id },
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
    }

    if (!finalItem) {
      throw new Error('Failed to fetch final item details');
    }

    return NextResponse.json({
      itemId: item.id,
      item: {
        id: finalItem.id,
        name: finalItem.name,
        description: finalItem.description,
        condition: finalItem.condition,
        imageUrl: finalItem.imageUrl,
        watercolorUrl: finalItem.watercolorUrl,
        watercolorThumbUrl: finalItem.watercolorThumbUrl,
        isAvailable: !finalItem.currentBorrowRequestId,
        createdAt: finalItem.createdAt,
        owner: finalItem.owner,
        stuffType: finalItem.stuffType,
        libraries: finalItem.libraries.map((il: any) => il.library),
      },
      analysisResult,
    });
  } catch (error) {
    console.error('❌ Error creating item with watercolor:', error);
    return NextResponse.json(
      {
        error: 'Failed to create item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

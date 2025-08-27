import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';

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

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const name = formData.get('name') as string;
    const category = (formData.get('category') as string) || 'other';
    const branchId = (formData.get('branchId') as string) || null;

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
      const blob = await put(filename, image, {
        access: 'public',
      });

      imageUrl = blob.url;
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
        description: `Added via camera capture`,
        condition: 'good', // Default condition
        imageUrl: imageUrl,
        isAvailable: true,
        ownerId: userId,
        branchId: branchId,
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
        ...(branchId
          ? {
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
            }
          : {}),
      },
    });

    return NextResponse.json({
      itemId: item.id,
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        condition: item.condition,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        createdAt: item.createdAt,
        owner: item.owner,
        stuffType: item.stuffType,
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

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

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    console.log('📸 Creating draft item with uploaded photo...');

    // Step 1: Upload image to blob storage
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const filename = `items/${uuidv4()}.${fileExtension}`;

    console.log('☁️ Uploading image to blob storage:', filename);
    const blob = await put(filename, image, { access: 'public' });
    const imageUrl = blob.url;
    console.log('✅ Image uploaded:', imageUrl);

    // Step 2: Create draft item record immediately
    const item = await db.item.create({
      data: {
        name: 'Processing...', // Temporary name until AI analysis
        description: 'Analyzing item...', // Temporary description
        condition: 'good',
        imageUrl: imageUrl,
        active: false, // DRAFT STATUS - not visible in searches
        ownerId: userId,
        stuffTypeId: null, // Will be set later when AI analysis completes
      },
      include: {
        owner: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    console.log('✅ Draft item created:', item.id);

    return NextResponse.json({
      itemId: item.id,
      imageUrl: imageUrl,
      status: 'draft',
    });
  } catch (error) {
    console.error('❌ Error creating draft item:', error);
    return NextResponse.json(
      {
        error: 'Failed to create draft item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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
    const branchId = formData.get('branchId') as string;

    if (!image || !name) {
      return NextResponse.json(
        {
          error: 'Image and name are required',
        },
        { status: 400 }
      );
    }

    if (!branchId) {
      return NextResponse.json(
        {
          error: 'Branch ID is required',
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${fileExtension}`;

    console.log('📁 Saving image:', filename);
    console.log('📏 Image size:', image.size, 'bytes');

    // Save image to public directory
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const imagePath = join(uploadsDir, filename);

    console.log('📂 Upload directory:', uploadsDir);
    console.log('🎯 Full image path:', imagePath);

    // Ensure uploads directory exists
    try {
      if (!existsSync(uploadsDir)) {
        console.log('📁 Creating uploads directory...');
        await mkdir(uploadsDir, { recursive: true });
      }

      console.log('💾 Writing file...');
      await writeFile(imagePath, buffer);
      console.log('✅ Image saved successfully');
    } catch (err) {
      console.error('❌ Error saving image:', err);
      return NextResponse.json(
        {
          error: 'Failed to save image',
        },
        { status: 500 }
      );
    }

    // Find or create stuff type for the category
    let stuffType = await db.stuffType.findFirst({
      where: {
        category: category,
        name: name, // Use 'name' field instead of 'displayName'
      },
    });

    if (!stuffType) {
      // Create new stuff type
      stuffType = await db.stuffType.create({
        data: {
          name: name,
          displayName: name,
          category: category,
          iconPath: `/uploads/${filename}`, // Use the uploaded image as icon initially
        },
      });
    }

    // Create the item
    const item = await db.item.create({
      data: {
        name: name,
        description: `Added via camera capture`,
        condition: 'good', // Default condition
        imageUrl: `/uploads/${filename}`,
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

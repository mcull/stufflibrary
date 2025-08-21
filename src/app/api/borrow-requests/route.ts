import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendBorrowRequestNotification } from '@/lib/twilio';

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
    const video = formData.get('video') as File;
    const itemId = formData.get('itemId') as string;
    const promisedReturnBy = formData.get('promisedReturnBy') as string;
    const promiseText = formData.get('promiseText') as string;

    if (!video || !itemId || !promisedReturnBy || !promiseText) {
      return NextResponse.json(
        {
          error:
            'Video, item ID, promised return date, and promise text are required',
        },
        { status: 400 }
      );
    }

    // Get item and owner details
    const item = await db.item.findUnique({
      where: { id: itemId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Don't let users borrow their own items
    if (item.ownerId === userId) {
      return NextResponse.json(
        { error: 'You cannot borrow your own item' },
        { status: 400 }
      );
    }

    // Get borrower details
    const borrower = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (!borrower || !borrower.phone) {
      return NextResponse.json(
        { error: 'Borrower phone number required for notifications' },
        { status: 400 }
      );
    }

    if (!item.owner.phone) {
      return NextResponse.json(
        { error: 'Item owner phone number required for notifications' },
        { status: 400 }
      );
    }

    // Generate unique filename for video
    const fileExtension = video.name.split('.').pop() || 'webm';
    const filename = `${uuidv4()}.${fileExtension}`;

    console.log('📹 Saving borrow request video:', filename);
    console.log('📏 Video size:', video.size, 'bytes');

    // Save video to public directory
    const bytes = await video.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadsDir = join(process.cwd(), 'public', 'borrow-videos');
    const videoPath = join(uploadsDir, filename);

    console.log('📂 Upload directory:', uploadsDir);
    console.log('🎯 Full video path:', videoPath);

    // Ensure uploads directory exists
    try {
      if (!existsSync(uploadsDir)) {
        console.log('📁 Creating borrow-videos directory...');
        await mkdir(uploadsDir, { recursive: true });
      }

      console.log('💾 Writing video file...');
      await writeFile(videoPath, buffer);
      console.log('✅ Video saved successfully');
    } catch (err) {
      console.error('❌ Error saving video:', err);
      return NextResponse.json(
        {
          error: 'Failed to save video',
        },
        { status: 500 }
      );
    }

    // Generate secure token for approval page
    const responseToken = uuidv4();

    // Create the borrow request
    const borrowRequest = await db.borrowRequest.create({
      data: {
        borrowerId: userId,
        lenderId: item.ownerId,
        itemId: itemId,
        videoUrl: `/borrow-videos/${filename}`,
        promiseText: promiseText,
        promisedReturnBy: new Date(promisedReturnBy),
        responseToken: responseToken,
        status: 'pending',
      },
      include: {
        borrower: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    // Create approval URL
    const approvalUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/borrow-approval/${responseToken}`;

    // Send SMS notification to owner
    try {
      await sendBorrowRequestNotification({
        _ownerName: item.owner.name || 'Owner',
        ownerPhone: item.owner.phone,
        borrowerName: borrower.name || 'Someone',
        itemName: item.name,
        approvalUrl: approvalUrl,
      });

      console.log('📱 SMS notification sent to owner');
    } catch (smsError) {
      console.error('❌ Failed to send SMS notification:', smsError);
      // Don't fail the request if SMS fails, but log it
    }

    return NextResponse.json({
      success: true,
      borrowRequestId: borrowRequest.id,
      message: 'Borrow request sent successfully',
    });
  } catch (error) {
    console.error('Error creating borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to create borrow request' },
      { status: 500 }
    );
  }
}

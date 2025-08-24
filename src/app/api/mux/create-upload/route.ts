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

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { borrowRequestId } = body;

    if (!borrowRequestId) {
      return NextResponse.json(
        { error: 'borrowRequestId is required' },
        { status: 400 }
      );
    }

    // Verify the borrow request exists and belongs to the current user
    const borrowRequest = await db.borrowRequest.findUnique({
      where: { id: borrowRequestId },
    });

    if (!borrowRequest) {
      return NextResponse.json(
        { error: 'Borrow request not found' },
        { status: 404 }
      );
    }

    if (borrowRequest.borrowerId !== userId) {
      return NextResponse.json(
        { error: 'You can only upload videos for your own requests' },
        { status: 403 }
      );
    }

    // Import Mux dynamically to avoid type issues
    const Mux = await import('@mux/mux-node');
    const mux = new Mux.default({
      tokenId: process.env.MUX_TOKEN_ID!,
      tokenSecret: process.env.MUX_TOKEN_SECRET!,
    });

    console.log(
      '🎬 Creating Mux direct upload for borrow request:',
      borrowRequestId
    );

    // Create direct upload URL with auto-generated captions
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline', // Faster, cheaper encoding
        max_resolution_tier: '1080p',
        // Enable auto-generated captions for accessibility
        input: [
          {
            generated_subtitles: [
              {
                language_code: 'en',
                name: 'English CC',
              },
            ],
          },
        ],
        // Store the borrow request ID in passthrough for webhook processing
        passthrough: JSON.stringify({
          borrowRequestId,
          type: 'borrow_request',
          userId,
        }),
      },
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      test: process.env.NODE_ENV !== 'production',
    });

    console.log('✅ Mux upload URL created:', {
      uploadId: upload.id,
      uploadUrl: upload.url,
    });

    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error) {
    console.error('❌ Error creating Mux upload:', error);

    // Handle specific Mux API errors
    if (error instanceof Error && error.message.includes('MUX_TOKEN')) {
      return NextResponse.json(
        {
          error: 'Mux configuration error. Please check environment variables.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create video upload URL' },
      { status: 500 }
    );
  }
}

import Mux from '@mux/mux-node';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      return NextResponse.json(
        { error: 'Mux is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const borrowRequestId: string | undefined = body?.borrowRequestId;
    if (!borrowRequestId) {
      return NextResponse.json(
        { error: 'borrowRequestId is required' },
        { status: 400 }
      );
    }

    const mux = new (Mux as any)({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });

    const upload = await mux.video.uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: borrowRequestId,
      },
    });

    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error) {
    console.error('Mux create-upload error:', error);
    return NextResponse.json(
      { error: 'Failed to create Mux upload' },
      { status: 500 }
    );
  }
}

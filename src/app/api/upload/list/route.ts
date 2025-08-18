import { NextRequest, NextResponse } from 'next/server';

import { StorageService } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const prefix = searchParams.get('prefix') || undefined;
    const cursor = searchParams.get('cursor') || undefined;

    const listOptions: any = {
      limit: Math.min(limit, 100), // Cap at 100
    };

    if (prefix) {
      listOptions.prefix = prefix;
    }

    if (cursor) {
      listOptions.cursor = cursor;
    }

    const result = await StorageService.listFiles(listOptions);

    return NextResponse.json({
      success: true,
      files: result.blobs,
      cursor: result.cursor,
      hasMore: result.hasMore,
      count: result.blobs.length,
    });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list files',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

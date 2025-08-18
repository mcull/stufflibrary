import { NextResponse } from 'next/server';

import { RedisService } from '@/lib/redis';

export async function GET() {
  try {
    const result = await RedisService.testConnection();

    if (result.success) {
      return NextResponse.json(
        { status: 'OK', message: result.message },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { status: 'ERROR', message: result.message },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'ERROR',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

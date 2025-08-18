import { NextResponse } from 'next/server';

import { testConnection as testDatabase } from '@/lib/db-utils';
import { RedisService } from '@/lib/redis';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    // Test database connection
    const dbResult = await testDatabase();

    // Test Redis connection
    const redisResult = await RedisService.testConnection();

    // Test storage connection
    const storageResult = await StorageService.testConnection();

    const overall =
      dbResult.success && redisResult.success && storageResult.success;

    return NextResponse.json(
      {
        status: overall ? 'OK' : 'DEGRADED',
        services: {
          database: {
            status: dbResult.success ? 'OK' : 'ERROR',
            message: dbResult.message,
          },
          redis: {
            status: redisResult.success ? 'OK' : 'ERROR',
            message: redisResult.message,
          },
          storage: {
            status: storageResult.success ? 'OK' : 'ERROR',
            message: storageResult.message,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: overall ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'ERROR',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

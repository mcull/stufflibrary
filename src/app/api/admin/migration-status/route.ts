import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check if this is an admin request (you can add proper auth here)
    const authHeader = request.headers.get('authorization');
    const isAdmin =
      authHeader === `Bearer ${process.env.ADMIN_API_KEY}` ||
      request.nextUrl.searchParams.get('admin_key') ===
        process.env.ADMIN_API_KEY;

    if (!isAdmin && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check critical tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('libraries', 'library_members', 'item_libraries', 'users', 'addresses')
      ORDER BY table_name
    `;

    const tables =
      await db.$queryRawUnsafe<{ table_name: string }[]>(tablesQuery);
    const tableNames = tables.map((t) => t.table_name);

    // Check if coordinates columns exist in addresses table
    const coordinatesQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      AND table_schema = 'public'
      AND column_name IN ('latitude', 'longitude')
    `;

    const coordinateColumns =
      await db.$queryRawUnsafe<{ column_name: string }[]>(coordinatesQuery);

    // Check migration history
    let migrationHistory: any[] = [];
    try {
      migrationHistory = await db.$queryRawUnsafe(`
        SELECT migration_name, finished_at, applied_steps_count
        FROM _prisma_migrations
        ORDER BY finished_at DESC
        LIMIT 10
      `);
    } catch {
      // _prisma_migrations table might not exist in older setups
      migrationHistory = [{ error: 'Migration history not available' }];
    }

    // Check counts of key entities
    const counts = await Promise.allSettled([
      db.user.count(),
      db.library?.count() || Promise.resolve(0),
      db.invitation.count(),
    ]);

    const status = {
      timestamp: new Date().toISOString(),
      environment:
        process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        tables: {
          found: tableNames,
          missing: [
            'libraries',
            'library_members',
            'item_libraries',
            'users',
            'addresses',
          ].filter((table) => !tableNames.includes(table)),
          status: tableNames.length >= 4 ? 'healthy' : 'missing_tables',
        },
        coordinates: {
          columns: coordinateColumns.map((c) => c.column_name),
          status: coordinateColumns.length === 2 ? 'enabled' : 'missing',
        },
        migrations: migrationHistory,
        counts: {
          users: counts[0].status === 'fulfilled' ? counts[0].value : 'error',
          libraries:
            counts[1].status === 'fulfilled' ? counts[1].value : 'error',
          invitations:
            counts[2].status === 'fulfilled' ? counts[2].value : 'error',
        },
      },
      health: {
        overall:
          tableNames.includes('libraries') && tableNames.includes('users')
            ? 'healthy'
            : 'unhealthy',
        canCreateLibraries:
          tableNames.includes('libraries') &&
          tableNames.includes('library_members'),
        hasGoogleMaps: coordinateColumns.length === 2,
        criticalTablesPresent: ['users', 'libraries', 'library_members'].every(
          (t) => tableNames.includes(t)
        ),
      },
    };

    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Migration status check failed:', error);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        environment:
          process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        health: {
          overall: 'unhealthy',
          canCreateLibraries: false,
          hasGoogleMaps: false,
          criticalTablesPresent: false,
        },
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

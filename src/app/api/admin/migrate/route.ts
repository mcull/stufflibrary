import { execSync } from 'child_process';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const body = await request.json();

    const isAdmin =
      authHeader === `Bearer ${process.env.ADMIN_API_KEY}` ||
      body.admin_key === process.env.ADMIN_API_KEY;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow in production/preview environments
    if (!['production', 'preview'].includes(process.env.VERCEL_ENV || '')) {
      return NextResponse.json(
        {
          error: 'Manual migrations only allowed in production/preview',
        },
        { status: 400 }
      );
    }

    // Validate DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: 'DATABASE_URL not configured',
        },
        { status: 500 }
      );
    }

    const startTime = Date.now();
    let migrationOutput: string;
    let migrationSuccess = false;

    try {
      // Run migrations with timeout
      migrationOutput = execSync('npx prisma migrate deploy', {
        encoding: 'utf8',
        timeout: 30000, // 30 second timeout
        env: { ...process.env },
      });
      migrationSuccess = true;
    } catch (error: any) {
      migrationOutput = error.message || 'Migration failed';
      migrationSuccess = false;
    }

    const duration = Date.now() - startTime;

    // Generate Prisma client after migration
    let clientGenerated = false;
    let clientOutput = '';

    if (migrationSuccess) {
      try {
        clientOutput = execSync('npx prisma generate', {
          encoding: 'utf8',
          timeout: 15000,
        });
        clientGenerated = true;
      } catch (error: any) {
        clientOutput = error.message || 'Client generation failed';
      }
    }

    return NextResponse.json({
      success: migrationSuccess && clientGenerated,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      migration: {
        success: migrationSuccess,
        output: migrationOutput,
      },
      prismaGenerate: {
        success: clientGenerated,
        output: clientOutput,
      },
      nextSteps: migrationSuccess
        ? ['Migrations applied successfully', 'Test your application']
        : [
            'Check migration output',
            'Verify DATABASE_URL',
            'Check for schema conflicts',
          ],
    });
  } catch (error) {
    console.error('Manual migration failed:', error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        nextSteps: [
          'Check server logs',
          'Verify database connectivity',
          'Run migrations manually via database client',
        ],
      },
      { status: 500 }
    );
  }
}

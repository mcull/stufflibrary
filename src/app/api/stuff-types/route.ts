import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET() {
  try {
    const stuffTypes = await db.stuffType.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        iconPath: true,
        category: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    return NextResponse.json(stuffTypes);
  } catch (error) {
    console.error('Error fetching stuff types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stuff types' },
      { status: 500 }
    );
  }
}

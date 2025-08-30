// Admin reports API - temporarily stubbed until schema is updated
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(_request: NextRequest) {
  try {
    await requireAdminAuth();

    // Stub implementation - return empty reports until schema is ready
    return NextResponse.json({
      reports: [],
      total: 0,
      pages: 0,
    });
  } catch (error) {
    console.error('Admin reports fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    await requireAdminAuth();

    // Stub implementation - report creation disabled until schema is ready
    return NextResponse.json(
      { error: 'Report creation temporarily disabled' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Admin report creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: NextRequest) {
  try {
    await requireAdminAuth();

    // Stub implementation - report updates disabled until schema is ready
    return NextResponse.json(
      { error: 'Report updates temporarily disabled' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Admin report update error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

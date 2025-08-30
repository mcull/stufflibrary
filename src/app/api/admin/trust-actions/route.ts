// Admin trust actions API - temporarily stubbed until schema is updated
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(_request: NextRequest) {
  try {
    await requireAdminAuth();

    // Stub implementation - return empty actions until schema is ready
    return NextResponse.json({
      actions: [],
      total: 0,
      pages: 0,
    });
  } catch (error) {
    console.error('Admin trust actions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trust actions' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    await requireAdminAuth();

    // Stub implementation - trust actions disabled until schema is ready
    return NextResponse.json(
      { error: 'Trust actions temporarily disabled' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Admin trust action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute trust action' },
      { status: 500 }
    );
  }
}

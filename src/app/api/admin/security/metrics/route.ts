import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { getSecurityMetrics } from '@/lib/security-logger';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to last 30 days if not specified
    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const metrics = await getSecurityMetrics(
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    return NextResponse.json({
      metrics,
      dateRange: {
        startDate: startDate || defaultStartDate.toISOString(),
        endDate: endDate || defaultEndDate.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Security metrics fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

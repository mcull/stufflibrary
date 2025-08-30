// Admin disputes API - temporarily stubbed until schema is updated
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';

// Stub types
type _DisputeStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
type _DisputeType = 'ITEM_DAMAGE' | 'RETURN_DELAY' | 'NO_SHOW' | 'OTHER';
type _ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export async function GET(_request: NextRequest) {
  try {
    await requireAdminAuth();
    
    // Stub implementation - return empty disputes until schema is ready
    return NextResponse.json({
      disputes: [],
      total: 0,
      pages: 0
    });
  } catch (error) {
    console.error('Admin disputes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    await requireAdminAuth();
    
    // Stub implementation - dispute creation disabled until schema is ready
    return NextResponse.json(
      { error: 'Dispute creation temporarily disabled' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Admin dispute creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create dispute' },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: NextRequest) {
  try {
    await requireAdminAuth();
    
    // Stub implementation - dispute updates disabled until schema is ready
    return NextResponse.json(
      { error: 'Dispute updates temporarily disabled' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Admin dispute update error:', error);
    return NextResponse.json(
      { error: 'Failed to update dispute' },
      { status: 500 }
    );
  }
}
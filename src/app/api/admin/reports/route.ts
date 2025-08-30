// Admin reports API - temporarily stubbed until schema is updated
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';

// Stub types
type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type UserReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'FRAUD' | 'OTHER';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();
    
    // Stub implementation - return empty reports until schema is ready
    return NextResponse.json({
      reports: [],
      total: 0,
      pages: 0
    });
  } catch (error) {
    console.error('Admin reports fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

export async function PATCH(request: NextRequest) {
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
import { $Enums, type Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { blockIP, unblockIP, type BlockedIPData } from '@/lib/security-logger';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      200
    );
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const reason = searchParams.get('reason');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: Prisma.BlockedIPWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
    }

    if (reason && reason in $Enums.BlockedIPReason) {
      where.reason = reason as $Enums.BlockedIPReason;
    }

    const [blockedIPs, totalCount] = await Promise.all([
      db.blockedIP.findMany({
        where,
        orderBy: { blockedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.blockedIP.count({ where }),
    ]);

    return NextResponse.json({
      blockedIPs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Blocked IPs fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    const body = await request.json();

    const { ipAddress, reason, description, expiresAt } = body;

    if (!ipAddress || !reason) {
      return NextResponse.json(
        { error: 'IP address and reason are required' },
        { status: 400 }
      );
    }

    // blockedBy is a FK to users.id — use the admin's id, not their email.
    const adminId = (session.user as { id?: string } | undefined)?.id;
    const blockData: BlockedIPData = {
      ipAddress,
      reason,
      description,
      ...(adminId ? { blockedBy: adminId } : {}),
    };
    if (expiresAt) {
      blockData.expiresAt = new Date(expiresAt);
    }

    await blockIP(blockData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Block IP error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to block IP' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    const { searchParams } = new URL(request.url);
    const ipAddress = searchParams.get('ipAddress');

    if (!ipAddress) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }

    await unblockIP(
      ipAddress,
      (session.user as { id?: string } | undefined)?.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unblock IP error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to unblock IP',
      },
      { status: 500 }
    );
  }
}

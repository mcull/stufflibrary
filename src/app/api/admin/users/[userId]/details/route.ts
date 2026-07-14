import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const resolvedParams = await params;
  try {
    await requireAdminAuth();

    const user = await db.user.findUnique({
      where: { id: resolvedParams.userId },
      include: {
        _count: {
          select: {
            items: true,
            borrowRequests: true,
            addresses: true,
            ownedCollections: true,
          },
        },
        addresses: {
          select: {
            id: true,
            address1: true,
            address2: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            createdAt: true,
          },
        },
        borrowRequests: {
          select: {
            id: true,
            status: true,
            requestMessage: true,
            lenderMessage: true,
            createdAt: true,
            updatedAt: true,
            item: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        items: {
          select: {
            id: true,
            name: true,
            description: true,
            condition: true,
            category: true,
            imageUrl: true,
            createdAt: true,
            _count: {
              select: {
                borrowRequests: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Honest aggregates only. The persisted trustScore/trustTier (phase 1B,
    // src/lib/trust-score.ts) ride along on the user record itself — this
    // endpoint no longer computes a rival trust formula.
    const totalBorrowRequests = user._count.borrowRequests;
    const countByStatus = (status: string) =>
      user.borrowRequests.filter((req) => req.status === status).length;
    const approvedRequests = countByStatus('APPROVED');
    const rejectedRequests = countByStatus('DECLINED');
    const pendingRequests = countByStatus('PENDING');

    const recentActivity = user.borrowRequests.filter(
      (req) =>
        new Date(req.createdAt) >
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    const enrichedUser = {
      ...user,
      metrics: {
        recentActivity,
        totalBorrowRequests,
        approvedRequests,
        rejectedRequests,
        pendingRequests,
        approvalRate:
          totalBorrowRequests > 0
            ? (approvedRequests / totalBorrowRequests) * 100
            : 0,
      },
    };

    return NextResponse.json({ user: enrichedUser });
  } catch (error) {
    console.error('User details fetch error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch user details',
      },
      { status: 500 }
    );
  }
}

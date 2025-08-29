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

    // Calculate detailed metrics
    const totalBorrowRequests = user._count.borrowRequests;
    const approvedRequests = user.borrowRequests.filter(
      (req: any) => req.status === 'APPROVED'
    ).length;
    const rejectedRequests = user.borrowRequests.filter(
      (req: any) => req.status === 'DECLINED'
    ).length;
    const pendingRequests = user.borrowRequests.filter(
      (req: any) => req.status === 'PENDING'
    ).length;

    const recentActivity = user.borrowRequests.filter(
      (req: any) =>
        new Date(req.createdAt) >
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    // Trust score calculation
    const profileScore = user.profileCompleted ? 25 : 0;
    const phoneScore = user.phoneVerified ? 25 : 0;
    const itemsScore = Math.min(user._count.items * 5, 25);
    const activityScore = Math.min(totalBorrowRequests * 2, 25);
    const trustScore = profileScore + phoneScore + itemsScore + activityScore;

    // Activity level
    let activityLevel = 'low';
    if (recentActivity > 5 || totalBorrowRequests > 10) {
      activityLevel = 'high';
    } else if (recentActivity > 2 || totalBorrowRequests > 5) {
      activityLevel = 'medium';
    }

    const enrichedUser = {
      ...user,
      metrics: {
        trustScore,
        activityLevel,
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

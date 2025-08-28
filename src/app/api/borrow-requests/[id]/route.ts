import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { logBorrowRequestStatusChange } from '@/lib/audit-log';
import { authOptions } from '@/lib/auth';
import { updateItemAvailability } from '@/lib/borrow-request-utils';
import { db } from '@/lib/db';
import {
  sendBorrowResponseNotification,
  sendReturnNotification,
  sendCancellationNotification,
} from '@/lib/twilio';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SessionUser {
  id?: string;
}

interface SessionWithUser {
  user?: SessionUser;
  userId?: string;
}

// GET - Fetch a specific borrow request
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as SessionUser)?.id ||
      (session as SessionWithUser).user?.id ||
      (session as SessionWithUser).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const borrowRequest = await db.borrowRequest.findUnique({
      where: { id },
      include: {
        borrower: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            email: true,
          },
        },
        lender: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            email: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            condition: true,
          },
        },
      },
    });

    if (!borrowRequest) {
      return NextResponse.json(
        { error: 'Borrow request not found' },
        { status: 404 }
      );
    }

    // Check authorization - user must be either borrower or lender
    if (
      borrowRequest.borrowerId !== userId &&
      borrowRequest.lenderId !== userId
    ) {
      return NextResponse.json(
        {
          error: 'Access denied - you are not authorized to view this request',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ borrowRequest });
  } catch (error) {
    console.error('Error fetching borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrow request' },
      { status: 500 }
    );
  }
}

// PATCH - Update borrow request status (approve/decline/return/cancel)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as SessionUser)?.id ||
      (session as SessionWithUser).user?.id ||
      (session as SessionWithUser).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { action, message, actualReturnDate } = body;

    // Validate action
    if (!['approve', 'decline', 'return', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be one of: approve, decline, return, cancel' },
        { status: 400 }
      );
    }

    // Find the borrow request with all related data
    const borrowRequest = await db.borrowRequest.findUnique({
      where: { id },
      include: {
        borrower: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        lender: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!borrowRequest) {
      return NextResponse.json(
        { error: 'Borrow request not found' },
        { status: 404 }
      );
    }

    // Authorization checks based on action
    let authorizedUser = false;
    let newStatus: string = '';
    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'approve':
      case 'decline':
        // Only lender can approve/decline
        if (borrowRequest.lenderId !== userId) {
          return NextResponse.json(
            { error: 'Only the item owner can approve or decline requests' },
            { status: 403 }
          );
        }

        // Can only approve/decline pending requests
        if (borrowRequest.status !== 'PENDING') {
          return NextResponse.json(
            {
              error: `Cannot ${action} a request with status: ${borrowRequest.status}`,
            },
            { status: 400 }
          );
        }

        authorizedUser = true;
        newStatus = action === 'approve' ? 'APPROVED' : 'DECLINED';
        updateData = {
          status: newStatus,
          lenderMessage: message || null,
          approvedAt: action === 'approve' ? new Date() : null,
          declinedAt: action === 'decline' ? new Date() : null,
        };
        break;

      case 'return':
        // Only borrower can mark as returned
        if (borrowRequest.borrowerId !== userId) {
          return NextResponse.json(
            { error: 'Only the borrower can mark items as returned' },
            { status: 403 }
          );
        }

        // Can only return active borrows
        if (borrowRequest.status !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Can only return items that are currently active' },
            { status: 400 }
          );
        }

        authorizedUser = true;
        newStatus = 'RETURNED';
        updateData = {
          status: newStatus,
          returnedAt: actualReturnDate
            ? new Date(actualReturnDate)
            : new Date(),
          borrowerNotes: message || null,
        };
        break;

      case 'cancel':
        // Borrower can cancel pending/approved requests, lender can cancel pending requests
        if (borrowRequest.borrowerId === userId) {
          // Borrower cancelling - can cancel PENDING or APPROVED
          if (!['PENDING', 'APPROVED'].includes(borrowRequest.status)) {
            return NextResponse.json(
              { error: 'Can only cancel pending or approved requests' },
              { status: 400 }
            );
          }
        } else if (borrowRequest.lenderId === userId) {
          // Lender cancelling - can only cancel PENDING
          if (borrowRequest.status !== 'PENDING') {
            return NextResponse.json(
              { error: 'Lenders can only cancel pending requests' },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Only borrower or lender can cancel requests' },
            { status: 403 }
          );
        }

        authorizedUser = true;
        newStatus = 'CANCELLED';
        updateData = {
          status: newStatus,
          cancelledAt: new Date(),
          cancellationReason: message || null,
          cancelledBy: userId,
        };
        break;
    }

    if (!authorizedUser) {
      return NextResponse.json(
        {
          error:
            'Access denied - you are not authorized to perform this action',
        },
        { status: 403 }
      );
    }

    // Update the borrow request
    const updatedBorrowRequest = await db.borrowRequest.update({
      where: { id },
      data: updateData,
    });

    // Log status change for audit trail
    await logBorrowRequestStatusChange(
      borrowRequest.id,
      userId,
      borrowRequest.status,
      newStatus,
      {
        action,
        message,
        itemId: borrowRequest.item.id,
        itemName: borrowRequest.item.name,
      }
    );

    // Update item availability based on new status
    await updateItemAvailability(
      borrowRequest.item.id,
      borrowRequest.id,
      newStatus as 'APPROVED' | 'DECLINED' | 'RETURNED' | 'CANCELLED',
      userId
    );

    // Send notifications based on action
    try {
      let notificationSent = false;

      if (action === 'approve' || action === 'decline') {
        // Notify borrower of lender's decision
        if (borrowRequest.borrower.phone) {
          await sendBorrowResponseNotification({
            _borrowerName: borrowRequest.borrower.name || 'Borrower',
            borrowerPhone: borrowRequest.borrower.phone,
            ownerName: borrowRequest.lender.name || 'Owner',
            itemName: borrowRequest.item.name,
            approved: action === 'approve',
            message: message || `Request ${action}d`,
          });
          notificationSent = true;
        }
      } else if (action === 'return') {
        // Notify lender that item has been returned
        if (borrowRequest.lender.phone || borrowRequest.lender.email) {
          const notificationData: Parameters<typeof sendReturnNotification>[0] =
            {
              ownerName: borrowRequest.lender.name || 'Owner',
              borrowerName: borrowRequest.borrower.name || 'Borrower',
              itemName: borrowRequest.item.name,
              returnDate: updateData.returnedAt,
            };

          if (borrowRequest.lender.phone) {
            notificationData.ownerPhone = borrowRequest.lender.phone;
          }
          if (borrowRequest.lender.email) {
            notificationData.ownerEmail = borrowRequest.lender.email;
          }
          if (message) {
            notificationData.borrowerNotes = message;
          }

          await sendReturnNotification(notificationData);
          notificationSent = true;
        }
      } else if (action === 'cancel') {
        // Notify the other party of cancellation
        const recipientIsLender = borrowRequest.borrowerId === userId;
        const recipient = recipientIsLender
          ? borrowRequest.lender
          : borrowRequest.borrower;
        const canceller = recipientIsLender
          ? borrowRequest.borrower
          : borrowRequest.lender;

        if (recipient.phone || recipient.email) {
          const cancellationData: Parameters<
            typeof sendCancellationNotification
          >[0] = {
            recipientName: recipient.name || 'User',
            cancellerName: canceller.name || 'User',
            itemName: borrowRequest.item.name,
            isOwnerCancelling: !recipientIsLender,
          };

          if (recipient.phone) {
            cancellationData.recipientPhone = recipient.phone;
          }
          if (recipient.email) {
            cancellationData.recipientEmail = recipient.email;
          }
          if (message) {
            cancellationData.reason = message;
          }

          await sendCancellationNotification(cancellationData);
          notificationSent = true;
        }
      }

      if (notificationSent) {
        console.log(`📱 ${action} notification sent successfully`);
      }
    } catch (notificationError) {
      console.error(
        `❌ Failed to send ${action} notification:`,
        notificationError
      );
      // Don't fail the request if notifications fail
    }

    // Log status change for audit trail (additional console log)
    console.log(
      `📝 Borrow request ${id} status changed from ${borrowRequest.status} to ${newStatus} by user ${userId}`
    );

    return NextResponse.json({
      success: true,
      message: `Borrow request ${action}d successfully`,
      borrowRequestId: updatedBorrowRequest.id,
      status: updatedBorrowRequest.status,
      previousStatus: borrowRequest.status,
    });
  } catch (error) {
    console.error('Error updating borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to update borrow request' },
      { status: 500 }
    );
  }
}

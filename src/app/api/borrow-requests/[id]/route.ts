import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { logAuditEntry, logBorrowRequestStatusChange } from '@/lib/audit-log';
import { authOptions } from '@/lib/auth';
import { updateItemAvailability } from '@/lib/borrow-request-utils';
import { db } from '@/lib/db';
import {
  sendBorrowRequestApprovedNotification,
  sendBorrowRequestDeclinedNotification,
  sendItemReturnedNotification,
} from '@/lib/enhanced-notification-service';
import { createNotification } from '@/lib/notification-service';
import { sendCancellationNotification } from '@/lib/twilio';

// Shared helpers for return condition validation
const VALID_CONDITIONS = ['OK', 'MINOR_WEAR', 'DAMAGED'] as const;
type ConditionInput = (typeof VALID_CONDITIONS)[number];

function computeReturnedLate(
  requestedReturnDate: Date,
  returnedAt: Date | null
): boolean {
  const back = returnedAt ?? new Date();
  return back.getTime() > new Date(requestedReturnDate).getTime();
}

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
            status: true,
          },
        },
        lender: {
          select: {
            id: true,
            name: true,
            image: true,
            phone: true,
            email: true,
            status: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            watercolorUrl: true,
            watercolorThumbUrl: true,
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

    // Keep borrow request details visible even if users are inactive - this is historical data

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
    const body = await request.json();
    const {
      action,
      message,
      actualReturnDate,
      condition,
      conditionNote,
      photoUrl,
    } = body;

    // For magic link approve/decline, no authentication required
    // For all other actions, require authentication
    const isMagicLinkAction = ['approve', 'decline'].includes(action);
    let userId: string | undefined;

    if (!isMagicLinkAction) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      userId =
        (session.user as SessionUser)?.id ||
        (session as SessionWithUser).user?.id ||
        (session as SessionWithUser).userId;

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID not found' },
          { status: 400 }
        );
      }
    }

    // Validate action
    if (
      ![
        'approve',
        'decline',
        'return',
        'cancel',
        'confirm-return',
        'lender-return',
        'report-problem',
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            'Action must be one of: approve, decline, return, cancel, confirm-return, lender-return, report-problem',
        },
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
            status: true,
          },
        },
        lender: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            imageUrl: true,
            watercolorUrl: true,
            watercolorThumbUrl: true,
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
        // For magic link actions, only verify request is pending
        // For authenticated actions, verify user is lender
        if (!isMagicLinkAction && borrowRequest.lenderId !== userId) {
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
        };
        break;

      case 'return':
        if (borrowRequest.borrowerId !== userId) {
          return NextResponse.json(
            { error: 'Only the borrower can mark items as returned' },
            { status: 403 }
          );
        }
        if (borrowRequest.status !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Can only return items that are currently active' },
            { status: 400 }
          );
        }
        authorizedUser = true;
        newStatus = 'RETURN_PENDING';
        updateData = {
          status: newStatus,
          returnedAt: actualReturnDate
            ? new Date(actualReturnDate)
            : new Date(),
          borrowerReturnNote: message || null,
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

      case 'confirm-return':
        if (borrowRequest.lenderId !== userId) {
          return NextResponse.json(
            { error: 'Only the item owner can confirm returns' },
            { status: 403 }
          );
        }
        if (borrowRequest.status !== 'RETURN_PENDING') {
          return NextResponse.json(
            { error: 'Can only confirm items awaiting return confirmation' },
            { status: 400 }
          );
        }
        if (
          !condition ||
          !VALID_CONDITIONS.includes(condition as ConditionInput)
        ) {
          return NextResponse.json(
            {
              error: 'A return condition (OK, MINOR_WEAR, DAMAGED) is required',
            },
            { status: 400 }
          );
        }
        authorizedUser = true;
        newStatus = 'RETURNED';
        updateData = {
          status: newStatus,
          returnCondition: condition,
          returnConditionNote: conditionNote || null,
          returnPhotoUrl: photoUrl || null,
          returnConfirmedAt: new Date(),
          returnConfirmedBy: userId,
          returnedLate: computeReturnedLate(
            borrowRequest.requestedReturnDate,
            borrowRequest.returnedAt
          ),
          lenderMessage: message || 'Return confirmed by lender',
        };
        break;

      case 'lender-return':
        if (borrowRequest.lenderId !== userId) {
          return NextResponse.json(
            { error: 'Only the item owner can check in items' },
            { status: 403 }
          );
        }
        if (!['ACTIVE', 'APPROVED'].includes(borrowRequest.status)) {
          return NextResponse.json(
            {
              error:
                'Can only check in items that are currently active or approved',
            },
            { status: 400 }
          );
        }
        if (
          !condition ||
          !VALID_CONDITIONS.includes(condition as ConditionInput)
        ) {
          return NextResponse.json(
            {
              error: 'A return condition (OK, MINOR_WEAR, DAMAGED) is required',
            },
            { status: 400 }
          );
        }
        authorizedUser = true;
        newStatus = 'RETURNED';
        {
          const back = actualReturnDate
            ? new Date(actualReturnDate)
            : new Date();
          updateData = {
            status: newStatus,
            returnedAt: back,
            returnCondition: condition,
            returnConditionNote: conditionNote || null,
            returnPhotoUrl: photoUrl || null,
            returnConfirmedAt: new Date(),
            returnConfirmedBy: userId,
            returnedLate: computeReturnedLate(
              borrowRequest.requestedReturnDate,
              back
            ),
            lenderMessage: message || 'Item checked in by owner',
          };
        }
        break;

      case 'report-problem': {
        const isParty =
          borrowRequest.borrowerId === userId ||
          borrowRequest.lenderId === userId;
        if (!isParty) {
          return NextResponse.json(
            { error: 'Only the borrower or owner can report a problem' },
            { status: 403 }
          );
        }
        if (!['RETURN_PENDING', 'RETURNED'].includes(borrowRequest.status)) {
          return NextResponse.json(
            { error: 'Problems can only be reported on a returned borrow' },
            { status: 400 }
          );
        }
        const reference = borrowRequest.returnedAt ?? new Date();
        const ageMs = Date.now() - new Date(reference).getTime();
        if (ageMs > 7 * 24 * 60 * 60 * 1000) {
          return NextResponse.json(
            { error: 'The 7-day window to report a problem has passed' },
            { status: 400 }
          );
        }
        const validTypes = [
          'ITEM_DAMAGED',
          'ITEM_NOT_RETURNED',
          'ITEM_NOT_AS_DESCRIBED',
          'OTHER',
        ];
        const disputeType = validTypes.includes(body.disputeType)
          ? body.disputeType
          : 'OTHER';
        const otherPartyId =
          borrowRequest.borrowerId === userId
            ? borrowRequest.lenderId
            : borrowRequest.borrowerId;

        await db.dispute.create({
          data: {
            type: disputeType,
            status: 'OPEN',
            title: (body.title as string) || 'Reported problem',
            description: (message as string) || '',
            partyAId: userId!,
            partyBId: otherPartyId,
            itemId: borrowRequest.itemId,
            borrowRequestId: borrowRequest.id,
          },
        });

        if (userId) {
          await logAuditEntry({
            action: 'DISPUTE_REPORTED',
            userId,
            entityType: 'BORROW_REQUEST',
            entityId: borrowRequest.id,
            details: {
              action: 'report-problem',
              disputeType,
              borrowRequestId: borrowRequest.id,
              itemId: borrowRequest.item.id,
              itemName: borrowRequest.item.name,
              reportedTo: otherPartyId,
            },
          });
        }

        await createNotification({
          userId: otherPartyId,
          type: 'PROBLEM_REPORTED',
          title: 'A problem was reported',
          message: `A problem was reported on a borrow: ${(body.title as string) || disputeType}`,
        });

        return NextResponse.json({ success: true });
      }
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

    // Auto-create a Dispute when the owner marks the return as DAMAGED
    if (
      (action === 'confirm-return' || action === 'lender-return') &&
      condition === 'DAMAGED'
    ) {
      await db.dispute.create({
        data: {
          type: 'ITEM_DAMAGED',
          status: 'OPEN',
          title: `Item returned damaged: ${borrowRequest.item.name}`,
          description:
            (conditionNote as string) ||
            (message as string) ||
            'Marked damaged on return.',
          partyAId: userId!, // owner who assessed
          partyBId: borrowRequest.borrowerId,
          itemId: borrowRequest.itemId,
          borrowRequestId: borrowRequest.id,
        },
      });
      await createNotification({
        userId: borrowRequest.borrowerId,
        type: 'PROBLEM_REPORTED',
        title: 'Item reported damaged',
        message: `${borrowRequest.lender.name || 'The owner'} reported "${borrowRequest.item.name}" as damaged on return.`,
      });
      if (userId) {
        await logAuditEntry({
          action: 'DISPUTE_REPORTED',
          userId,
          entityType: 'BORROW_REQUEST',
          entityId: borrowRequest.id,
          details: {
            trigger: 'condition_damaged',
            disputeType: 'ITEM_DAMAGED',
            itemId: borrowRequest.itemId,
            itemName: borrowRequest.item.name,
          },
        });
      }
    }

    // Log status change for audit trail (skip if no userId for magic link)
    if (userId) {
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
    }

    // Update item availability based on new status
    await updateItemAvailability(
      borrowRequest.item.id,
      borrowRequest.id,
      newStatus as
        | 'APPROVED'
        | 'DECLINED'
        | 'RETURNED'
        | 'CANCELLED'
        | 'RETURN_PENDING',
      userId // This can be undefined for magic link actions
    );

    // Send notifications based on action
    try {
      let notificationSent = false;

      if (action === 'approve' || action === 'decline') {
        // Notify borrower of lender's decision using enhanced notification service
        const borrowRequestData = {
          ...borrowRequest,
          itemId: borrowRequest.itemId,
          borrowerId: borrowRequest.borrowerId,
          lenderId: borrowRequest.lenderId,
          requestMessage: borrowRequest.requestMessage || '',
          lenderMessage: message || `Request ${action}d`,
          videoUrl: borrowRequest.videoUrl || '',
          requestedReturnDate: borrowRequest.requestedReturnDate,
          borrower: {
            ...borrowRequest.borrower,
            name: borrowRequest.borrower.name || '',
            email: borrowRequest.borrower.email || '',
            phone: borrowRequest.borrower.phone || '',
            image: '',
          },
          lender: {
            ...borrowRequest.lender,
            name: borrowRequest.lender.name || '',
            email: borrowRequest.lender.email || '',
            phone: borrowRequest.lender.phone || '',
          },
          item: {
            ...borrowRequest.item,
            imageUrl: borrowRequest.item.imageUrl || '',
          },
        };

        if (action === 'approve') {
          await sendBorrowRequestApprovedNotification(borrowRequestData);
        } else {
          await sendBorrowRequestDeclinedNotification(borrowRequestData);
        }
        notificationSent = true;
      } else if (action === 'return') {
        // Notify lender that item has been returned using enhanced notification service
        const borrowRequestData = {
          ...borrowRequest,
          itemId: borrowRequest.itemId,
          borrowerId: borrowRequest.borrowerId,
          lenderId: borrowRequest.lenderId,
          requestMessage: borrowRequest.requestMessage || '',
          lenderMessage: borrowRequest.lenderMessage || '',
          videoUrl: borrowRequest.videoUrl || '',
          requestedReturnDate: borrowRequest.requestedReturnDate,
          borrower: {
            ...borrowRequest.borrower,
            name: borrowRequest.borrower.name || '',
            email: borrowRequest.borrower.email || '',
            phone: borrowRequest.borrower.phone || '',
            image: '',
          },
          lender: {
            ...borrowRequest.lender,
            name: borrowRequest.lender.name || '',
            email: borrowRequest.lender.email || '',
            phone: borrowRequest.lender.phone || '',
          },
          item: {
            ...borrowRequest.item,
            imageUrl: borrowRequest.item.imageUrl || '',
          },
        };

        await sendItemReturnedNotification(borrowRequestData, message);
        notificationSent = true;
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
      } else if (action === 'confirm-return' || action === 'lender-return') {
        // Notify the borrower that the owner confirmed/recorded the return
        const ownerName = borrowRequest.lender.name || 'The owner';
        const itemName = borrowRequest.item.name;
        const returnMessage =
          action === 'confirm-return'
            ? `${ownerName} confirmed the return of "${itemName}".`
            : `${ownerName} marked "${itemName}" as returned (checked in).`;
        await createNotification({
          userId: borrowRequest.borrowerId,
          type: 'RETURN_CONFIRMED',
          title: 'Return confirmed',
          message: returnMessage,
        });
        notificationSent = true;
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
      `📝 Borrow request ${id} status changed from ${borrowRequest.status} to ${newStatus} by ${userId ? `user ${userId}` : 'magic link'}`
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

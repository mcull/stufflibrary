import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import {
  sendBorrowRequestApprovedNotification,
  sendBorrowRequestDeclinedNotification,
} from '@/lib/enhanced-notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { borrowRequestId, decision, response } = body;

    // Validate required fields
    if (!borrowRequestId || !decision || !response) {
      return NextResponse.json(
        {
          error:
            'Borrow request ID, decision, and response message are required',
        },
        { status: 400 }
      );
    }

    if (!['approve', 'decline'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decision must be either "approve" or "decline"' },
        { status: 400 }
      );
    }

    // Find the borrow request with all related data
    const borrowRequest = await db.borrowRequest.findUnique({
      where: { id: borrowRequestId },
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
            imageUrl: true,
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

    // Check if already responded to
    if (borrowRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been responded to' },
        { status: 400 }
      );
    }

    // Note: Phone numbers are no longer required - email notifications will be used instead

    // Update the borrow request
    const updatedBorrowRequest = await db.borrowRequest.update({
      where: { id: borrowRequestId },
      data: {
        status: decision === 'approve' ? 'APPROVED' : 'DECLINED',
        lenderMessage: response,
        approvedAt: decision === 'approve' ? new Date() : null,
      },
    });

    // Send comprehensive notification to borrower (in-app + email)
    try {
      const borrowRequestData = {
        ...borrowRequest,
        itemId: borrowRequest.itemId,
        borrowerId: borrowRequest.borrowerId,
        lenderId: borrowRequest.lenderId,
        requestMessage: borrowRequest.requestMessage || '',
        lenderMessage: response,
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

      if (decision === 'approve') {
        await sendBorrowRequestApprovedNotification(borrowRequestData);
        console.log('📱 Approval notification sent to borrower');
      } else {
        await sendBorrowRequestDeclinedNotification(borrowRequestData);
        console.log('📱 Decline notification sent to borrower');
      }
    } catch (notificationError) {
      console.error(
        '❌ Failed to send response notification:',
        notificationError
      );
      // Don't fail the request if notification fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: 'Response recorded and borrower notified',
      borrowRequestId: updatedBorrowRequest.id,
      status: updatedBorrowRequest.status,
    });
  } catch (error) {
    console.error('Error processing borrow request response:', error);
    return NextResponse.json(
      { error: 'Failed to process response' },
      { status: 500 }
    );
  }
}

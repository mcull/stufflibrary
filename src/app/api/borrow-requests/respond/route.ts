import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { sendBorrowResponseNotification } from '@/lib/twilio';

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
          },
        },
        item: {
          select: {
            id: true,
            name: true,
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
    if (borrowRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been responded to' },
        { status: 400 }
      );
    }

    // Validate that borrower has phone for notifications
    if (!borrowRequest.borrower.phone) {
      return NextResponse.json(
        { error: 'Borrower phone number required for notifications' },
        { status: 400 }
      );
    }

    // Update the borrow request
    const updatedBorrowRequest = await db.borrowRequest.update({
      where: { id: borrowRequestId },
      data: {
        status: decision === 'approve' ? 'approved' : 'declined',
        lenderResponse: response,
        respondedAt: new Date(),
      },
    });

    // Send SMS notification to borrower
    try {
      await sendBorrowResponseNotification({
        _borrowerName: borrowRequest.borrower.name || 'Borrower',
        borrowerPhone: borrowRequest.borrower.phone,
        ownerName: borrowRequest.lender.name || 'Owner',
        itemName: borrowRequest.item.name,
        approved: decision === 'approve',
        message: response,
      });

      console.log('📱 SMS response notification sent to borrower');
    } catch (smsError) {
      console.error('❌ Failed to send SMS response notification:', smsError);
      // Don't fail the request if SMS fails, but log it
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

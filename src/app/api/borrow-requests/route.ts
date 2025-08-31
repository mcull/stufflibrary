// import { put } from '@vercel/blob'; // Not used in Mux flow
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendBorrowRequestReceivedNotification } from '@/lib/enhanced-notification-service';
import { sendBorrowRequestNotification } from '@/lib/twilio';

// GET - Fetch borrow requests for the current user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Fetch all borrow requests where user is either borrower or lender
    const borrowRequests = await db.borrowRequest.findMany({
      where: {
        OR: [
          { borrowerId: userId }, // Requests I made
          { lenderId: userId }, // Requests to my items
        ],
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            watercolorUrl: true,
            watercolorThumbUrl: true,
          },
        },
        borrower: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        lender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Separate into categories
    const sentRequests = borrowRequests.filter(
      (req) => req.borrowerId === userId
    );
    const receivedRequests = borrowRequests.filter(
      (req) => req.lenderId === userId
    );
    const activeBorrows = borrowRequests.filter(
      (req) =>
        req.borrowerId === userId &&
        (req.status === 'ACTIVE' || req.status === 'APPROVED')
    );
    const onLoan = borrowRequests.filter(
      (req) =>
        req.lenderId === userId &&
        req.borrowerId !== userId && // Exclude self-borrows (offline items)
        (req.status === 'ACTIVE' || req.status === 'APPROVED')
    );

    return NextResponse.json({
      sentRequests,
      receivedRequests,
      activeBorrows,
      onLoan,
      all: borrowRequests,
    });
  } catch (error) {
    console.error('Error fetching borrow requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrow requests' },
      { status: 500 }
    );
  }
}

// POST - Create a new borrow request (Mux flow)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Check if this is form data (Mux flow) or JSON (new schema flow)
    let itemId: string;
    let requestedReturnDate: string;
    let requestMessage: string | undefined;
    let isJsonRequest = false;

    const contentType = request.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      // New schema flow
      isJsonRequest = true;
      const body = await request.json();
      ({ itemId, requestedReturnDate, requestMessage } = body);
    } else {
      // Mux flow (existing BorrowRequestClient)
      const formData = await request.formData();
      itemId = formData.get('itemId') as string;
      const promisedReturnBy = formData.get('promisedReturnBy') as string;
      requestedReturnDate = promisedReturnBy; // Use the same field
      requestMessage = formData.get('promiseText') as string;
    }

    // Validate required fields
    if (!itemId || !requestedReturnDate) {
      return NextResponse.json(
        {
          error: 'Item ID and requested return date are required',
        },
        { status: 400 }
      );
    }

    // Get item and owner details
    const item = await db.item.findUnique({
      where: { id: itemId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Don't let users borrow their own items
    if (item.ownerId === userId) {
      return NextResponse.json(
        { error: 'You cannot borrow your own item' },
        { status: 400 }
      );
    }

    // Get borrower details
    const borrower = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (!borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 400 }
      );
    }

    // Note: Phone numbers are no longer required - email notifications will be used instead

    // Check if item is available using new schema logic
    // Note: We'll assume isAvailable field still exists for backward compatibility
    // and add currentBorrowRequestId check for new schema
    const isAvailable = !item.currentBorrowRequestId;

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Item is not available for borrowing' },
        { status: 400 }
      );
    }

    if (isJsonRequest) {
      console.log('📝 Creating borrow request for new schema flow');
    } else {
      console.log('📹 Creating borrow request for Mux upload flow');
    }

    // Create the borrow request using new schema
    const borrowRequest = await db.borrowRequest.create({
      data: {
        borrowerId: userId,
        lenderId: item.ownerId,
        itemId: itemId,
        requestMessage: requestMessage || null,
        videoUrl: null, // Will be set by webhook when video is processed (Mux flow)
        requestedReturnDate: new Date(requestedReturnDate),
        status: 'PENDING',
      },
      include: {
        borrower: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            watercolorUrl: true,
            watercolorThumbUrl: true,
          },
        },
      },
    });

    // Create approval URL using the borrow request ID (same as in-app notifications)
    const approvalUrl = `${process.env.NEXTAUTH_URL}/borrow-approval/${borrowRequest.id}`;

    // Send in-app notification using enhanced notification service
    try {
      await sendBorrowRequestReceivedNotification(
        {
          ...borrowRequest,
          requestMessage: borrowRequest.requestMessage || '',
          lenderMessage: borrowRequest.lenderMessage || '',
          videoUrl: borrowRequest.videoUrl || '',
          borrower: {
            id: borrowRequest.borrower.id,
            name: borrowRequest.borrower.name || '',
            image: borrowRequest.borrower.image || '',
            phone: borrower.phone || '',
            email: borrower.email || '',
          },
          lender: {
            id: item.owner.id,
            name: item.owner.name || '',
            email: item.owner.email || '',
            phone: item.owner.phone || '',
          },
          item: {
            ...borrowRequest.item,
            imageUrl: borrowRequest.item.imageUrl || '',
          },
        },
        approvalUrl
      );
      console.log('📱 In-app notification created successfully');
    } catch (notificationError) {
      console.error(
        '❌ Failed to create in-app notification:',
        notificationError
      );
      // Don't fail the request if notification fails
    }

    // Send SMS and email notification to owner
    try {
      if (!item.owner.phone && !item.owner.email) {
        console.warn(
          '⚠️ Owner has no phone number or email - notification skipped'
        );
      } else {
        const notificationResult = await sendBorrowRequestNotification({
          ownerName: item.owner.name || 'Owner',
          ...(item.owner.phone && { ownerPhone: item.owner.phone }),
          ...(item.owner.email && { ownerEmail: item.owner.email }),
          borrowerName: borrower.name || 'Someone',
          itemName: item.name,
          approvalUrl: approvalUrl,
        });

        if (notificationResult.success) {
          const methods = [];
          if (notificationResult.sms.success) methods.push('SMS');
          if (notificationResult.email.success) methods.push('email');
          console.log(
            `📱 Notification sent successfully via: ${methods.join(' and ')}`
          );
        } else {
          console.error('❌ All notifications failed:', {
            sms: notificationResult.sms.error,
            email: notificationResult.email.error,
          });
        }
      }
    } catch (notificationError) {
      console.error('❌ Failed to send notification:', notificationError);

      // Provide specific guidance for common issues
      if (
        notificationError instanceof Error &&
        notificationError.message.includes('accountSid must start with AC')
      ) {
        console.error(
          '🔧 TWILIO CONFIG ERROR: Please update TWILIO_ACCOUNT_SID in your .env file with a valid Account SID from https://console.twilio.com/'
        );
      } else if (
        notificationError instanceof Error &&
        notificationError.message.includes('RESEND_API_KEY')
      ) {
        console.error(
          '📧 RESEND CONFIG ERROR: Please check RESEND_API_KEY in your .env file'
        );
      } else if (
        notificationError instanceof Error &&
        notificationError.message.includes(
          'Phone number is required but was empty'
        )
      ) {
        console.error(
          '📞 PHONE NUMBER ERROR: Owner does not have a valid phone number set in their profile'
        );
      } else if (
        notificationError instanceof Error &&
        notificationError.message.includes('Invalid phone number format')
      ) {
        console.error(
          '📞 PHONE FORMAT ERROR: Owner phone number is not in valid E.164 format:',
          item.owner.phone
        );
      }

      // Don't fail the request if notifications fail, but log it
    }

    return NextResponse.json({
      success: true,
      borrowRequestId: borrowRequest.id,
      message: 'Borrow request sent successfully',
    });
  } catch (error) {
    console.error('Error creating borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to create borrow request' },
      { status: 500 }
    );
  }
}

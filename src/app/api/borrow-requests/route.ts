// import { put } from '@vercel/blob'; // Not used in Mux flow
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
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
      (req) => req.status === 'ACTIVE'
    );

    return NextResponse.json({
      sentRequests,
      receivedRequests,
      activeBorrows,
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

    const body = await request.json();
    const { itemId, requestedReturnDate } = body;

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

    if (!borrower || !borrower.phone) {
      return NextResponse.json(
        { error: 'Borrower phone number required for notifications' },
        { status: 400 }
      );
    }

    if (!item.owner.phone) {
      return NextResponse.json(
        { error: 'Item owner phone number required for notifications' },
        { status: 400 }
      );
    }

    // For Mux flow, we create the borrow request first without video
    // Video will be uploaded directly to Mux and connected via webhook
    console.log('📹 Creating borrow request for Mux upload flow');

    // Generate secure token for approval page
    const responseToken = uuidv4();

    // Create the borrow request
    const borrowRequest = await db.borrowRequest.create({
      data: {
        borrowerId: userId,
        lenderId: item.ownerId,
        itemId: itemId,
        videoUrl: null, // Will be set by webhook when video is processed
        promiseText: promiseText,
        promisedReturnBy: new Date(promisedReturnBy),
        responseToken: responseToken,
        status: 'pending',
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
          },
        },
      },
    });

    // Create approval URL
    const approvalUrl = `${process.env.NEXTAUTH_URL}/borrow-approval/${responseToken}`;

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

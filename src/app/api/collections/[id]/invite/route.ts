import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Resend } from 'resend';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const libraryId = id;

    // Validate request body
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user is library owner or admin
    const library = await db.collection.findFirst({
      where: {
        id: libraryId,
        OR: [
          { ownerId: userId }, // Owner
          {
            members: {
              some: {
                userId: userId,
                role: 'admin',
                isActive: true,
              },
            },
          }, // Admin member
        ],
      },
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
    });

    if (!library) {
      return NextResponse.json(
        { error: 'Library not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMember = await db.collectionMember.findFirst({
      where: {
        libraryId,
        user: { email },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this library' },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await db.invitation.findFirst({
      where: {
        email,
        libraryId,
        senderId: userId,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email for this library' },
        { status: 400 }
      );
    }

    // Rate limiting: max 5 invitations per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentInvitations = await db.invitation.count({
      where: {
        senderId: userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (recentInvitations >= 5) {
      return NextResponse.json(
        {
          error:
            'Rate limit exceeded. You can send up to 5 invitations per hour.',
        },
        { status: 429 }
      );
    }

    // Generate secure token for magic link
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create invitation record
    const invitation = await db.invitation.create({
      data: {
        email,
        type: 'library',
        status: 'PENDING',
        token,
        libraryId,
        senderId: userId,
        expiresAt,
      },
      include: {
        library: {
          select: { name: true, location: true },
        },
        sender: {
          select: { name: true },
        },
      },
    });

    // Send invitation email
    try {
      const magicLink = `${process.env.NEXTAUTH_URL}/api/invitations/${token}`;

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'StuffLibrary <invites@stufflibrary.org>',
        to: [email],
        subject: `You're invited to join ${invitation.library?.name} on StuffLibrary!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">StuffLibrary</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 5px 0 0 0;">Share more, buy less</p>
            </div>
            
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">
              You're invited to join ${invitation.library?.name}!
            </h2>
            
            <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 20px;">
              ${invitation.sender?.name || 'Someone'} has invited you to join their sharing community on StuffLibrary.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${invitation.library?.name}</h3>
              ${invitation.library?.location ? `<p style="margin: 0; color: #6b7280;">📍 ${invitation.library.location}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" 
                 style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Join ${invitation.library?.name}
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
              This invitation will expire in 7 days. If you don't have a StuffLibrary account, one will be created for you automatically.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              StuffLibrary - Building sharing communities, one neighborhood at a time.<br>
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      // Update invitation status to SENT
      await db.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);

      // Don't fail the request, but log the error
      // Invitation still exists in database
      return NextResponse.json({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: 'PENDING',
          expiresAt: invitation.expiresAt,
        },
        warning: 'Invitation created but email sending failed',
      });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: 'SENT',
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

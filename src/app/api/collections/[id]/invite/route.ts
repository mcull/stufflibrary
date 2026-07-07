import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Resend } from 'resend';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserCapabilities } from '@/lib/user-capabilities';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[api/collections/:id/invite POST] start', { id });
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id!;
    const libraryId = id;

    // Validate request body
    const body = await request.json();
    const email = body?.email as string | undefined;
    const mode = (body?.mode as 'email' | 'link' | undefined) || 'email';
    console.log('[api/collections/:id/invite] body', {
      mode,
      hasEmail: !!email,
    });
    const sendEmail = body?.sendEmail !== false; // default true

    if (mode !== 'link' && (!email || typeof email !== 'string')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (mode !== 'link' && !emailRegex.test(email!)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user is library owner or admin
    let library = await db.collection.findFirst({
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
        _count: true,
      },
    });

    if (!library) {
      // Not an owner/admin — must at least be an active member to be here.
      const member = await db.collectionMember.findFirst({
        where: { collectionId: libraryId, userId, isActive: true },
        select: { id: true },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Library not found or insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Inviting is a social action: everyone permitted here (owner/admin or a
    // member) needs a full profile — photo + verified address — before bringing
    // neighbors in, plus the trust tier if they're not the owner/admin. Pass the
    // library context so owner/admin status is reflected in canInvite.
    const caps = await getUserCapabilities(userId, { libraryId });
    if (!caps.canInvite) {
      return NextResponse.json(
        {
          error:
            caps.reasons.canInvite === 'NEEDS_TRUST_TIER'
              ? 'You need to reach the Trusted tier before inviting others to this library.'
              : 'Add a photo and verify your address before inviting neighbors.',
          reason: caps.reasons.canInvite,
        },
        { status: 403 }
      );
    }

    // Non-owner path: re-load the collection for the email payload.
    if (!library) {
      library = await db.collection.findFirst({
        where: { id: libraryId },
        include: {
          owner: { select: { name: true, email: true } },
          _count: true,
        },
      });

      if (!library) {
        return NextResponse.json(
          { error: 'Library not found' },
          { status: 404 }
        );
      }
    }

    // Check if user is already a member (active or inactive)
    const existingMember =
      mode === 'link'
        ? null
        : await db.collectionMember.findFirst({
            where: {
              collectionId: libraryId,
              user: { email: email! },
            },
            select: { id: true, isActive: true },
          });

    if (existingMember) {
      if (!existingMember.isActive) {
        // Reactivate inactive membership instead of erroring
        await db.collectionMember.update({
          where: { id: existingMember.id },
          data: { isActive: true },
        });
        return NextResponse.json({
          success: true,
          message: 'Reactivated existing membership for this user.',
        });
      }
      return NextResponse.json(
        { error: 'User is already a member of this library' },
        { status: 400 }
      );
    }

    // Any prior invitation for this (email, sender, library) — the schema has
    // a unique constraint on that triple, so a second create would 500 (#409).
    // A live one gets re-sent as-is; a consumed/expired/declined one gets
    // re-issued with a fresh token so a wrongly-burned invite heals itself.
    const existingInvitation =
      mode === 'link'
        ? null
        : await db.invitation.findFirst({
            where: { email: email!, libraryId, senderId: userId },
          });

    // Rate limiting per library (0 = unlimited)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const perHourLimit =
      (library as any).inviteRateLimitPerHour != null
        ? Number((library as any).inviteRateLimitPerHour)
        : 0;
    const recentInvitations = await db.invitation.count({
      where: {
        senderId: userId,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (perHourLimit > 0 && recentInvitations >= perHourLimit) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. You can send up to ${perHourLimit} invitations per hour.`,
        },
        { status: 429 }
      );
    }

    // Set expiration to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitationInclude = {
      collection: {
        select: { name: true, location: true },
      },
      sender: {
        select: { name: true },
      },
    };

    const liveToken =
      existingInvitation &&
      existingInvitation.token &&
      ['PENDING', 'SENT'].includes(existingInvitation.status) &&
      existingInvitation.expiresAt > new Date()
        ? existingInvitation.token
        : null;

    // Still-live invite keeps its token (the already-emailed link stays
    // valid); anything else gets a fresh one.
    const isLiveInvitation = liveToken !== null;
    const token = liveToken ?? crypto.randomBytes(32).toString('hex');

    let invitation;
    if (existingInvitation) {
      invitation = await db.invitation.update({
        where: { id: existingInvitation.id },
        data: isLiveInvitation
          ? {}
          : {
              token,
              status: 'PENDING',
              expiresAt,
              acceptedAt: null,
              receiverId: null,
              sentAt: null,
            },
        include: invitationInclude,
      });
    } else {
      invitation = await db.invitation.create({
        data: {
          email:
            mode === 'link' ? `link-${token}@share.stufflibrary.local` : email!,
          type: 'library',
          status: 'PENDING',
          token,
          libraryId,
          senderId: userId,
          expiresAt,
        },
        include: invitationInclude,
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || '';
    const shareLink = `${baseUrl}/j/${token}`;
    console.log('[api/collections/:id/invite] created token', {
      mode,
      tokenLen: token.length,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    });
    // Send invitation email (email mode only, or if explicitly requested)
    if (mode === 'email' && sendEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'StuffLibrary <invites@stufflibrary.org>',
          to: [email!],
          subject: `You're invited to join ${invitation.collection?.name} on StuffLibrary!`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; font-size: 28px; margin: 0;">StuffLibrary</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 5px 0 0 0;">Share more, buy less</p>
            </div>
            
            <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">
              You're invited to join ${invitation.collection?.name}!
            </h2>
            
            <p style="font-size: 16px; line-height: 1.5; color: #374151; margin-bottom: 20px;">
              ${invitation.sender?.name || 'Someone'} has invited you to join their sharing community on StuffLibrary.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${invitation.collection?.name}</h3>
              ${invitation.collection?.location ? `<p style="margin: 0; color: #6b7280;">📍 ${invitation.collection.location}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${shareLink}" 
                 style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Join ${invitation.collection?.name}
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
        return NextResponse.json({
          success: true,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            status: 'PENDING',
            expiresAt: invitation.expiresAt,
          },
          link: shareLink,
          warning: 'Invitation created but email sending failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: mode === 'email' && sendEmail ? 'SENT' : 'PENDING',
        expiresAt: invitation.expiresAt,
      },
      link: shareLink,
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

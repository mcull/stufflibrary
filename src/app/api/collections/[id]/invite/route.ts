import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Resend } from 'resend';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildLibraryInviteEmail } from '@/lib/invite-email';
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
        // The email leads with the library's own item watercolors when it has
        // any (#412); stock art covers empty shelves.
        const artItems = await db.item.findMany({
          where: {
            collections: { some: { collectionId: libraryId } },
            active: true,
            OR: [
              { watercolorThumbUrl: { not: null } },
              { watercolorUrl: { not: null } },
            ],
          },
          select: { name: true, watercolorThumbUrl: true, watercolorUrl: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });
        const itemWatercolors = artItems.map((i) => ({
          url: (i.watercolorThumbUrl || i.watercolorUrl)!,
          name: i.name,
        }));

        const { subject, html } = buildLibraryInviteEmail({
          libraryName: invitation.collection?.name || 'a library',
          senderName: invitation.sender?.name,
          shareLink,
          description:
            (library as { description?: string | null }).description ?? null,
          itemWatercolors,
        });

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'StuffLibrary <invites@stufflibrary.org>',
          to: [email!],
          subject,
          html,
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

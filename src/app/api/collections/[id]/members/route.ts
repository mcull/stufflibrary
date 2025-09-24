import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
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
    const collectionId = id;

    // Check if user is a member of this collection
    const userMembership = await db.collectionMember.findFirst({
      where: {
        collectionId,
        userId,
        isActive: true,
      },
    });

    const isOwner = await db.collection.findFirst({
      where: {
        id: collectionId,
        ownerId: userId,
      },
    });

    if (!userMembership && !isOwner) {
      return NextResponse.json(
        { error: 'Collection not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all members for this collection
    const members = await db.collectionMember.findMany({
      where: {
        collectionId,
        isActive: true,
        user: { status: 'active' },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            addresses: {
              where: { isActive: true },
              take: 1,
              select: {
                address1: true,
                city: true,
                state: true,
                zip: true,
                formattedAddress: true,
              },
            },
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // owners first, then admins, then members
        { joinedAt: 'asc' },
      ],
    });

    // Also include the owner as a member
    const collection = await db.collection.findUnique({
      where: { id: collectionId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            addresses: {
              where: { isActive: true },
              take: 1,
              select: {
                address1: true,
                city: true,
                state: true,
                zip: true,
                formattedAddress: true,
              },
            },
          },
        },
      },
    });

    const allMembers = [
      // Owner (only if active)
      ...(collection?.owner && collection.owner.status === 'active'
        ? [
            {
              id: `owner-${collection.owner.id}`,
              role: 'owner',
              joinedAt: collection.createdAt,
              user: collection.owner,
            },
          ]
        : []),
      // Regular members
      ...members.map((member) => ({
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
    ];

    return NextResponse.json({
      members: allMembers,
    });
  } catch (error) {
    console.error('Error fetching collection members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

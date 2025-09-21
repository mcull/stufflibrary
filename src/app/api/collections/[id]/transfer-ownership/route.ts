import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as { id?: string }).id!;
    const { id: collectionId } = await params;
    const { newOwnerId } = await request.json();

    if (!newOwnerId || typeof newOwnerId !== 'string') {
      return NextResponse.json(
        { error: 'newOwnerId is required' },
        { status: 400 }
      );
    }

    const collection = await db.collection.findUnique({
      where: { id: collectionId },
      select: { ownerId: true },
    });
    if (!collection)
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );

    if (collection.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Only the current owner can transfer ownership' },
        { status: 403 }
      );
    }

    // Ensure target is an active member (admin or member)
    const targetMembership = await db.collectionMember.findFirst({
      where: { collectionId, userId: newOwnerId, isActive: true },
      select: { id: true, role: true },
    });
    if (!targetMembership) {
      return NextResponse.json(
        { error: 'New owner must be an active member' },
        { status: 400 }
      );
    }

    // Transfer ownership: update collection.ownerId, demote previous owner to admin membership
    await db.$transaction(async (tx) => {
      await tx.collection.update({
        where: { id: collectionId },
        data: { ownerId: newOwnerId },
      });

      // Ensure previous owner has an admin membership (create or update)
      const prevOwnerMembership = await tx.collectionMember.findFirst({
        where: { collectionId, userId },
        select: { id: true, role: true, isActive: true },
      });
      if (prevOwnerMembership) {
        await tx.collectionMember.update({
          where: { id: prevOwnerMembership.id },
          data: { role: 'admin', isActive: true },
        });
      } else {
        await tx.collectionMember.create({
          data: { collectionId, userId, role: 'admin', isActive: true },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error transferring ownership:', error);
    return NextResponse.json(
      { error: 'Failed to transfer ownership' },
      { status: 500 }
    );
  }
}

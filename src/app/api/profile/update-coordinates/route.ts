import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as any)?.id;
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, latitude, longitude } = await request.json();

    // Only allow users to update their own coordinates or admin users
    if (userId !== sessionUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the user's current address with coordinates
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { addresses: { where: { isActive: true } } },
    });

    if (!user || !user.addresses.length) {
      return NextResponse.json(
        { error: 'User or active address not found' },
        { status: 404 }
      );
    }

    const currentAddress = user.addresses[0]; // Get the active address
    if (!currentAddress) {
      return NextResponse.json(
        { error: 'No active address found' },
        { status: 404 }
      );
    }

    await db.address.update({
      where: { id: currentAddress.id },
      data: {
        latitude,
        longitude,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating coordinates:', error);
    return NextResponse.json(
      { error: 'Failed to update coordinates' },
      { status: 500 }
    );
  }
}

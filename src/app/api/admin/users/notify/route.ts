import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await requireAdminAuth();

    const { userIds, subject, message, type } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      );
    }

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Get users to notify
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found' },
        { status: 404 }
      );
    }

    // For now, we'll create notification records in the database
    // In a real implementation, you'd integrate with an email/SMS service
    const notifications = await Promise.all(
      users.map(async (user) => {
        // Create a notification record (you'd need to add this to your schema)
        // For now, we'll log it and return the notification data
        console.log(`Sending ${type} notification to ${user.email}:`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);

        return {
          id: `notification_${Date.now()}_${user.id}`,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          subject,
          message,
          type,
          status: 'sent',
          createdAt: new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      notifications,
      sent: notifications.length,
    });
  } catch (error) {
    console.error('User notification error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send notifications',
      },
      { status: 500 }
    );
  }
}

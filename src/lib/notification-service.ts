import { NotificationType } from '@prisma/client';

import { db } from './db';
import { sendEmail } from './twilio';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  relatedItemId?: string;
  relatedRequestId?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
  emailTemplate?: EmailTemplateData;
}

export interface EmailTemplateData {
  subject: string;
  html: string;
  to?: string; // Override recipient email
}

/**
 * Create a notification and optionally send email
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl,
  relatedItemId,
  relatedRequestId,
  metadata,
  sendEmail: shouldSendEmail = false,
  emailTemplate,
}: CreateNotificationData) {
  try {
    // Dedupe guard: if a recent notification exists for the same user/type
    // and the same relatedRequestId (preferred) or relatedItemId, skip creating
    // a duplicate row. If email is requested and the existing row has not sent
    // email, send it and update that row.
    const dedupeWindowMinutes = 10;
    const cutoff = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000);

    const dedupeWhere: any = { userId, type, createdAt: { gte: cutoff } };
    if (relatedRequestId) {
      dedupeWhere.relatedRequestId = relatedRequestId;
    } else if (relatedItemId) {
      dedupeWhere.relatedItemId = relatedItemId;
    }

    // Only attempt dedupe if we have a meaningful discriminator
    if (relatedRequestId || relatedItemId) {
      const existing = await db.notification.findFirst({
        where: dedupeWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (existing) {
        // Optionally send email if requested and not already sent
        if (
          shouldSendEmail &&
          emailTemplate &&
          !existing.emailSent &&
          (existing as any).user?.email
        ) {
          try {
            const emailResult = await sendEmail({
              to: emailTemplate.to || (existing as any).user.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
            });
            if (emailResult.success) {
              await db.notification.update({
                where: { id: existing.id },
                data: { emailSent: true, emailSentAt: new Date() },
              });
            }
          } catch (emailError) {
            if (process.env.NODE_ENV !== 'test') {
              console.error(
                'Failed to send notification email (dedupe path):',
                emailError
              );
            }
          }
        }

        return existing;
      }
    }

    // Create in-app notification
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        ...(actionUrl && { actionUrl }),
        ...(relatedItemId && { relatedItemId }),
        ...(relatedRequestId && { relatedRequestId }),
        metadata: (metadata || {}) as any,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send email if requested and template provided
    const notificationWithUser = notification as typeof notification & {
      user?: { id: string; name?: string; email?: string };
    };

    if (shouldSendEmail && emailTemplate && notificationWithUser.user?.email) {
      try {
        const emailResult = await sendEmail({
          to: emailTemplate.to || notificationWithUser.user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        if (emailResult.success) {
          // Mark email as sent
          await db.notification.update({
            where: { id: notification.id },
            data: {
              emailSent: true,
              emailSentAt: new Date(),
            },
          });
        }
      } catch (emailError) {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Failed to send notification email:', emailError);
        }
        // Don't fail the notification creation if email fails
      }
    }

    return notification;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error creating notification:', error);
    }
    throw new Error('Failed to create notification');
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: NotificationType[];
  } = {}
) {
  const { limit = 50, offset = 0, unreadOnly = false, types } = options;

  const whereClause: any = { userId };

  if (unreadOnly) {
    whereClause.isRead = false;
  }

  if (types && types.length > 0) {
    whereClause.type = { in: types };
  }

  const [notifications, totalCount] = await Promise.all([
    db.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.notification.count({ where: whereClause }),
  ]);

  return {
    notifications,
    totalCount,
    hasMore: offset + notifications.length < totalCount,
  };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  const notification = await db.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure user owns the notification
    },
    data: { isRead: true },
  });

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  const result = await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return result;
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string) {
  const count = await db.notification.count({
    where: { userId, isRead: false },
  });

  return count;
}

/**
 * Delete old notifications (cleanup utility)
 */
export async function cleanupOldNotifications(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await db.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true, // Only delete read notifications
    },
  });

  console.log(`Cleaned up ${result.count} old notifications`);
  return result;
}

// Notification type helpers for easier creation
export const NotificationHelpers = {
  async borrowRequestReceived(lenderId: string, borrowRequest: any) {
    return createNotification({
      userId: lenderId,
      type: 'BORROW_REQUEST_RECEIVED',
      title: 'New Borrow Request',
      message: `${borrowRequest.borrower.name} wants to borrow your "${borrowRequest.item.name}"`,
      actionUrl: `/borrow-approval/${borrowRequest.id}`,
      relatedItemId: borrowRequest.itemId,
      relatedRequestId: borrowRequest.id,
      metadata: {
        borrowerName: borrowRequest.borrower.name,
        itemName: borrowRequest.item.name,
        requestMessage: borrowRequest.requestMessage,
      },
    });
  },

  async borrowRequestApproved(borrowerId: string, borrowRequest: any) {
    return createNotification({
      userId: borrowerId,
      type: 'BORROW_REQUEST_APPROVED',
      title: 'Request Approved! 🎉',
      message: `${borrowRequest.lender.name} approved your request for "${borrowRequest.item.name}"`,
      actionUrl: `/borrow-requests/${borrowRequest.id}`,
      relatedItemId: borrowRequest.itemId,
      relatedRequestId: borrowRequest.id,
      metadata: {
        lenderName: borrowRequest.lender.name,
        itemName: borrowRequest.item.name,
        lenderMessage: borrowRequest.lenderMessage,
      },
    });
  },

  async borrowRequestDeclined(borrowerId: string, borrowRequest: any) {
    return createNotification({
      userId: borrowerId,
      type: 'BORROW_REQUEST_DECLINED',
      title: 'Request Update',
      message: `Your request for "${borrowRequest.item.name}" couldn't be approved this time`,
      actionUrl: `/borrow-requests/${borrowRequest.id}`,
      relatedItemId: borrowRequest.itemId,
      relatedRequestId: borrowRequest.id,
      metadata: {
        lenderName: borrowRequest.lender.name,
        itemName: borrowRequest.item.name,
        lenderMessage: borrowRequest.lenderMessage,
      },
    });
  },

  async itemReturned(lenderId: string, borrowRequest: any) {
    return createNotification({
      userId: lenderId,
      type: 'ITEM_RETURNED',
      title: 'Item Returned',
      message: `${borrowRequest.borrower.name} has marked "${borrowRequest.item.name}" as returned`,
      actionUrl: `/borrow-requests/${borrowRequest.id}`,
      relatedItemId: borrowRequest.itemId,
      relatedRequestId: borrowRequest.id,
      metadata: {
        borrowerName: borrowRequest.borrower.name,
        itemName: borrowRequest.item.name,
        returnedAt: new Date().toISOString(),
      },
    });
  },

  async itemDueTomorrow(borrowerId: string, borrowRequest: any) {
    return createNotification({
      userId: borrowerId,
      type: 'ITEM_DUE_TOMORROW',
      title: 'Return Reminder',
      message: `"${borrowRequest.item.name}" is due back tomorrow`,
      actionUrl: `/borrow-requests/${borrowRequest.id}`,
      relatedItemId: borrowRequest.itemId,
      relatedRequestId: borrowRequest.id,
      metadata: {
        itemName: borrowRequest.item.name,
        lenderName: borrowRequest.lender.name,
        dueDate: borrowRequest.requestedReturnDate,
      },
    });
  },
};

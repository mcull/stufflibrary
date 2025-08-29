/**
 * Enhanced notification service that combines in-app notifications with emails
 * This integrates with the existing borrow request flow and email templates
 */

import { NotificationType } from '@prisma/client';

import { EmailTemplates } from './email-templates';
import { createNotification } from './notification-service';
import {
  sendBorrowRequestNotification,
  sendBorrowResponseNotification,
  sendReturnNotification,
} from './twilio';

interface BorrowRequest {
  id: string;
  itemId: string;
  borrowerId: string;
  lenderId: string;
  status: string;
  requestMessage?: string;
  lenderMessage?: string;
  videoUrl?: string;
  requestedReturnDate: Date;
  borrower: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
  };
  lender: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  item: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

/**
 * Send comprehensive notification for new borrow request
 */
export async function sendBorrowRequestReceivedNotification(
  borrowRequest: BorrowRequest,
  approvalUrl: string
) {
  try {
    // Create in-app notification
    const notificationPromise = createNotification({
      userId: borrowRequest.lenderId,
      type: 'BORROW_REQUEST_RECEIVED' as NotificationType,
      title: 'New Borrow Request',
      message: `${borrowRequest.borrower.name} wants to borrow your "${borrowRequest.item.name}"`,
      actionUrl: `/lender/requests/${borrowRequest.id}`,
      relatedItemId: borrowRequest.itemId,
      relatedRequestId: borrowRequest.id,
      metadata: {
        borrowerName: borrowRequest.borrower.name,
        itemName: borrowRequest.item.name,
        requestMessage: borrowRequest.requestMessage,
        videoUrl: borrowRequest.videoUrl,
      },
    });

    // Send email with rich template
    let emailPromise: Promise<any> | undefined;
    if (borrowRequest.lender.email) {
      const templateProps: Parameters<
        typeof EmailTemplates.borrowRequestReceived
      >[0] = {
        recipientName: borrowRequest.lender.name || 'There',
        borrowerName: borrowRequest.borrower.name || 'Someone',
        itemName: borrowRequest.item.name,
        requestedReturnDate:
          borrowRequest.requestedReturnDate.toLocaleDateString(),
        approvalUrl,
      };

      if (borrowRequest.borrower.image) {
        templateProps.borrowerImage = borrowRequest.borrower.image;
      }
      if (borrowRequest.item.imageUrl) {
        templateProps.itemImage = borrowRequest.item.imageUrl;
      }
      if (borrowRequest.videoUrl) {
        templateProps.videoThumbnail = `${borrowRequest.videoUrl}?thumbnail=true`;
      }
      if (borrowRequest.requestMessage) {
        templateProps.requestMessage = borrowRequest.requestMessage;
      }

      const emailTemplate = EmailTemplates.borrowRequestReceived(templateProps);

      emailPromise = createNotification({
        userId: borrowRequest.lenderId,
        type: 'BORROW_REQUEST_RECEIVED' as NotificationType,
        title: 'New Borrow Request',
        message: `${borrowRequest.borrower.name} wants to borrow your "${borrowRequest.item.name}"`,
        sendEmail: true,
        emailTemplate: {
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          to: borrowRequest.lender.email,
        },
      });
    }

    // Legacy SMS notification for backward compatibility
    const legacyNotificationData: Parameters<
      typeof sendBorrowRequestNotification
    >[0] = {
      ownerName: borrowRequest.lender.name || 'Owner',
      borrowerName: borrowRequest.borrower.name || 'Someone',
      itemName: borrowRequest.item.name,
      approvalUrl,
    };

    if (borrowRequest.lender.phone) {
      legacyNotificationData.ownerPhone = borrowRequest.lender.phone;
    }
    if (borrowRequest.lender.email) {
      legacyNotificationData.ownerEmail = borrowRequest.lender.email;
    }

    const legacySmsPromise = sendBorrowRequestNotification(
      legacyNotificationData
    );

    // Wait for all notifications to complete
    const results = await Promise.allSettled(
      [notificationPromise, emailPromise, legacySmsPromise].filter(Boolean)
    );

    // Log results for debugging
    results.forEach((result, index) => {
      const types = ['in-app', 'email', 'SMS'];
      if (result.status === 'rejected') {
        console.error(
          `Failed to send ${types[index]} notification:`,
          result.reason
        );
      }
    });

    return {
      success: true,
      inApp: results[0]?.status === 'fulfilled',
      email: emailPromise ? results[1]?.status === 'fulfilled' : null,
      sms: results[results.length - 1]?.status === 'fulfilled',
    };
  } catch (error) {
    console.error('Error sending borrow request received notification:', error);
    throw error;
  }
}

/**
 * Send comprehensive notification for approved borrow request
 */
export async function sendBorrowRequestApprovedNotification(
  borrowRequest: BorrowRequest
) {
  try {
    // Create in-app notification
    const notificationPromise = createNotification({
      userId: borrowRequest.borrowerId,
      type: 'BORROW_REQUEST_APPROVED' as NotificationType,
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

    // Send rich email notification
    let emailPromise: Promise<any> | undefined;
    if (borrowRequest.borrower.email) {
      const templateProps: Parameters<
        typeof EmailTemplates.borrowRequestApproved
      >[0] = {
        recipientName: borrowRequest.borrower.name || 'There',
        lenderName: borrowRequest.lender.name || 'The owner',
        itemName: borrowRequest.item.name,
        returnDate: borrowRequest.requestedReturnDate.toLocaleDateString(),
      };

      if (borrowRequest.item.imageUrl) {
        templateProps.itemImage = borrowRequest.item.imageUrl;
      }
      if (borrowRequest.lenderMessage) {
        templateProps.lenderMessage = borrowRequest.lenderMessage;
      }
      if (borrowRequest.lender.phone) {
        templateProps.contactInfo = borrowRequest.lender.phone;
      }

      const emailTemplate = EmailTemplates.borrowRequestApproved(templateProps);

      emailPromise = createNotification({
        userId: borrowRequest.borrowerId,
        type: 'BORROW_REQUEST_APPROVED' as NotificationType,
        title: 'Request Approved! 🎉',
        message: `${borrowRequest.lender.name} approved your request for "${borrowRequest.item.name}"`,
        sendEmail: true,
        emailTemplate: {
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          to: borrowRequest.borrower.email,
        },
      });
    }

    // Legacy SMS notification
    const legacySmsPromise = borrowRequest.borrower.phone
      ? sendBorrowResponseNotification({
          _borrowerName: borrowRequest.borrower.name || 'Borrower',
          borrowerPhone: borrowRequest.borrower.phone,
          ownerName: borrowRequest.lender.name || 'Owner',
          itemName: borrowRequest.item.name,
          approved: true,
          message: borrowRequest.lenderMessage || 'Request approved',
        })
      : null;

    const results = await Promise.allSettled(
      [notificationPromise, emailPromise, legacySmsPromise].filter(Boolean)
    );

    return {
      success: true,
      inApp: results[0]?.status === 'fulfilled',
      email: emailPromise ? results[1]?.status === 'fulfilled' : null,
      sms: legacySmsPromise
        ? results[results.length - 1]?.status === 'fulfilled'
        : null,
    };
  } catch (error) {
    console.error('Error sending borrow request approved notification:', error);
    throw error;
  }
}

/**
 * Send comprehensive notification for declined borrow request
 */
export async function sendBorrowRequestDeclinedNotification(
  borrowRequest: BorrowRequest
) {
  try {
    // Create in-app notification
    const notificationPromise = createNotification({
      userId: borrowRequest.borrowerId,
      type: 'BORROW_REQUEST_DECLINED' as NotificationType,
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

    // Send empathetic email notification
    let emailPromise: Promise<any> | undefined;
    if (borrowRequest.borrower.email) {
      const templateProps: Parameters<
        typeof EmailTemplates.borrowRequestDeclined
      >[0] = {
        recipientName: borrowRequest.borrower.name || 'There',
        lenderName: borrowRequest.lender.name || 'The owner',
        itemName: borrowRequest.item.name,
      };

      if (borrowRequest.item.imageUrl) {
        templateProps.itemImage = borrowRequest.item.imageUrl;
      }
      if (borrowRequest.lenderMessage) {
        templateProps.lenderMessage = borrowRequest.lenderMessage;
      }

      const emailTemplate = EmailTemplates.borrowRequestDeclined(templateProps);

      emailPromise = createNotification({
        userId: borrowRequest.borrowerId,
        type: 'BORROW_REQUEST_DECLINED' as NotificationType,
        title: 'Request Update',
        message: `Your request for "${borrowRequest.item.name}" couldn't be approved this time`,
        sendEmail: true,
        emailTemplate: {
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          to: borrowRequest.borrower.email,
        },
      });
    }

    // Legacy SMS notification
    const legacySmsPromise = borrowRequest.borrower.phone
      ? sendBorrowResponseNotification({
          _borrowerName: borrowRequest.borrower.name || 'Borrower',
          borrowerPhone: borrowRequest.borrower.phone,
          ownerName: borrowRequest.lender.name || 'Owner',
          itemName: borrowRequest.item.name,
          approved: false,
          message: borrowRequest.lenderMessage || 'Request declined',
        })
      : null;

    const results = await Promise.allSettled(
      [notificationPromise, emailPromise, legacySmsPromise].filter(Boolean)
    );

    return {
      success: true,
      inApp: results[0]?.status === 'fulfilled',
      email: emailPromise ? results[1]?.status === 'fulfilled' : null,
      sms: legacySmsPromise
        ? results[results.length - 1]?.status === 'fulfilled'
        : null,
    };
  } catch (error) {
    console.error('Error sending borrow request declined notification:', error);
    throw error;
  }
}

/**
 * Send comprehensive notification when item is returned
 */
export async function sendItemReturnedNotification(
  borrowRequest: BorrowRequest,
  borrowerNotes?: string
) {
  try {
    // Create in-app notification
    const notificationPromise = createNotification({
      userId: borrowRequest.lenderId,
      type: 'ITEM_RETURNED' as NotificationType,
      title: 'Item Returned',
      message: `${borrowRequest.borrower.name} has marked "${borrowRequest.item.name}" as returned`,
      actionUrl: `/borrow-requests/${borrowRequest.id}`,
      relatedItemId: borrowRequest.itemId,
      relatedRequestId: borrowRequest.id,
      metadata: {
        borrowerName: borrowRequest.borrower.name,
        itemName: borrowRequest.item.name,
        returnedAt: new Date().toISOString(),
        borrowerNotes,
      },
    });

    // Send detailed email notification
    let emailPromise: Promise<any> | undefined;
    if (borrowRequest.lender.email) {
      const templateProps: Parameters<typeof EmailTemplates.itemReturned>[0] = {
        recipientName: borrowRequest.lender.name || 'There',
        borrowerName: borrowRequest.borrower.name || 'The borrower',
        itemName: borrowRequest.item.name,
        returnDate: new Date().toLocaleDateString(),
      };

      if (borrowRequest.item.imageUrl) {
        templateProps.itemImage = borrowRequest.item.imageUrl;
      }
      if (borrowerNotes) {
        templateProps.borrowerNotes = borrowerNotes;
      }
      templateProps.confirmReturnUrl = `/borrow-requests/${borrowRequest.id}`;

      const emailTemplate = EmailTemplates.itemReturned(templateProps);

      emailPromise = createNotification({
        userId: borrowRequest.lenderId,
        type: 'ITEM_RETURNED' as NotificationType,
        title: 'Item Returned',
        message: `${borrowRequest.borrower.name} has marked "${borrowRequest.item.name}" as returned`,
        sendEmail: true,
        emailTemplate: {
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          to: borrowRequest.lender.email,
        },
      });
    }

    // Legacy notification
    const legacyNotificationData: Parameters<typeof sendReturnNotification>[0] =
      {
        ownerName: borrowRequest.lender.name || 'Owner',
        borrowerName: borrowRequest.borrower.name || 'Borrower',
        itemName: borrowRequest.item.name,
        returnDate: new Date(),
      };

    if (borrowRequest.lender.phone) {
      legacyNotificationData.ownerPhone = borrowRequest.lender.phone;
    }
    if (borrowRequest.lender.email) {
      legacyNotificationData.ownerEmail = borrowRequest.lender.email;
    }
    if (borrowerNotes) {
      legacyNotificationData.borrowerNotes = borrowerNotes;
    }

    const legacyPromise = sendReturnNotification(legacyNotificationData);

    const results = await Promise.allSettled(
      [notificationPromise, emailPromise, legacyPromise].filter(Boolean)
    );

    return {
      success: true,
      inApp: results[0]?.status === 'fulfilled',
      email: emailPromise ? results[1]?.status === 'fulfilled' : null,
      legacy: results[results.length - 1]?.status === 'fulfilled',
    };
  } catch (error) {
    console.error('Error sending item returned notification:', error);
    throw error;
  }
}

/**
 * Send return reminder notification (24 hours before due date)
 */
export async function sendReturnReminderNotification(
  borrowRequest: BorrowRequest
) {
  try {
    // Create in-app notification
    const notificationPromise = createNotification({
      userId: borrowRequest.borrowerId,
      type: 'ITEM_DUE_TOMORROW' as NotificationType,
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

    // Send helpful email reminder
    let emailPromise: Promise<any> | undefined;
    if (borrowRequest.borrower.email) {
      const templateProps: Parameters<typeof EmailTemplates.returnReminder>[0] =
        {
          recipientName: borrowRequest.borrower.name || 'There',
          itemName: borrowRequest.item.name,
          lenderName: borrowRequest.lender.name || 'the owner',
          returnDate: borrowRequest.requestedReturnDate.toLocaleDateString(),
        };

      if (borrowRequest.item.imageUrl) {
        templateProps.itemImage = borrowRequest.item.imageUrl;
      }
      if (borrowRequest.lender.phone) {
        templateProps.contactInfo = borrowRequest.lender.phone;
      }

      const emailTemplate = EmailTemplates.returnReminder(templateProps);

      emailPromise = createNotification({
        userId: borrowRequest.borrowerId,
        type: 'ITEM_DUE_TOMORROW' as NotificationType,
        title: 'Return Reminder',
        message: `"${borrowRequest.item.name}" is due back tomorrow`,
        sendEmail: true,
        emailTemplate: {
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          to: borrowRequest.borrower.email,
        },
      });
    }

    const results = await Promise.allSettled(
      [notificationPromise, emailPromise].filter(Boolean)
    );

    return {
      success: true,
      inApp: results[0]?.status === 'fulfilled',
      email: emailPromise ? results[1]?.status === 'fulfilled' : null,
    };
  } catch (error) {
    console.error('Error sending return reminder notification:', error);
    throw error;
  }
}

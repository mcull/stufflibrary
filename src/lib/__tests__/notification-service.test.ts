import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  NotificationHelpers,
} from '../notification-service';
import { db } from '../db';
import { sendEmail } from '../twilio';

// Mock the database and email service
vi.mock('../db', () => ({
  db: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../twilio', () => ({
  sendEmail: vi.fn(),
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNotification', () => {
    it('should create in-app notification without email', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'BORROW_REQUEST_RECEIVED',
        title: 'New Request',
        message: 'Someone wants to borrow your item',
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      vi.mocked(db.notification.create).mockResolvedValue(mockNotification as any);

      const result = await createNotification({
        userId: 'user-123',
        type: 'BORROW_REQUEST_RECEIVED',
        title: 'New Request',
        message: 'Someone wants to borrow your item',
        actionUrl: '/borrow-approval/123',
        relatedItemId: 'item-123',
        relatedRequestId: 'request-123',
      });

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'BORROW_REQUEST_RECEIVED',
          title: 'New Request',
          message: 'Someone wants to borrow your item',
          actionUrl: '/borrow-approval/123',
          relatedItemId: 'item-123',
          relatedRequestId: 'request-123',
          metadata: {},
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

      expect(result).toEqual(mockNotification);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should create notification and send email when requested', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'BORROW_REQUEST_RECEIVED',
        title: 'New Request',
        message: 'Someone wants to borrow your item',
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      vi.mocked(db.notification.create).mockResolvedValue(mockNotification as any);
      vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'email-123' });
      vi.mocked(db.notification.update).mockResolvedValue({ ...mockNotification, emailSent: true } as any);

      await createNotification({
        userId: 'user-123',
        type: 'BORROW_REQUEST_RECEIVED',
        title: 'New Request',
        message: 'Someone wants to borrow your item',
        sendEmail: true,
        emailTemplate: {
          subject: 'New Borrow Request',
          html: '<p>Someone wants to borrow your item</p>',
        },
      });

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: 'New Borrow Request',
        html: '<p>Someone wants to borrow your item</p>',
      });

      expect(db.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: {
          emailSent: true,
          emailSentAt: expect.any(Date),
        },
      });
    });

    it('should continue if email sending fails', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'BORROW_REQUEST_RECEIVED',
        title: 'New Request',
        message: 'Someone wants to borrow your item',
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      vi.mocked(db.notification.create).mockResolvedValue(mockNotification as any);
      vi.mocked(sendEmail).mockRejectedValue(new Error('Email service down'));

      const result = await createNotification({
        userId: 'user-123',
        type: 'BORROW_REQUEST_RECEIVED',
        title: 'New Request',
        message: 'Someone wants to borrow your item',
        sendEmail: true,
        emailTemplate: {
          subject: 'New Borrow Request',
          html: '<p>Someone wants to borrow your item</p>',
        },
      });

      expect(result).toEqual(mockNotification);
      expect(db.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch user notifications with default options', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'BORROW_REQUEST_RECEIVED',
          title: 'New Request',
          message: 'Someone wants to borrow your item',
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'notif-2', 
          type: 'BORROW_REQUEST_APPROVED',
          title: 'Request Approved',
          message: 'Your request was approved',
          isRead: true,
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.notification.findMany).mockResolvedValue(mockNotifications as any);
      vi.mocked(db.notification.count).mockResolvedValue(2);

      const result = await getUserNotifications('user-123');

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });

      expect(db.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });

      expect(result).toEqual({
        notifications: mockNotifications,
        totalCount: 2,
        hasMore: false,
      });
    });

    it('should filter by unread notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          isRead: false,
        },
      ];

      vi.mocked(db.notification.findMany).mockResolvedValue(mockNotifications as any);
      vi.mocked(db.notification.count).mockResolvedValue(1);

      await getUserNotifications('user-123', { unreadOnly: true });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter by notification types', async () => {
      vi.mocked(db.notification.findMany).mockResolvedValue([]);
      vi.mocked(db.notification.count).mockResolvedValue(0);

      await getUserNotifications('user-123', { 
        types: ['BORROW_REQUEST_RECEIVED', 'BORROW_REQUEST_APPROVED'] 
      });

      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { 
          userId: 'user-123', 
          type: { in: ['BORROW_REQUEST_RECEIVED', 'BORROW_REQUEST_APPROVED'] } 
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notif-123',
        isRead: true,
      };

      vi.mocked(db.notification.update).mockResolvedValue(mockNotification as any);

      const result = await markNotificationAsRead('notif-123', 'user-123');

      expect(db.notification.update).toHaveBeenCalledWith({
        where: { 
          id: 'notif-123',
          userId: 'user-123',
        },
        data: { isRead: true },
      });

      expect(result).toEqual(mockNotification);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all user notifications as read', async () => {
      vi.mocked(db.notification.updateMany).mockResolvedValue({ count: 5 });

      const result = await markAllNotificationsAsRead('user-123');

      expect(db.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        data: { isRead: true },
      });

      expect(result).toEqual({ count: 5 });
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return unread notification count', async () => {
      vi.mocked(db.notification.count).mockResolvedValue(3);

      const result = await getUnreadNotificationCount('user-123');

      expect(db.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
      });

      expect(result).toBe(3);
    });
  });

  describe('NotificationHelpers', () => {
    it('should create borrow request received notification', async () => {
      const mockBorrowRequest = {
        id: 'request-123',
        itemId: 'item-123',
        borrower: {
          id: 'borrower-123',
          name: 'John Borrower',
        },
        item: {
          id: 'item-123',
          name: 'Test Item',
        },
        requestMessage: 'I need this for a project',
      };

      const mockNotification = {
        id: 'notif-123',
        userId: 'lender-123',
        type: 'BORROW_REQUEST_RECEIVED',
      };

      vi.mocked(db.notification.create).mockResolvedValue({
        ...mockNotification,
        user: { id: 'lender-123', name: 'Jane Lender', email: 'jane@example.com' },
      } as any);

      const result = await NotificationHelpers.borrowRequestReceived('lender-123', mockBorrowRequest);

      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'lender-123',
          type: 'BORROW_REQUEST_RECEIVED',
          title: 'New Borrow Request',
          message: 'John Borrower wants to borrow your "Test Item"',
          actionUrl: '/borrow-approval/request-123',
          relatedItemId: 'item-123',
          relatedRequestId: 'request-123',
          metadata: {
            borrowerName: 'John Borrower',
            itemName: 'Test Item',
            requestMessage: 'I need this for a project',
          },
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

      expect(result).toBeDefined();
    });
  });
});
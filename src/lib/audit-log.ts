import { db } from './db';

export type AuditAction =
  | 'BORROW_REQUEST_CREATED'
  | 'BORROW_REQUEST_APPROVED'
  | 'BORROW_REQUEST_DECLINED'
  | 'BORROW_REQUEST_CANCELLED'
  | 'BORROW_REQUEST_RETURNED'
  | 'ITEM_AVAILABILITY_UPDATED';

export interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  entityType: 'BORROW_REQUEST' | 'ITEM';
  entityId: string;
  details?: Record<string, unknown>;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
  };
}

/**
 * Log an audit trail entry for tracking important system changes
 */
export async function logAuditEntry({
  action,
  userId,
  entityType,
  entityId,
  details,
  metadata,
}: AuditLogEntry): Promise<void> {
  try {
    // For now, we'll log to console with structured format
    // In the future, this could be stored in a dedicated audit_logs table
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      entityType,
      entityId,
      details: details || {},
      metadata: metadata || {},
    };

    console.log('📋 AUDIT LOG:', JSON.stringify(auditEntry, null, 2));

    await db.auditLog.create({
      data: {
        action,
        userId,
        entityType,
        entityId,
        details: (details || {}) as any,
        metadata: (metadata || {}) as any,
        ipAddress: metadata?.ipAddress ?? null,
        userAgent: metadata?.userAgent ?? null,
      },
    });
  } catch (error) {
    // Don't let audit logging failure affect main operation
    console.error('❌ Failed to log audit entry:', error);
  }
}

/**
 * Log a borrow request status change
 */
export async function logBorrowRequestStatusChange(
  borrowRequestId: string,
  userId: string,
  previousStatus: string,
  newStatus: string,
  additionalDetails?: Record<string, unknown>
): Promise<void> {
  const actionMap: Record<string, AuditAction> = {
    'PENDING-APPROVED': 'BORROW_REQUEST_APPROVED',
    'PENDING-DECLINED': 'BORROW_REQUEST_DECLINED',
    'PENDING-CANCELLED': 'BORROW_REQUEST_CANCELLED',
    'APPROVED-CANCELLED': 'BORROW_REQUEST_CANCELLED',
    'ACTIVE-RETURNED': 'BORROW_REQUEST_RETURNED',
    'ACTIVE-CANCELLED': 'BORROW_REQUEST_CANCELLED',
  };

  const transitionKey = `${previousStatus}-${newStatus}`;
  const action = actionMap[transitionKey];

  if (!action) {
    console.warn(`⚠️ Unknown status transition: ${transitionKey}`);
    return;
  }

  await logAuditEntry({
    action,
    userId,
    entityType: 'BORROW_REQUEST',
    entityId: borrowRequestId,
    details: {
      statusChange: {
        from: previousStatus,
        to: newStatus,
      },
      ...additionalDetails,
    },
    metadata: {
      previousState: { status: previousStatus },
      newState: { status: newStatus },
    },
  });
}

/**
 * Log item availability changes
 */
export async function logItemAvailabilityChange(
  itemId: string,
  userId: string,
  borrowRequestId: string,
  newStatus: string,
  wasAvailable: boolean,
  isNowAvailable: boolean
): Promise<void> {
  await logAuditEntry({
    action: 'ITEM_AVAILABILITY_UPDATED',
    userId,
    entityType: 'ITEM',
    entityId: itemId,
    details: {
      borrowRequestId,
      statusCause: newStatus,
      availabilityChange: {
        from: wasAvailable,
        to: isNowAvailable,
      },
    },
    metadata: {
      previousState: { available: wasAvailable },
      newState: { available: isNowAvailable },
    },
  });
}

import type { Prisma } from '@prisma/client';

import { db } from './db';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_LOCKED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'API_ABUSE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'IP_BLOCKED'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_BREACH_ATTEMPT'
  | 'ADMIN_ACTION'
  | 'BULK_OPERATION'
  | 'EXPORT_DATA'
  | 'DELETE_ACCOUNT';

export type SecuritySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BlockedIPReason =
  | 'FAILED_LOGINS'
  | 'API_ABUSE'
  | 'SUSPICIOUS_ACTIVITY'
  | 'MANUAL_BLOCK'
  | 'AUTOMATED_THREAT'
  | 'SPAM'
  | 'BOT_TRAFFIC';

export interface SecurityEventData {
  type: SecurityEventType;
  severity?: SecuritySeverity;
  message: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string | undefined;
  userId?: string | undefined;
  endpoint?: string;
  method?: string;
  statusCode?: number;
}

export interface BlockedIPData {
  ipAddress: string;
  reason: BlockedIPReason;
  description?: string;
  expiresAt?: Date;
  blockedBy?: string;
}

function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Persist a security event. Logging must never break the request path, so all
 * DB errors are swallowed (and surfaced to the console outside tests).
 */
export async function logSecurityEvent(
  eventData: SecurityEventData
): Promise<void> {
  try {
    await db.securityEvent.create({
      data: {
        type: eventData.type,
        severity: eventData.severity ?? 'INFO',
        message: eventData.message,
        ...(eventData.details !== undefined
          ? { details: eventData.details as Prisma.InputJsonValue }
          : {}),
        ipAddress: eventData.ipAddress ?? null,
        userAgent: eventData.userAgent ?? null,
        userId: eventData.userId ?? null,
        endpoint: eventData.endpoint ?? null,
        method: eventData.method ?? null,
        statusCode: eventData.statusCode ?? null,
      },
    });
  } catch (error) {
    if (!isTest()) {
      console.error('Failed to persist security event:', error);
    }
  }
}

/**
 * Block (or re-block) an IP. Unlike logging, errors propagate so the calling
 * admin route can report failure.
 */
export async function blockIP(blockData: BlockedIPData): Promise<void> {
  await db.blockedIP.upsert({
    where: { ipAddress: blockData.ipAddress },
    create: {
      ipAddress: blockData.ipAddress,
      reason: blockData.reason,
      description: blockData.description ?? null,
      expiresAt: blockData.expiresAt ?? null,
      blockedBy: blockData.blockedBy ?? null,
      isActive: true,
    },
    update: {
      reason: blockData.reason,
      description: blockData.description ?? null,
      expiresAt: blockData.expiresAt ?? null,
      blockedBy: blockData.blockedBy ?? null,
      isActive: true,
      blockedAt: new Date(),
    },
  });

  await logSecurityEvent({
    type: 'IP_BLOCKED',
    severity: 'HIGH',
    message: `IP ${blockData.ipAddress} blocked (${blockData.reason})`,
    ipAddress: blockData.ipAddress,
    ...(blockData.blockedBy ? { userId: blockData.blockedBy } : {}),
  });
}

/**
 * Whether an IP currently has an active, unexpired block. Fails open (returns
 * false) so a DB hiccup can never lock out all traffic.
 */
export async function isIPBlocked(ipAddress: string): Promise<boolean> {
  try {
    const block = await db.blockedIP.findFirst({
      where: {
        ipAddress,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    return block !== null;
  } catch (error) {
    if (!isTest()) {
      console.error('isIPBlocked check failed:', error);
    }
    return false;
  }
}

export async function unblockIP(
  ipAddress: string,
  adminId?: string
): Promise<void> {
  await db.blockedIP.updateMany({
    where: { ipAddress },
    data: { isActive: false },
  });

  await logSecurityEvent({
    type: 'ADMIN_ACTION',
    severity: 'INFO',
    message: `IP ${ipAddress} unblocked`,
    ipAddress,
    ...(adminId ? { userId: adminId } : {}),
  });
}

export async function getSecurityMetrics(startDate: Date, endDate: Date) {
  const where: Prisma.SecurityEventWhereInput = {
    createdAt: { gte: startDate, lte: endDate },
  };

  const [
    eventsByType,
    eventsBySeverity,
    blockedIPCount,
    recentHighSeverityEvents,
    totalEvents,
  ] = await Promise.all([
    db.securityEvent.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
    }),
    db.securityEvent.groupBy({
      by: ['severity'],
      where,
      _count: { severity: true },
    }),
    db.blockedIP.count({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
    db.securityEvent.findMany({
      where: { ...where, severity: { in: ['HIGH', 'CRITICAL'] } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.securityEvent.count({ where }),
  ]);

  return {
    eventsByType,
    eventsBySeverity,
    blockedIPCount,
    recentHighSeverityEvents,
    totalEvents,
  };
}

export async function trackFailedLogin(
  ipAddress: string,
  userAgent?: string,
  userId?: string
): Promise<void> {
  const eventData: SecurityEventData = {
    type: 'LOGIN_FAILED',
    severity: 'LOW',
    message: `Failed login attempt from IP ${ipAddress}`,
    ipAddress,
  };

  if (userAgent) eventData.userAgent = userAgent;
  if (userId) eventData.userId = userId;

  await logSecurityEvent(eventData);
}

export async function trackSuccessfulLogin(
  ipAddress: string,
  userId: string,
  userAgent?: string
): Promise<void> {
  const eventData: SecurityEventData = {
    type: 'LOGIN_SUCCESS',
    severity: 'INFO',
    message: `Successful login from IP ${ipAddress}`,
    ipAddress,
    userId,
  };

  if (userAgent) eventData.userAgent = userAgent;

  await logSecurityEvent(eventData);
}

// TODO: Uncomment when schema is migrated
// import { db } from './db';
// import { RedisService } from './redis';

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

// Temporary mock implementation until database schema is migrated
export async function logSecurityEvent(
  eventData: SecurityEventData
): Promise<void> {
  console.log('🔒 SECURITY EVENT:', eventData);
}

export async function blockIP(blockData: BlockedIPData): Promise<void> {
  console.log('🚫 BLOCK IP:', blockData);
}

export async function isIPBlocked(_ipAddress: string): Promise<boolean> {
  return false; // Always return false until schema is migrated
}

export async function unblockIP(
  ipAddress: string,
  adminId?: string
): Promise<void> {
  console.log('🔓 UNBLOCK IP:', ipAddress, 'by:', adminId);
}

export async function getSecurityMetrics(_startDate: Date, _endDate: Date) {
  // Mock data until schema is migrated
  return {
    eventsByType: [
      { type: 'LOGIN_FAILED', _count: { type: 15 } },
      { type: 'LOGIN_SUCCESS', _count: { type: 45 } },
    ],
    eventsBySeverity: [
      { severity: 'INFO', _count: { severity: 50 } },
      { severity: 'HIGH', _count: { severity: 3 } },
    ],
    blockedIPCount: 0,
    recentHighSeverityEvents: [],
    totalEvents: 60,
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

import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';
// TODO: Uncomment when schema is migrated
// import { db } from '@/lib/db';
import { getSecurityMetrics } from '@/lib/security-logger';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 24h, 7d, 30d

    // Calculate date ranges based on period
    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // TODO: Replace with actual database queries once schema is migrated
    const securityMetrics = await getSecurityMetrics(startDate, endDate);
    const recentCriticalEvents: any[] = [];
    const activeBlockedIPs = 0;
    const suspiciousIPs: {
      ipAddress: string;
      _count: { ipAddress: number };
    }[] = [];

    // Uncomment when schema is migrated:
    // const [securityMetrics, recentCriticalEvents, activeBlockedIPs, suspiciousIPs] = await Promise.all([
    //   // Get security metrics from our security logger service
    //   getSecurityMetrics(startDate, endDate),
    //
    //   // Recent critical security events (last 24 hours)
    //   db.securityEvent.findMany({
    //     where: {
    //       severity: { in: ['HIGH', 'CRITICAL'] },
    //       createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    //     },
    //     include: {
    //       user: {
    //         select: { id: true, name: true, email: true },
    //       },
    //     },
    //     orderBy: { createdAt: 'desc' },
    //     take: 10,
    //   }),
    //
    //   // Currently active blocked IPs
    //   db.blockedIP.count({
    //     where: {
    //       isActive: true,
    //       OR: [
    //         { expiresAt: null },
    //         { expiresAt: { gt: new Date() } }
    //       ],
    //     },
    //   }),
    //
    //   // IPs with multiple failed login attempts in last hour
    //   db.securityEvent.groupBy({
    //     by: ['ipAddress'],
    //     where: {
    //       type: 'LOGIN_FAILED',
    //       createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    //       ipAddress: { not: null },
    //     },
    //     _count: { ipAddress: true },
    //     having: {
    //       ipAddress: { _count: { gt: 2 } },
    //     },
    //     orderBy: {
    //       _count: { ipAddress: 'desc' },
    //     },
    //     take: 10,
    //   }),
    // ]);

    // Calculate threat level based on recent activity
    const criticalEventsLast24h = recentCriticalEvents.length;
    const failedLoginsLast24h =
      securityMetrics.eventsByType.find((e: any) => e.type === 'LOGIN_FAILED')
        ?._count.type || 0;

    let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (criticalEventsLast24h > 10 || failedLoginsLast24h > 100) {
      threatLevel = 'CRITICAL';
    } else if (criticalEventsLast24h > 5 || failedLoginsLast24h > 50) {
      threatLevel = 'HIGH';
    } else if (criticalEventsLast24h > 2 || failedLoginsLast24h > 20) {
      threatLevel = 'MEDIUM';
    } else {
      threatLevel = 'LOW';
    }

    return NextResponse.json({
      overview: {
        threatLevel,
        totalEvents: securityMetrics.totalEvents,
        activeBlockedIPs,
        criticalEventsLast24h,
        suspiciousIPs: suspiciousIPs.length,
      },
      metrics: securityMetrics,
      recentCriticalEvents,
      suspiciousIPs: suspiciousIPs.map((ip: any) => ({
        ipAddress: ip.ipAddress,
        failedAttempts: ip._count.ipAddress,
      })),
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Security dashboard fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Access denied' },
      { status: 401 }
    );
  }
}

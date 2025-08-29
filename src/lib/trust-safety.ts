import {
  ReportPriority,
  UserReportReason,
  AdminActionType,
} from '@prisma/client';

import { db } from '@/lib/db';

export interface FlaggingRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: ReportPriority;
  checkFunction: () => Promise<string[]>;
}

export class TrustSafetyService {
  private static instance: TrustSafetyService;
  private rules: FlaggingRule[] = [];

  private constructor() {
    this.initializeRules();
  }

  public static getInstance(): TrustSafetyService {
    if (!TrustSafetyService.instance) {
      TrustSafetyService.instance = new TrustSafetyService();
    }
    return TrustSafetyService.instance;
  }

  private initializeRules() {
    this.rules = [
      {
        id: 'multiple-overdue-items',
        name: 'Multiple Failed Returns',
        description: 'Flag users with 3+ items overdue by more than 7 days',
        isActive: true,
        priority: ReportPriority.HIGH,
        checkFunction: this.checkMultipleOverdueItems.bind(this),
      },
      {
        id: 'suspicious-borrowing-pattern',
        name: 'Suspicious Activity Pattern',
        description: 'Flag accounts with rapid borrowing without returns',
        isActive: true,
        priority: ReportPriority.MEDIUM,
        checkFunction: this.checkSuspiciousBorrowingPattern.bind(this),
      },
      {
        id: 'low-trust-score',
        name: 'Trust Score Threshold',
        description: 'Monitor users below 500 trust score',
        isActive: true,
        priority: ReportPriority.MEDIUM,
        checkFunction: this.checkLowTrustScore.bind(this),
      },
      {
        id: 'multiple-reports',
        name: 'Multiple Reports',
        description: 'Escalate users with 5+ reports from different sources',
        isActive: true,
        priority: ReportPriority.HIGH,
        checkFunction: this.checkMultipleReports.bind(this),
      },
    ];
  }

  public async runAutomatedFlagging(): Promise<void> {
    console.log('Running automated flagging checks...');

    for (const rule of this.rules) {
      if (!rule.isActive) continue;

      try {
        const flaggedUserIds = await rule.checkFunction();

        if (flaggedUserIds.length > 0) {
          await this.createAutomatedReports(flaggedUserIds, rule);
          console.log(
            `Rule "${rule.name}" flagged ${flaggedUserIds.length} users`
          );
        }
      } catch (error) {
        console.error(`Error running rule "${rule.name}":`, error);
      }
    }
  }

  private async checkMultipleOverdueItems(): Promise<string[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdueUsers = await db.user.findMany({
      where: {
        borrowRequests: {
          some: {
            status: 'ACTIVE',
            requestedReturnDate: {
              lt: sevenDaysAgo,
            },
          },
        },
      },
      include: {
        borrowRequests: {
          where: {
            status: 'ACTIVE',
            requestedReturnDate: {
              lt: sevenDaysAgo,
            },
          },
        },
      },
    });

    return overdueUsers
      .filter((user) => user.borrowRequests.length >= 3)
      .map((user) => user.id);
  }

  private async checkSuspiciousBorrowingPattern(): Promise<string[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const suspiciousUsers = await db.user.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        borrowRequests: {
          some: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
      include: {
        borrowRequests: {
          where: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
    });

    return suspiciousUsers
      .filter((user) => {
        const recentRequests = user.borrowRequests.length;
        const returnedRequests = user.borrowRequests.filter(
          (req) => req.status === 'RETURNED'
        ).length;
        const returnRate = returnedRequests / recentRequests;

        // Flag users with 5+ requests but <50% return rate
        return recentRequests >= 5 && returnRate < 0.5;
      })
      .map((user) => user.id);
  }

  private async checkLowTrustScore(): Promise<string[]> {
    const lowTrustUsers = await db.user.findMany({
      where: {
        trustScore: {
          lt: 500,
        },
        isSuspended: false, // Don't flag already suspended users
      },
    });

    return lowTrustUsers.map((user) => user.id);
  }

  private async checkMultipleReports(): Promise<string[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reportCounts = await db.userReport.groupBy({
      by: ['reportedId'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        status: 'PENDING',
      },
      _count: {
        reporterId: true,
      },
    });

    return reportCounts
      .filter((report) => report._count.reporterId >= 5)
      .map((report) => report.reportedId);
  }

  private async createAutomatedReports(
    userIds: string[],
    rule: FlaggingRule
  ): Promise<void> {
    const systemAdminId = await this.getSystemAdminId();

    for (const userId of userIds) {
      // Check if we already have a recent automated report for this user and rule
      const existingReport = await db.userReport.findFirst({
        where: {
          reportedId: userId,
          description: {
            contains: rule.name,
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (existingReport) continue;

      await db.userReport.create({
        data: {
          reporterId: systemAdminId,
          reportedId: userId,
          reason: UserReportReason.SAFETY_CONCERN,
          description: `Automated flagging: ${rule.description}`,
          priority: rule.priority,
          status: 'PENDING',
          evidence: {
            automatedRule: rule.id,
            flaggedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  private async getSystemAdminId(): Promise<string> {
    // In a real implementation, you would have a system admin user
    // For now, we'll create or find one
    let systemAdmin = await db.user.findFirst({
      where: {
        email: 'system@stufflibrary.com',
      },
    });

    if (!systemAdmin) {
      systemAdmin = await db.user.create({
        data: {
          email: 'system@stufflibrary.com',
          name: 'System Administrator',
          status: 'active',
        },
      });
    }

    return systemAdmin.id;
  }

  public async calculateTrustScore(userId: string): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        borrowRequests: true,
        lentItems: true,
        reportedByUser: true,
        reportsCreated: true,
      },
    });

    if (!user) return 0;

    let score = 1000; // Starting score

    // Factor in borrow history
    const totalBorrows = user.borrowRequests.length;
    const onTimeReturns = user.borrowRequests.filter(
      (req) =>
        req.status === 'RETURNED' &&
        req.actualReturnDate &&
        req.actualReturnDate <= req.requestedReturnDate
    ).length;

    if (totalBorrows > 0) {
      const onTimeRate = onTimeReturns / totalBorrows;
      score += (onTimeRate - 0.8) * 200; // Bonus/penalty based on 80% benchmark
    }

    // Factor in lending history
    const totalLends = user.lentItems.length;
    const positiveLends = user.lentItems.filter(
      (req) => req.status === 'RETURNED'
    ).length;

    if (totalLends > 0) {
      const positiveRate = positiveLends / totalLends;
      score += positiveRate * 100; // Bonus for positive lending experiences
    }

    // Penalties for reports and warnings
    score -= user.reportedByUser.length * 50;
    score -= user.warningCount * 100;
    score -= user.suspensionCount * 200;

    // Bonus for reporting bad behavior (but cap it)
    const reportingBonus = Math.min(user.reportsCreated.length * 10, 100);
    score += reportingBonus;

    // Ensure score stays within reasonable bounds
    return Math.max(0, Math.min(2000, Math.round(score)));
  }

  public async updateUserTrustScore(userId: string): Promise<number> {
    const newScore = await this.calculateTrustScore(userId);

    await db.user.update({
      where: { id: userId },
      data: { trustScore: newScore },
    });

    return newScore;
  }

  public async autoSuspendLowTrustUsers(): Promise<void> {
    const lowTrustUsers = await db.user.findMany({
      where: {
        trustScore: {
          lt: 300,
        },
        isSuspended: false,
      },
    });

    const systemAdminId = await this.getSystemAdminId();

    for (const user of lowTrustUsers) {
      const suspensionEnds = new Date();
      suspensionEnds.setDate(suspensionEnds.getDate() + 30); // 30-day suspension

      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: {
            isSuspended: true,
            suspensionEndsAt: suspensionEnds,
            suspensionCount: { increment: 1 },
            lastSuspensionAt: new Date(),
          },
        }),
        db.adminAction.create({
          data: {
            type: AdminActionType.USER_SUSPENSION,
            description: `Automatic suspension due to low trust score (${user.trustScore})`,
            reason: 'Automated safety measure',
            adminId: systemAdminId,
            targetUserId: user.id,
            metadata: {
              trustScore: user.trustScore,
              suspensionDays: 30,
              automated: true,
            },
          },
        }),
      ]);
    }
  }

  public getRules(): FlaggingRule[] {
    return this.rules;
  }

  public toggleRule(ruleId: string, isActive: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.isActive = isActive;
    }
  }
}

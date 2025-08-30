// Trust safety system - temporarily disabled until schema is updated
// This file contains stubs to prevent TypeScript compilation errors

// Trust safety types - temporarily using string literals until schema is updated
type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type UserReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'INAPPROPRIATE_CONTENT'
  | 'FRAUD'
  | 'OTHER';

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
    // Stub implementation - rules disabled until schema is ready
    this.rules = [];
  }

  // Stub methods to prevent compilation errors
  async calculateTrustScore(_userId: string): Promise<number> {
    return 100; // Default trust score
  }

  async updateUserTrustScore(
    _userId: string,
    _newScore: number
  ): Promise<void> {
    // Stub - no-op until schema is ready
  }

  async runAutomatedFlagging(): Promise<void> {
    // Stub - no-op until schema is ready
  }

  async autoSuspendLowTrustUsers(): Promise<string[]> {
    return []; // No users suspended
  }

  getRules(): FlaggingRule[] {
    return this.rules;
  }

  async toggleRule(_ruleId: string): Promise<boolean> {
    return false; // Rule not found/not toggled
  }

  async createReport(
    _reporterId: string,
    _reportedId: string,
    _reason: UserReportReason,
    _description?: string
  ): Promise<string | null> {
    return null; // Report not created until schema is ready
  }

  // Private stub methods
  private async checkMultipleOverdueItems(): Promise<string[]> {
    return [];
  }

  private async checkSuspiciousBorrowingPattern(): Promise<string[]> {
    return [];
  }

  private async checkMultipleReports(): Promise<string[]> {
    return [];
  }
}

export default TrustSafetyService;

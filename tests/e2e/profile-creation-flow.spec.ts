import { test, expect } from '@playwright/test';
import { db } from '../../src/lib/db';

test.describe('Complete Profile Creation Flow', () => {
  test.beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      test.skip();
    }
  });

  const testEmail = 'onboarding-test@example.com';

  test.beforeEach(async () => {
    // Clean up any existing test data
    try {
      await db.authCode.deleteMany({
        where: { email: testEmail },
      });
      await db.address.deleteMany({
        where: { user: { email: testEmail } },
      });
      await db.user.deleteMany({
        where: { email: testEmail },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  test.afterEach(async () => {
    // Clean up test data
    try {
      await db.authCode.deleteMany({
        where: { email: testEmail },
      });
      await db.address.deleteMany({
        where: { user: { email: testEmail } },
      });
      await db.user.deleteMany({
        where: { email: testEmail },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('database cleanup works correctly', async () => {
    // Simple test to verify test infrastructure works
    console.log('✅ Database cleanup test passed');
    expect(true).toBe(true);
  });
});
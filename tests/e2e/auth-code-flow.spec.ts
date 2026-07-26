import { test, expect, type Page } from '@playwright/test';

import { db } from '../../src/lib/db';

// The code step now uses CodeCells (six single-digit inputs) instead of one
// field, and auto-submits when the sixth digit lands — so fill the cells by
// their aria-labels and let the component submit itself.
async function enterCode(page: Page, code: string) {
  for (let i = 0; i < 6; i++) {
    await page.getByLabel(`Digit ${i + 1} of 6`).fill(code[i]!);
  }
}

test.describe('Auth Code Flow', () => {
  test.beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      test.skip();
    }
  });
  const testEmail = 'test-user@example.com';

  test.beforeEach(async () => {
    // Clean up any existing test data
    try {
      await db.authCode.deleteMany({
        where: { email: testEmail },
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
      await db.user.deleteMany({
        where: { email: testEmail },
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('new user should be redirected to profile creation after auth code verification', async ({
    page,
  }) => {
    // Navigate to sign-in page
    await page.goto('/auth/signin');
    await expect(page).toHaveTitle(/StuffLibrary/);

    // Fill in email and submit
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Should now be on the code entry step
    await expect(page.locator('text=Enter your code')).toBeVisible();

    // Get the auth code from the database (since we can't read emails)
    const authCodeRecord = await db.authCode.findUnique({
      where: { email: testEmail },
    });

    expect(authCodeRecord).toBeTruthy();
    expect(authCodeRecord!.code).toHaveLength(6);

    console.log('Generated auth code:', authCodeRecord!.code);

    // Fill in the code — CodeCells auto-submits when the sixth digit lands.
    await enterCode(page, authCodeRecord!.code);

    // Wait for redirect and check if we're on profile creation page
    await page.waitForURL('/profile/create', { timeout: 10000 });
    await expect(page).toHaveURL('/profile/create');

    // Verify we're actually signed in by checking session
    const sessionResponse = await page.request.get('/api/auth/session');
    const session = await sessionResponse.json();
    expect(session.user).toBeTruthy();
    expect(session.user.email).toBe(testEmail);

    console.log('Session after auth:', session);
  });

  test.skip('existing user with completed profile should go to dashboard', async ({
    page,
  }) => {
    // Pre-create a user with completed profile
    await db.user.create({
      data: {
        email: testEmail,
        emailVerified: new Date(),
        profileCompleted: true,
        name: 'Test User',
      },
    });

    // Navigate to sign-in page
    await page.goto('/auth/signin');

    // Fill in email and submit
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Should now be on the code entry step
    await expect(page.locator('text=Enter your code')).toBeVisible();

    // Get the auth code from the database
    const authCodeRecord = await db.authCode.findUnique({
      where: { email: testEmail },
    });

    expect(authCodeRecord).toBeTruthy();
    console.log('Generated auth code for existing user:', authCodeRecord!.code);

    // Fill in the code — CodeCells auto-submits on the sixth digit.
    await enterCode(page, authCodeRecord!.code);

    // Should be redirected to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/dashboard');
  });

  test('invalid code should show error', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/auth/signin');

    // Fill in email and submit
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]');

    // Should now be on the code entry step
    await expect(page.locator('text=Enter your code')).toBeVisible();

    // Fill in an invalid code — CodeCells auto-submits on the sixth digit.
    await enterCode(page, '123456');

    // Should show error message
    await expect(page.locator('text=Invalid code')).toBeVisible();

    // Should still be on signin page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

import { test, expect } from '@playwright/test';
import { db } from '../src/lib/db';

const TEST_EMAIL = 'session@playwright.test';

test.describe('Session Management', () => {
  test.beforeEach(async () => {
    // Clean up test data
    try {
      await db.authCode.deleteMany({ where: { email: TEST_EMAIL } });
      await db.session.deleteMany({
        where: { user: { email: TEST_EMAIL } },
      });
      await db.user.deleteMany({ where: { email: TEST_EMAIL } });
    } catch {
      // Ignore cleanup errors
    }
  });

  test.afterEach(async () => {
    // Clean up test data
    try {
      await db.authCode.deleteMany({ where: { email: TEST_EMAIL } });
      await db.session.deleteMany({
        where: { user: { email: TEST_EMAIL } },
      });
      await db.user.deleteMany({ where: { email: TEST_EMAIL } });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Complete auth flow
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Get and enter auth code
    await expect(page.getByText('Enter your code')).toBeVisible();
    await page.waitForTimeout(1000);
    
    const authCode = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    await page.fill('input[name="code"]', authCode!.code);
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Should be on profile create page
    await expect(page).toHaveURL(/\/profile\/create/);
    
    // Reload the page
    await page.reload();
    
    // Should still be authenticated and on profile create page
    await expect(page).toHaveURL(/\/profile\/create/);
    await expect(page.getByText('Loading your profile...')).not.toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated users to signin', async ({ page }) => {
    // Try to access protected page without authentication
    await page.goto('/profile/create');
    
    // Should redirect to signin
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should create proper session in database', async ({ page }) => {
    // Complete auth flow
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    await expect(page.getByText('Enter your code')).toBeVisible();
    await page.waitForTimeout(1000);
    
    const authCode = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    await page.fill('input[name="code"]', authCode!.code);
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Wait for redirect
    await expect(page).toHaveURL(/\/profile\/create/);
    
    // Check that session exists in database
    const user = await db.user.findUnique({
      where: { email: TEST_EMAIL },
      include: { sessions: true },
    });
    
    expect(user).toBeTruthy();
    expect(user!.sessions.length).toBeGreaterThan(0);
    
    const session = user!.sessions[0];
    expect(session).toBeDefined();
    expect(session?.sessionToken).toBeTruthy();
    expect(session?.expires.getTime()).toBeGreaterThan(Date.now());
  });

  test('should handle session expiration gracefully', async ({ page }) => {
    // Complete auth flow
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    await expect(page.getByText('Enter your code')).toBeVisible();
    await page.waitForTimeout(1000);
    
    const authCode = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    await page.fill('input[name="code"]', authCode!.code);
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    await expect(page).toHaveURL(/\/profile\/create/);
    
    // Manually expire the session in database
    const user = await db.user.findUnique({
      where: { email: TEST_EMAIL },
      include: { sessions: true },
    });
    
    if (user && user.sessions.length > 0 && user.sessions[0]?.id) {
      await db.session.update({
        where: { id: user.sessions[0].id },
        data: { expires: new Date(Date.now() - 1000) }, // Expired 1 second ago
      });
    }
    
    // Navigate to a protected page
    await page.goto('/profile/create');
    
    // Should redirect to signin due to expired session
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should allow multiple sessions for same user', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Complete auth flow in first browser context
    await page1.goto('/auth/signin');
    await page1.fill('input[name="email"]', TEST_EMAIL);
    await page1.click('button[type="submit"]:has-text("Continue")');
    
    await expect(page1.getByText('Enter your code')).toBeVisible();
    await page1.waitForTimeout(1000);
    
    const authCode1 = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    await page1.fill('input[name="code"]', authCode1!.code);
    await page1.click('button[type="submit"]:has-text("Sign in")');
    
    await expect(page1).toHaveURL(/\/profile\/create/);
    
    // Complete auth flow in second browser context
    await page2.goto('/auth/signin');
    await page2.fill('input[name="email"]', TEST_EMAIL);
    await page2.click('button[type="submit"]:has-text("Continue")');
    
    await expect(page2.getByText('Enter your code')).toBeVisible();
    await page2.waitForTimeout(1000);
    
    const authCode2 = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    await page2.fill('input[name="code"]', authCode2!.code);
    await page2.click('button[type="submit"]:has-text("Sign in")');
    
    await expect(page2).toHaveURL(/\/profile\/create/);
    
    // Both sessions should be valid
    const user = await db.user.findUnique({
      where: { email: TEST_EMAIL },
      include: { sessions: true },
    });
    
    expect(user!.sessions.length).toBe(2);
    
    // Both pages should still be authenticated
    await page1.reload();
    await expect(page1).toHaveURL(/\/profile\/create/);
    
    await page2.reload();
    await expect(page2).toHaveURL(/\/profile\/create/);
    
    await context1.close();
    await context2.close();
  });

  test('should clean up auth codes after successful authentication', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    await expect(page.getByText('Enter your code')).toBeVisible();
    await page.waitForTimeout(1000);
    
    // Verify auth code exists
    let authCode = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(authCode).toBeTruthy();
    
    // Complete authentication
    await page.fill('input[name="code"]', authCode!.code);
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    await expect(page).toHaveURL(/\/profile\/create/);
    
    // Verify auth code is cleaned up
    authCode = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(authCode).toBeNull();
  });

  test('should handle concurrent authentication attempts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Start auth flow in both contexts simultaneously
    await Promise.all([
      page1.goto('/auth/signin'),
      page2.goto('/auth/signin'),
    ]);
    
    await Promise.all([
      page1.fill('input[name="email"]', TEST_EMAIL),
      page2.fill('input[name="email"]', TEST_EMAIL),
    ]);
    
    // Second request should use the same auth code (upsert behavior)
    await Promise.all([
      page1.click('button[type="submit"]:has-text("Continue")'),
      page2.click('button[type="submit"]:has-text("Continue")'),
    ]);
    
    await Promise.all([
      expect(page1.getByText('Enter your code')).toBeVisible(),
      expect(page2.getByText('Enter your code')).toBeVisible(),
    ]);
    
    await page1.waitForTimeout(1000);
    
    // Get the auth code
    const authCode = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    // Both should be able to use the same code, but only first one succeeds
    await Promise.all([
      page1.fill('input[name="code"]', authCode!.code),
      page2.fill('input[name="code"]', authCode!.code),
    ]);
    
    await page1.click('button[type="submit"]:has-text("Sign in")');
    await page2.click('button[type="submit"]:has-text("Sign in")');
    
    // First one should succeed
    await expect(page1).toHaveURL(/\/profile\/create/);
    
    // Second one should get an error (code already used)
    await expect(page2.getByText('Invalid code. Please try again.')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });
});
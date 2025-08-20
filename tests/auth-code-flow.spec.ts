import { test, expect } from '@playwright/test';
import { db } from '../src/lib/db';

// Test email that we can control
const TEST_EMAIL = 'test@playwright.test';

test.describe('Auth Code Flow', () => {
  test.beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      test.skip('DATABASE_URL not available - skipping database-dependent tests');
    }
  });
  test.beforeEach(async () => {
    // Clean up any existing test data
    try {
      await db.authCode.deleteMany({
        where: { email: TEST_EMAIL },
      });
      await db.user.deleteMany({
        where: { email: TEST_EMAIL },
      });
    } catch (error) {
      // Ignore errors if records don't exist
    }
  });

  test.afterEach(async () => {
    // Clean up test data
    await cleanupTestData(TEST_EMAIL);
  });

  test('should complete full auth code flow successfully', async ({ page }) => {
    // Step 1: Navigate to sign in page
    await page.goto('/auth/signin');
    
    // Verify we're on the sign in page
    await expect(page.getByText('Enter your email to sign in')).toBeVisible();
    
    // Step 2: Enter email and submit
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Wait for the code entry step
    await expect(page.getByText('Enter your code')).toBeVisible();
    await expect(page.getByText(`We've sent a 6-digit code to ${TEST_EMAIL}`)).toBeVisible();
    
    // Step 3: Get the auth code from database (simulating email receipt)
    // In a real test, we might use an email testing service
    await page.waitForTimeout(1000); // Give time for code to be created
    
    const authCodeRecord = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    
    expect(authCodeRecord).toBeTruthy();
    expect(authCodeRecord?.code).toMatch(/^\d{6}$/);
    
    // Step 4: Enter the auth code
    await page.fill('input[name="code"]', authCodeRecord!.code);
    
    // Step 5: Submit auth code
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Step 6: Should redirect to profile creation page
    await expect(page).toHaveURL(/\/profile\/create/);
    
    // Verify user is authenticated
    const user = await db.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(user).toBeTruthy();
    expect(user?.emailVerified).toBeTruthy();
    
    // Verify auth code was cleaned up
    const remainingAuthCode = await db.authCode.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(remainingAuthCode).toBeNull();
  });

  test('should show error for invalid auth code', async ({ page }) => {
    // Navigate and enter email
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Wait for code entry step
    await expect(page.getByText('Enter your code')).toBeVisible();
    
    // Enter invalid code
    await page.fill('input[name="code"]', '999999');
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Should show error message
    await expect(page.getByText('Invalid code. Please try again.')).toBeVisible();
    
    // Should still be on the code entry step
    await expect(page.getByText('Enter your code')).toBeVisible();
  });

  test('should show error for expired auth code', async ({ page }) => {
    // Create an expired auth code directly in database
    const expiredDate = new Date();
    expiredDate.setMinutes(expiredDate.getMinutes() - 15); // 15 minutes ago
    
    await db.authCode.create({
      data: {
        email: TEST_EMAIL,
        code: '123456',
        expiresAt: expiredDate,
      },
    });
    
    // Navigate to signin and enter email
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Enter the expired code
    await expect(page.getByText('Enter your code')).toBeVisible();
    await page.fill('input[name="code"]', '123456');
    await page.click('button[type="submit"]:has-text("Sign in")');
    
    // Should show error for expired code
    await expect(page.getByText('Invalid code. Please try again.')).toBeVisible();
  });

  test('should allow going back to email step', async ({ page }) => {
    // Navigate and enter email
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Wait for code entry step
    await expect(page.getByText('Enter your code')).toBeVisible();
    
    // Click back to email
    await page.click('button:has-text("Back to email")');
    
    // Should be back on email step
    await expect(page.getByText('Enter your email to sign in')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue(TEST_EMAIL);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('/api/auth/send-code', route => 
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) })
    );
    
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Should show error message
    await expect(page.getByText('Server error')).toBeVisible();
    
    // Should still be on email step
    await expect(page.getByText('Enter your email to sign in')).toBeVisible();
  });

  test('should validate email format on client side', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Try to submit invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // HTML5 validation should prevent submission
    // Check that we're still on the email step
    await expect(page.getByText('Enter your email to sign in')).toBeVisible();
    
    // Try with valid email format
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    
    // Should proceed to code step
    await expect(page.getByText('Enter your code')).toBeVisible();
  });

  test('should disable submit button until code is 6 digits', async ({ page }) => {
    // Navigate to code entry step
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]:has-text("Continue")');
    await expect(page.getByText('Enter your code')).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]:has-text("Sign in")');
    
    // Button should be disabled initially
    await expect(submitButton).toBeDisabled();
    
    // Enter partial code
    await page.fill('input[name="code"]', '123');
    await expect(submitButton).toBeDisabled();
    
    // Enter full 6-digit code
    await page.fill('input[name="code"]', '123456');
    await expect(submitButton).not.toBeDisabled();
    
    // Remove a digit
    await page.fill('input[name="code"]', '12345');
    await expect(submitButton).toBeDisabled();
  });

  test('should show loading states during API calls', async ({ page }) => {
    // Slow down the API response
    await page.route('/api/auth/send-code', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });
    
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_EMAIL);
    
    // Click submit and check loading state
    await page.click('button[type="submit"]:has-text("Continue")');
    await expect(page.getByText('Sending code...')).toBeVisible();
    
    // Wait for completion
    await expect(page.getByText('Enter your code')).toBeVisible();
  });
});
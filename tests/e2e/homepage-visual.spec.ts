import { test, expect } from '@playwright/test';

test('Homepage visual inspection', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Verify key elements are present
  await expect(page.locator('h1')).toContainText('Borrow, Lend, Belong.');

  // Take a full page screenshot for visual comparison
  await expect(page).toHaveScreenshot('homepage-full.png');
});

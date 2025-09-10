import { test } from '@playwright/test';

test('Homepage visual inspection', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('http://localhost:3002');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Take a full page screenshot for inspection
  await page.screenshot({
    path: 'homepage-screenshot.png',
    fullPage: true,
  });

  // Keep the page open for manual inspection
  await page.waitForTimeout(30000); // Wait 30 seconds
});

import { test, expect } from '@playwright/test';

test.describe('Basic Homepage Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Test page title
    await expect(page).toHaveTitle(/StuffLibrary\.org/);
  });

  test('main heading is visible', async ({ page }) => {
    await page.goto('/');

    // Test main headline exists
    const heading = page.locator('h1', { hasText: /borrow.*lend.*belong/i });
    await expect(heading).toBeVisible();
  });

  test('footer links exist', async ({ page }) => {
    await page.goto('/');

    // Test footer exists
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Test some key footer links
    await expect(footer.getByText('Privacy Policy')).toBeVisible();
    await expect(footer.getByText('Terms of Service')).toBeVisible();
    await expect(footer.getByText(/© \d{4} StuffLibrary/)).toBeVisible();
  });

  test('hero section renders', async ({ page }) => {
    await page.goto('/');

    // Hero content — the vintage library-card redesign (#430)
    await expect(
      page.getByRole('heading', { name: /Borrow, Lend, Belong\./i })
    ).toBeVisible();
    await expect(
      page.getByText(/Your street already owns everything you need/i)
    ).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders the main title', async ({ page }) => {
    await page.goto('/');

    // Test that the main headline is visible
    await expect(
      page.getByRole('heading', { name: /share more,.*buy less/i })
    ).toBeVisible();

    // Test that the wordmark is visible in header
    await expect(
      page.locator('header').getByText('StuffLibrary')
    ).toBeVisible();
  });

  test('displays hero section content', async ({ page }) => {
    await page.goto('/');

    // Test hero subheading
    await expect(
      page.getByText(/A neighborhood platform for safely sharing stuff/i)
    ).toBeVisible();

    // Test "Learn More" button exists in hero section
    await expect(
      page
        .locator('section')
        .first()
        .getByRole('button', { name: /learn more/i })
    ).toBeVisible();

    // Test the tagline
    await expect(
      page.getByText(/free to use, expensive not to/i)
    ).toBeVisible();
  });

  test('shows feature showcase section', async ({ page }) => {
    await page.goto('/');

    // Test section heading
    await expect(
      page.getByRole('heading', { name: /why neighbors love stufflibrary/i })
    ).toBeVisible();

    // Test all four feature cards
    await expect(page.getByText('Build Community')).toBeVisible();
    await expect(page.getByText('Save Money')).toBeVisible();
    await expect(page.getByText('Reduce Waste')).toBeVisible();
    await expect(page.getByText('Trust & Safety')).toBeVisible();
  });

  test('shows how it works section', async ({ page }) => {
    await page.goto('/');

    // Test section heading
    await expect(
      page.getByRole('heading', { name: /how it works/i })
    ).toBeVisible();

    // Test all three steps
    await expect(page.getByText('Find What You Need')).toBeVisible();
    await expect(page.getByText('Connect Safely')).toBeVisible();
    await expect(page.getByText('Share & Return')).toBeVisible();

    // Test step numbers are visible
    await expect(page.getByText('1')).toBeVisible();
    await expect(page.getByText('2')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
  });

  test('shows FAQ section', async ({ page }) => {
    await page.goto('/');

    // Test FAQ heading
    await expect(
      page.getByRole('heading', { name: /frequently asked questions/i })
    ).toBeVisible();

    // Test that at least some FAQ questions are visible
    await expect(
      page.getByText(/how do i know i can trust my neighbors/i)
    ).toBeVisible();
    await expect(
      page.getByText(/what if something gets damaged or lost/i)
    ).toBeVisible();
  });

  test('footer contains required links', async ({ page }) => {
    await page.goto('/');

    // Test footer wordmark
    await expect(
      page.locator('footer').getByText('StuffLibrary')
    ).toBeVisible();

    // Test footer sections exist
    await expect(page.getByText('Product')).toBeVisible();
    await expect(page.getByText('Company')).toBeVisible();
    await expect(page.getByText('Support')).toBeVisible();

    // Test specific footer links
    await expect(
      page.getByRole('link', { name: 'How It Works' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'About Us' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact Us' })).toBeVisible();

    // Test legal links
    await expect(
      page.getByRole('link', { name: 'Privacy Policy' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Terms of Service' })
    ).toBeVisible();

    // Test copyright
    await expect(
      page.getByText(/© \d{4} StuffLibrary\. All rights reserved\./)
    ).toBeVisible();
  });

  test('navigation header works correctly', async ({ page }) => {
    await page.goto('/');

    // Test header navigation - look specifically in header
    await expect(
      page.locator('header').getByRole('button', { name: /coming soon/i })
    ).toBeVisible();
    await expect(
      page.locator('header').getByRole('button', { name: /how it works/i })
    ).toBeVisible();
    await expect(
      page.locator('header').getByRole('button', { name: /about/i })
    ).toBeVisible();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Test that content is still visible on mobile
    await expect(
      page.getByRole('heading', { name: /share more,.*buy less/i })
    ).toBeVisible();
    await expect(
      page.locator('header').getByText('StuffLibrary')
    ).toBeVisible();

    // Test mobile navigation button (should show "Soon" instead of "Coming Soon")
    await expect(
      page.locator('header').getByRole('button', { name: /soon/i })
    ).toBeVisible();
  });

  test('page has correct meta information', async ({ page }) => {
    await page.goto('/');

    // Test page title
    await expect(page).toHaveTitle(/StuffLibrary\.org/);

    // Test meta description exists (basic check)
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute(
      'content',
      /share.*buy less/i
    );
  });
});

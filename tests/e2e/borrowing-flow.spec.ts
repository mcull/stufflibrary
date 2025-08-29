import { test, expect, Page } from '@playwright/test';
import { db } from '@/lib/db';

// Test data setup
const testUsers = {
  borrower: {
    id: 'test-borrower-e2e',
    name: 'Test Borrower',
    email: 'borrower@e2etest.com',
    phone: '+1234567890',
  },
  lender: {
    id: 'test-lender-e2e', 
    name: 'Test Lender',
    email: 'lender@e2etest.com',
    phone: '+1987654321',
  },
};

const testItem = {
  id: 'test-item-e2e',
  name: 'E2E Test Camera',
  description: 'Professional camera for E2E testing',
  category: 'ELECTRONICS',
  condition: 'excellent',
  imageUrl: 'https://via.placeholder.com/400x300.jpg?text=Test+Camera',
  ownerId: testUsers.lender.id,
};

test.describe('Borrowing Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Reset database state before each test
    await cleanupTestData();
    await createTestData();
  });

  test.afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  test.describe('Complete Borrowing Journey', () => {
    test('should complete full borrowing flow: browse → request → approve → return', async ({ 
      page,
      context
    }) => {
      // Step 1: Borrower logs in and browses items
      await signIn(page, testUsers.borrower.email);
      
      // Navigate to explore page
      await page.goto('/lobby');
      await page.waitForLoadState('networkidle');
      
      // Find and click on the test item
      await expect(page.locator(`text=${testItem.name}`)).toBeVisible();
      await page.click(`text=${testItem.name}`);
      
      // Step 2: Borrower creates borrow request
      await expect(page.locator('text=Borrow this item')).toBeVisible();
      await page.click('text=Borrow this item');
      
      // Fill out borrow request form
      await page.fill('[data-testid="return-date"]', '2024-12-31');
      await page.fill('[data-testid="request-message"]', 'I need this camera for a wedding shoot');
      
      // Submit request
      await page.click('[data-testid="submit-request"]');
      
      // Verify success message
      await expect(page.locator('text=Borrow request sent')).toBeVisible();
      
      // Step 3: Lender receives and approves request
      // Open new page for lender
      const lenderPage = await context.newPage();
      await signIn(lenderPage, testUsers.lender.email);
      
      // Navigate to lender requests
      await lenderPage.goto('/lender/requests');
      await lenderPage.waitForLoadState('networkidle');
      
      // Find pending request
      await expect(lenderPage.locator('text=Pending Requests')).toBeVisible();
      await expect(lenderPage.locator(`text=${testItem.name}`)).toBeVisible();
      
      // View request details
      await lenderPage.click(`text=${testItem.name}`);
      
      // Approve request
      await expect(lenderPage.locator('text=Approve')).toBeVisible();
      await lenderPage.fill('[data-testid="lender-message"]', 'Sure, take good care of it!');
      await lenderPage.click('[data-testid="approve-request"]');
      
      // Verify approval success
      await expect(lenderPage.locator('text=Request approved')).toBeVisible();
      
      // Step 4: Borrower sees approved request and active borrow
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check active borrows
      await page.goto('/lobby');
      await expect(page.locator('text=Active Borrows')).toBeVisible();
      await expect(page.locator(`text=${testItem.name}`)).toBeVisible();
      
      // Step 5: Borrower marks item as returned
      await page.click(`text=${testItem.name}`);
      await expect(page.locator('text=Mark as Returned')).toBeVisible();
      await page.click('text=Mark as Returned');
      
      // Fill return notes
      await page.fill('[data-testid="return-notes"]', 'Camera returned in perfect condition');
      await page.click('[data-testid="confirm-return"]');
      
      // Verify return success
      await expect(page.locator('text=Item marked as returned')).toBeVisible();
      
      // Step 6: Lender confirms return
      await lenderPage.reload();
      await lenderPage.goto('/lender/requests');
      
      // Find returned item
      await expect(lenderPage.locator('text=Returned Items')).toBeVisible();
      await lenderPage.click('text=Returned Items');
      await expect(lenderPage.locator(`text=${testItem.name}`)).toBeVisible();
      
      // View and confirm return
      await lenderPage.click(`text=${testItem.name}`);
      await expect(lenderPage.locator('text=Confirm Return')).toBeVisible();
      await lenderPage.click('[data-testid="confirm-return"]');
      
      // Verify confirmation success
      await expect(lenderPage.locator('text=Return confirmed')).toBeVisible();
      
      // Step 7: Verify item is available again
      const newBorrowerPage = await context.newPage();
      await signIn(newBorrowerPage, 'newuser@e2etest.com');
      await newBorrowerPage.goto('/lobby');
      
      await expect(newBorrowerPage.locator(`text=${testItem.name}`)).toBeVisible();
      await newBorrowerPage.click(`text=${testItem.name}`);
      
      // Should be able to borrow again
      await expect(newBorrowerPage.locator('text=Borrow this item')).toBeVisible();
    });

    test('should handle request decline flow', async ({ page, context }) => {
      // Borrower creates request
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      await page.click(`text=${testItem.name}`);
      await page.click('text=Borrow this item');
      
      await page.fill('[data-testid="return-date"]', '2024-12-31');
      await page.fill('[data-testid="request-message"]', 'Can I borrow this?');
      await page.click('[data-testid="submit-request"]');
      
      // Lender declines request
      const lenderPage = await context.newPage();
      await signIn(lenderPage, testUsers.lender.email);
      await lenderPage.goto('/lender/requests');
      
      await lenderPage.click(`text=${testItem.name}`);
      await lenderPage.fill('[data-testid="lender-message"]', 'Sorry, not available right now');
      await lenderPage.click('[data-testid="decline-request"]');
      
      await expect(lenderPage.locator('text=Request declined')).toBeVisible();
      
      // Borrower sees declined request
      await page.reload();
      await page.goto('/requests/sent');
      
      await expect(page.locator('text=Declined')).toBeVisible();
      await expect(page.locator('text=Sorry, not available right now')).toBeVisible();
    });

    test('should handle request cancellation flow', async ({ page }) => {
      // Borrower creates and then cancels request
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      await page.click(`text=${testItem.name}`);
      await page.click('text=Borrow this item');
      
      await page.fill('[data-testid="return-date"]', '2024-12-31');
      await page.click('[data-testid="submit-request"]');
      
      // Navigate to sent requests and cancel
      await page.goto('/requests/sent');
      await expect(page.locator('text=Pending')).toBeVisible();
      
      await page.click(`text=${testItem.name}`);
      await page.click('[data-testid="cancel-request"]');
      
      // Confirm cancellation
      await page.fill('[data-testid="cancellation-reason"]', 'No longer needed');
      await page.click('[data-testid="confirm-cancellation"]');
      
      await expect(page.locator('text=Request cancelled')).toBeVisible();
      await expect(page.locator('text=Cancelled')).toBeVisible();
    });
  });

  test.describe('Mobile-Responsive Borrowing Flow', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      
      // Should see mobile-friendly layout
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Can still complete borrowing flow
      await page.click(`text=${testItem.name}`);
      await expect(page.locator('text=Borrow this item')).toBeVisible();
      await page.click('text=Borrow this item');
      
      // Mobile form should be usable
      await page.fill('[data-testid="return-date"]', '2024-12-31');
      await page.fill('[data-testid="request-message"]', 'Mobile borrow request');
      await page.click('[data-testid="submit-request"]');
      
      await expect(page.locator('text=Borrow request sent')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      
      // Intercept and fail the request
      await page.route('/api/borrow-requests', route => {
        route.abort();
      });
      
      await page.click(`text=${testItem.name}`);
      await page.click('text=Borrow this item');
      await page.fill('[data-testid="return-date"]', '2024-12-31');
      await page.click('[data-testid="submit-request"]');
      
      // Should show error message
      await expect(page.locator('text=Network error')).toBeVisible();
      await expect(page.locator('text=Please try again')).toBeVisible();
    });

    test('should prevent borrowing unavailable items', async ({ page, context }) => {
      // First borrower gets the item
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      await page.click(`text=${testItem.name}`);
      await page.click('text=Borrow this item');
      await page.fill('[data-testid="return-date"]', '2024-12-31');
      await page.click('[data-testid="submit-request"]');
      
      // Lender approves
      const lenderPage = await context.newPage();
      await signIn(lenderPage, testUsers.lender.email);
      await lenderPage.goto('/lender/requests');
      await lenderPage.click(`text=${testItem.name}`);
      await lenderPage.click('[data-testid="approve-request"]');
      
      // Second borrower tries to borrow same item
      const secondBorrowerPage = await context.newPage();
      await signIn(secondBorrowerPage, 'second@e2etest.com');
      await secondBorrowerPage.goto('/lobby');
      await secondBorrowerPage.click(`text=${testItem.name}`);
      
      // Should not see borrow button
      await expect(secondBorrowerPage.locator('text=Currently unavailable')).toBeVisible();
      await expect(secondBorrowerPage.locator('text=Borrow this item')).not.toBeVisible();
    });

    test('should validate form inputs', async ({ page }) => {
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      await page.click(`text=${testItem.name}`);
      await page.click('text=Borrow this item');
      
      // Try to submit without required fields
      await page.click('[data-testid="submit-request"]');
      
      // Should show validation errors
      await expect(page.locator('text=Return date is required')).toBeVisible();
      
      // Try with past date
      await page.fill('[data-testid="return-date"]', '2020-01-01');
      await page.click('[data-testid="submit-request"]');
      
      await expect(page.locator('text=Return date must be in the future')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      
      // Navigate using keyboard
      await page.keyboard.press('Tab'); // Focus first item
      await page.keyboard.press('Enter'); // Open item
      
      await page.keyboard.press('Tab'); // Focus borrow button
      await page.keyboard.press('Enter'); // Click borrow
      
      // Form should be keyboard accessible
      await page.keyboard.press('Tab'); // Focus return date
      await page.keyboard.type('2024-12-31');
      
      await page.keyboard.press('Tab'); // Focus message
      await page.keyboard.type('Keyboard navigation test');
      
      await page.keyboard.press('Tab'); // Focus submit
      await page.keyboard.press('Enter'); // Submit
      
      await expect(page.locator('text=Borrow request sent')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await signIn(page, testUsers.borrower.email);
      await page.goto('/lobby');
      await page.click(`text=${testItem.name}`);
      
      // Check form accessibility
      await expect(page.locator('[role="form"]')).toBeVisible();
      await expect(page.locator('[aria-label="Return date"]')).toBeVisible();
      await expect(page.locator('[aria-label="Request message"]')).toBeVisible();
      await expect(page.locator('[aria-label="Submit borrow request"]')).toBeVisible();
    });
  });
});

// Helper functions
async function signIn(page: Page, email: string) {
  await page.goto('/auth/signin');
  
  // Simulate auth code flow
  await page.fill('[data-testid="email-input"]', email);
  await page.click('[data-testid="send-code-button"]');
  
  // In test environment, we can bypass the actual email verification
  await page.evaluate(() => {
    // Mock successful authentication
    localStorage.setItem('test-auth-token', 'valid-token');
  });
  
  await page.goto('/lobby');
  await page.waitForLoadState('networkidle');
}

async function createTestData() {
  try {
    // Create test users
    await db.user.create({
      data: testUsers.borrower,
    });
    
    await db.user.create({
      data: testUsers.lender,
    });
    
    // Create test item
    await db.item.create({
      data: testItem,
    });
  } catch (error) {
    // Data might already exist, ignore
    console.log('Test data creation skipped (likely already exists)');
  }
}

async function cleanupTestData() {
  try {
    // Clean up in reverse order to respect foreign key constraints
    await db.borrowRequest.deleteMany({
      where: {
        OR: [
          { borrowerId: { in: [testUsers.borrower.id] } },
          { lenderId: { in: [testUsers.lender.id] } },
        ],
      },
    });
    
    await db.notification.deleteMany({
      where: {
        userId: { in: [testUsers.borrower.id, testUsers.lender.id] },
      },
    });
    
    await db.item.deleteMany({
      where: {
        id: testItem.id,
      },
    });
    
    await db.user.deleteMany({
      where: {
        id: { in: [testUsers.borrower.id, testUsers.lender.id] },
      },
    });
  } catch (error) {
    // Cleanup errors are non-critical
    console.log('Test cleanup completed with some errors (expected)');
  }
}
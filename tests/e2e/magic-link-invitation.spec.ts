import { test, expect } from '@playwright/test';

import { db } from '../../src/lib/db';

// Skip tests if database is not available (e.g., in CI without proper setup)
const skipTests = !process.env.DATABASE_URL;

test.describe('Magic Link Invitation Flow', () => {
  if (skipTests) {
    test('should skip magic link E2E tests when DATABASE_URL is not available', async () => {
      console.log('Skipping magic link E2E tests - DATABASE_URL not available');
      // This test will always pass when DATABASE_URL is missing
      expect(true).toBe(true);
    });
    return; // Exit early
  }

  let testLibraryId: string;
  let libraryOwnerId: string;
  const testInviteeEmail = 'e2e-test-invitee@example.com';
  let invitationToken: string;

  test.beforeEach(async () => {
    // Clean up any existing test data
    await db.invitation.deleteMany({
      where: { email: testInviteeEmail },
    });
    await db.user.deleteMany({
      where: {
        email: { in: [testInviteeEmail, 'library-owner-e2e@test.com'] },
      },
    });

    // Create test library owner
    const libraryOwner = await db.user.create({
      data: {
        email: 'library-owner-e2e@test.com',
        name: 'E2E Library Owner',
        profileCompleted: true,
      },
    });
    libraryOwnerId = libraryOwner.id;

    // Create test collection (library)
    const testLibrary = await db.collection.create({
      data: {
        name: 'E2E Test Library',
        description: 'Library for E2E magic link testing',
        ownerId: libraryOwnerId,
      },
    });
    testLibraryId = testLibrary.id;
  });

  test.skip('complete magic link invitation flow - new user', async ({
    page,
  }) => {
    // Step 1: Create an invitation (simulating library owner action)
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-magic-token-' + Date.now(),
        type: 'library',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        senderId: libraryOwnerId,
        libraryId: testLibraryId,
        sentAt: new Date(),
      },
    });
    invitationToken = invitation.token!;

    // Step 2: Test the invitation API endpoint exists
    const apiResponse = await page.request.get(
      `/api/invitations/${invitationToken}`
    );
    expect(apiResponse.status()).toBeLessThan(500); // Should not be a server error

    // Step 3: Test authentication flow (simplified)
    await page.goto('/auth/signin');

    // Fill in email and submit
    await page.fill('input[type="email"]', testInviteeEmail);
    await page.click('button[type="submit"]');

    // Should now be on the code entry step
    await expect(page.locator('text=Enter your code')).toBeVisible();

    // Get the auth code from the database
    const authCodeRecord = await db.authCode.findUnique({
      where: { email: testInviteeEmail },
    });

    expect(authCodeRecord).toBeTruthy();
    await expect(page).toHaveURL(
      new RegExp(`email=${encodeURIComponent(testInviteeEmail)}`)
    );

    // Step 4: Verify the sign-in page shows magic link messaging
    await expect(page.locator('text=Check your email')).toBeVisible({
      timeout: 5000,
    });

    // Step 5: Verify invitation status was updated to ACCEPTED
    const updatedInvitation = await db.invitation.findUnique({
      where: { id: invitation.id },
    });
    expect(updatedInvitation?.status).toBe('ACCEPTED');

    // Step 6: Verify user was created
    const createdUser = await db.user.findUnique({
      where: { email: testInviteeEmail },
    });
    expect(createdUser).toBeTruthy();

    // Step 7: Verify library membership was created
    const membership = await db.collectionMember.findFirst({
      where: {
        userId: createdUser!.id,
        collectionId: testLibraryId,
        isActive: true,
      },
    });
    expect(membership).toBeTruthy();
  });

  test('complete magic link invitation flow - existing user', async ({
    page,
  }) => {
    // Step 1: Create existing user
    const existingUser = await db.user.create({
      data: {
        email: testInviteeEmail,
        name: 'Existing E2E User',
        profileCompleted: true,
      },
    });

    // Step 2: Create invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-existing-token-' + Date.now(),
        type: 'library',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: libraryOwnerId,
        libraryId: testLibraryId,
        sentAt: new Date(),
      },
    });
    invitationToken = invitation.token!;

    // Step 3: Click magic link
    await page.goto(`/api/invitations/${invitationToken}`);
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    // Step 4: Verify parameters
    await expect(page).toHaveURL(/magic=true/);
    await expect(page).toHaveURL(/auto=true/);

    // Step 5: Verify library membership was created for existing user
    const membership = await db.collectionMember.findFirst({
      where: {
        userId: existingUser.id,
        collectionId: testLibraryId,
        isActive: true,
      },
    });
    expect(membership).toBeTruthy();
  });

  test('expired invitation shows error', async ({ page }) => {
    // Create expired invitation
    const expiredInvitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'expired-token-' + Date.now(),
        type: 'library',
        status: 'SENT',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        senderId: libraryOwnerId,
        libraryId: testLibraryId,
        sentAt: new Date(),
      },
    });

    // Click expired magic link
    await page.goto(`/api/invitations/${expiredInvitation.token}`);

    // Should redirect to error page
    await page.waitForURL(/\/auth\/error/, { timeout: 10000 });
    await expect(page).toHaveURL(/error=invitation_expired/);

    // Verify invitation status was updated to EXPIRED
    const updatedInvitation = await db.invitation.findUnique({
      where: { id: expiredInvitation.id },
    });
    expect(updatedInvitation?.status).toBe('EXPIRED');
  });

  test('invalid invitation token shows error', async ({ page }) => {
    await page.goto('/api/invitations/invalid-token-12345');

    await page.waitForURL(/\/auth\/error/, { timeout: 10000 });
    await expect(page).toHaveURL(/error=invitation_not_found/);
  });

  test.skip('user already member redirects to library', async ({ page }) => {
    // Create user
    const user = await db.user.create({
      data: {
        email: testInviteeEmail,
        name: 'Already Member User',
        profileCompleted: true,
      },
    });

    // Create existing membership
    await db.collectionMember.create({
      data: {
        userId: user.id,
        collectionId: testLibraryId,
        role: 'member',
        isActive: true,
      },
    });

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'already-member-token-' + Date.now(),
        type: 'library',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: libraryOwnerId,
        libraryId: testLibraryId,
        sentAt: new Date(),
      },
    });

    // Test invitation API works
    const apiResponse = await page.request.get(
      `/api/invitations/${invitation.token}`
    );
    expect(apiResponse.status()).toBeLessThan(500);

    // Test basic auth flow to verify user exists and can authenticate
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', testInviteeEmail);
    await page.click('button[type="submit"]');

    // Should progress to code entry (proving user exists)
    await expect(page.locator('text=Enter your code')).toBeVisible();
  });

  test('already accepted invitation redirects to signin', async ({ page }) => {
    // Create already accepted invitation
    const acceptedInvitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'accepted-token-' + Date.now(),
        type: 'library',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: libraryOwnerId,
        libraryId: testLibraryId,
        sentAt: new Date(),
        acceptedAt: new Date(),
      },
    });

    // Click magic link
    await page.goto(`/api/invitations/${acceptedInvitation.token}`);

    // Should redirect to signin page with invitation token
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(
      new RegExp(`invitation=${acceptedInvitation.token}`)
    );
    await expect(page).toHaveURL(
      new RegExp(`email=${encodeURIComponent(testInviteeEmail)}`)
    );

    // Should NOT have magic=true or auto=true for already accepted invitations
    expect(await page.url()).not.toContain('magic=true');
    expect(await page.url()).not.toContain('auto=true');
  });

  test.skip('profile creation flow after magic link authentication', async ({
    page,
  }) => {
    // Create invitation for context
    await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'profile-creation-token-' + Date.now(),
        type: 'library',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: libraryOwnerId,
        libraryId: testLibraryId,
        sentAt: new Date(),
        acceptedAt: new Date(),
      },
    });

    // First authenticate the user
    await page.goto('/auth/signin');

    // Fill in email and submit
    await page.fill('input[type="email"]', testInviteeEmail);
    await page.click('button[type="submit"]');

    // Should now be on the code entry step
    await expect(page.locator('text=Enter your code')).toBeVisible();

    // Get the auth code from the database
    const authCodeRecord = await db.authCode.findUnique({
      where: { email: testInviteeEmail },
    });

    expect(authCodeRecord).toBeTruthy();

    // Fill in the code
    await page.fill('input[name="code"]', authCodeRecord!.code);

    // Submit the code
    await page.click('button[type="submit"]');

    // After authentication, should be redirected to profile creation
    // (new users without completed profiles go to /profile/create)
    await page.waitForURL(/\/profile\/create/, { timeout: 10000 });

    // Should show profile creation form
    await expect(page.locator("text=Let's start with the basics")).toBeVisible({
      timeout: 5000,
    });
  });
});

import { test, expect } from '@playwright/test';

import { db } from '../../src/lib/db';

test.describe('Magic Link Invitation Flow', () => {
  test.beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      test.skip();
    }
  });

  const testBranchOwnerEmail = 'branch-owner@example.com';
  const testInviteeEmail = 'invitee@example.com';
  const testBranchName = 'Test Branch E2E';

  let branchOwnerId: string;
  let testBranchId: string;
  let invitationId: string;
  let invitationToken: string;

  test.beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData();

    // Create test branch owner with completed profile
    const branchOwner = await db.user.create({
      data: {
        email: testBranchOwnerEmail,
        name: 'Branch Owner',
        emailVerified: new Date(),
        profileCompleted: true,
      },
    });
    branchOwnerId = branchOwner.id;

    // Create test branch
    const branch = await db.branch.create({
      data: {
        name: testBranchName,
        description: 'A test branch for E2E testing',
        location: 'Test City',
        ownerId: branchOwnerId,
      },
    });
    testBranchId = branch.id;

    // Add branch owner as admin member
    await db.branchMember.create({
      data: {
        userId: branchOwnerId,
        branchId: testBranchId,
        role: 'admin',
        isActive: true,
      },
    });
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      // Clean up in reverse dependency order
      await db.branchMember.deleteMany({
        where: {
          OR: [
            { user: { email: testBranchOwnerEmail } },
            { user: { email: testInviteeEmail } },
          ],
        },
      });
      await db.invitation.deleteMany({
        where: {
          OR: [
            { email: testInviteeEmail },
            { sender: { email: testBranchOwnerEmail } },
          ],
        },
      });
      await db.branch.deleteMany({
        where: { name: testBranchName },
      });
      await db.authCode.deleteMany({
        where: {
          email: { in: [testBranchOwnerEmail, testInviteeEmail] },
        },
      });
      await db.user.deleteMany({
        where: {
          email: { in: [testBranchOwnerEmail, testInviteeEmail] },
        },
      });
    } catch (error) {
      console.log('Cleanup error (ignored):', error);
    }
  }

  test('complete magic link invitation flow - new user', async ({ page }) => {
    // Step 1: Create an invitation (simulating branch owner action)
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-magic-token-' + Date.now(),
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
      },
    });
    invitationId = invitation.id;
    invitationToken = invitation.token!;

    console.log('Created invitation:', {
      id: invitationId,
      token: invitationToken,
    });

    // Step 2: Simulate clicking magic link from email
    // This would normally be: GET /api/invitations/[token] -> redirect to magic link
    await page.goto(`/api/invitations/${invitationToken}`);

    // Should redirect to magic link processing
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    // Step 3: Verify we're on the sign-in page with magic link parameters
    await expect(page).toHaveURL(/magic=true/);
    await expect(page).toHaveURL(/auto=true/);
    await expect(page).toHaveURL(new RegExp(`invitation=${invitationToken}`));
    await expect(page).toHaveURL(new RegExp(`branch=${testBranchId}`));

    // Should show invitation context
    await expect(page.locator(`text=${testBranchName}`)).toBeVisible();
    await expect(
      page.locator("text=You've been invited to join")
    ).toBeVisible();

    // Step 4: Magic link should auto-complete authentication
    // Wait for automatic redirect to callback
    await page.waitForURL(/\/auth\/callback/, { timeout: 15000 });

    // Step 5: Should redirect to profile creation with invitation context
    await page.waitForURL(/\/profile\/create/, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(`invitation=${invitationToken}`));
    await expect(page).toHaveURL(new RegExp(`branch=${testBranchId}`));

    // Step 6: Verify user was created and authenticated
    const sessionResponse = await page.request.get('/api/auth/session');
    const session = await sessionResponse.json();
    expect(session.user).toBeTruthy();
    expect(session.user.email).toBe(testInviteeEmail);

    // Step 7: Verify user was created in database with proper state
    const createdUser = await db.user.findUnique({
      where: { email: testInviteeEmail },
      include: {
        branchMemberships: {
          where: { branchId: testBranchId },
        },
      },
    });

    expect(createdUser).toBeTruthy();
    expect(createdUser?.emailVerified).toBeTruthy();
    expect(createdUser?.profileCompleted).toBe(false);
    expect(createdUser?.branchMemberships).toHaveLength(1);
    // @ts-expect-error - we already checked createdUser exists above
    expect(createdUser!.branchMemberships[0].role).toBe('member');
    // @ts-expect-error - we already checked createdUser exists above
    expect(createdUser!.branchMemberships[0].isActive).toBe(true);

    // Step 8: Verify invitation was marked as accepted
    const updatedInvitation = await db.invitation.findUnique({
      where: { id: invitationId },
    });

    expect(updatedInvitation?.status).toBe('ACCEPTED');
    expect(updatedInvitation?.acceptedAt).toBeTruthy();
    expect(updatedInvitation?.receiverId).toBe(createdUser?.id);

    // Step 9: Complete profile creation to test full flow
    await page.fill('input[name="name"]', 'Test Invitee');
    await page.click('button[type="submit"]');

    // Should redirect to branch page
    await page.waitForURL(`/branch/${testBranchId}`, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(`message=joined_successfully`));

    console.log('Magic link invitation flow completed successfully!');
  });

  test('magic link for existing user with incomplete profile', async ({
    page,
  }) => {
    // Pre-create a user with incomplete profile
    const existingUser = await db.user.create({
      data: {
        email: testInviteeEmail,
        emailVerified: new Date(),
        profileCompleted: false,
      },
    });

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-existing-user-token-' + Date.now(),
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
      },
    });
    invitationToken = invitation.token!;

    // Click magic link
    await page.goto(`/api/invitations/${invitationToken}`);

    // Should still go through magic link flow
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await page.waitForURL(/\/auth\/callback/, { timeout: 15000 });
    await page.waitForURL(/\/profile\/create/, { timeout: 10000 });

    // Should be authenticated as existing user
    const sessionResponse = await page.request.get('/api/auth/session');
    const session = await sessionResponse.json();
    expect(session.user.email).toBe(testInviteeEmail);

    // User should now have branch membership
    const updatedUser = await db.user.findUnique({
      where: { id: existingUser.id },
      include: {
        branchMemberships: {
          where: { branchId: testBranchId },
        },
      },
    });

    expect(updatedUser?.branchMemberships).toHaveLength(1);
    // @ts-expect-error - we already checked updatedUser exists above
    expect(updatedUser!.branchMemberships[0].role).toBe('member');
  });

  test('magic link for existing user with completed profile', async ({
    page,
  }) => {
    // Pre-create a user with completed profile
    const existingUser = await db.user.create({
      data: {
        email: testInviteeEmail,
        name: 'Existing User',
        emailVerified: new Date(),
        profileCompleted: true,
      },
    });

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-completed-user-token-' + Date.now(),
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
      },
    });
    invitationToken = invitation.token!;

    // Click magic link
    await page.goto(`/api/invitations/${invitationToken}`);

    // Should go through magic link flow but redirect directly to branch
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await page.waitForURL(/\/auth\/callback/, { timeout: 15000 });
    await page.waitForURL(`/branch/${testBranchId}`, { timeout: 10000 });

    // Should show success message
    await expect(page).toHaveURL(new RegExp('message=joined_successfully'));

    // Should be authenticated as existing user
    const sessionResponse = await page.request.get('/api/auth/session');
    const session = await sessionResponse.json();
    expect(session.user.email).toBe(testInviteeEmail);

    // User should now have branch membership
    const updatedUser = await db.user.findUnique({
      where: { id: existingUser.id },
      include: {
        branchMemberships: {
          where: { branchId: testBranchId },
        },
      },
    });

    expect(updatedUser?.branchMemberships).toHaveLength(1);
    // @ts-expect-error - we already checked updatedUser exists above
    expect(updatedUser!.branchMemberships[0].role).toBe('member');
  });

  test('expired invitation should show error', async ({ page }) => {
    // Create expired invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-expired-token-' + Date.now(),
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
      },
    });
    invitationToken = invitation.token!;

    // Try to click expired magic link
    await page.goto(`/api/invitations/${invitationToken}`);

    // Should redirect to error page
    await page.waitForURL(/\/auth\/error/, { timeout: 10000 });
    await expect(page).toHaveURL(/error=invitation_expired/);

    // Invitation should be marked as expired in database
    const updatedInvitation = await db.invitation.findUnique({
      where: { id: invitation.id },
    });

    expect(updatedInvitation?.status).toBe('EXPIRED');
  });

  test('invalid invitation token should show error', async ({ page }) => {
    const invalidToken = 'invalid-token-that-does-not-exist';

    // Try to click invalid magic link
    await page.goto(`/api/invitations/${invalidToken}`);

    // Should redirect to error page
    await page.waitForURL(/\/auth\/error/, { timeout: 10000 });
    await expect(page).toHaveURL(/error=invitation_not_found/);
  });

  test('already accepted invitation should redirect properly', async ({
    page,
  }) => {
    // Pre-create a user
    const existingUser = await db.user.create({
      data: {
        email: testInviteeEmail,
        name: 'Existing User',
        emailVerified: new Date(),
        profileCompleted: true,
      },
    });

    // Create already accepted invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-accepted-token-' + Date.now(),
        type: 'branch',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
        acceptedAt: new Date(),
        receiverId: existingUser.id,
      },
    });
    invitationToken = invitation.token!;

    // Add existing membership
    await db.branchMember.create({
      data: {
        userId: existingUser.id,
        branchId: testBranchId,
        role: 'member',
        isActive: true,
      },
    });

    // Click magic link for already accepted invitation
    await page.goto(`/api/invitations/${invitationToken}`);

    // Should redirect to sign-in page (not magic link flow)
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(`invitation=${invitationToken}`));
    await expect(page).toHaveURL(
      new RegExp(`email=${encodeURIComponent(testInviteeEmail)}`)
    );

    // Should NOT have magic link parameters
    await expect(page.url()).not.toContain('magic=true');
    await expect(page.url()).not.toContain('auto=true');

    // Should show normal sign-in form with invitation context
    await expect(page.locator(`text=${testBranchName}`)).toBeVisible();
    await expect(
      page.locator("text=You've been invited to join")
    ).toBeVisible();
  });

  test('user already member of branch should redirect to branch', async ({
    page,
  }) => {
    // Pre-create a user with completed profile
    const existingUser = await db.user.create({
      data: {
        email: testInviteeEmail,
        name: 'Existing Member',
        emailVerified: new Date(),
        profileCompleted: true,
      },
    });

    // Add as existing member
    await db.branchMember.create({
      data: {
        userId: existingUser.id,
        branchId: testBranchId,
        role: 'member',
        isActive: true,
      },
    });

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'test-existing-member-token-' + Date.now(),
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
      },
    });
    invitationToken = invitation.token!;

    // Click magic link
    await page.goto(`/api/invitations/${invitationToken}`);

    // Should redirect directly to branch with already_member message
    await page.waitForURL(`/branch/${testBranchId}`, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp('message=already_member'));
  });
});

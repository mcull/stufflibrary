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

  let testBranchId: string;
  let branchOwnerId: string;
  const testInviteeEmail = 'e2e-test-invitee@example.com';
  let invitationToken: string;

  test.beforeEach(async () => {
    // Clean up any existing test data
    await db.invitation.deleteMany({
      where: { email: testInviteeEmail },
    });
    await db.user.deleteMany({
      where: { email: { in: [testInviteeEmail, 'branch-owner-e2e@test.com'] } },
    });

    // Create test branch owner
    const branchOwner = await db.user.create({
      data: {
        email: 'branch-owner-e2e@test.com',
        name: 'E2E Branch Owner',
        profileCompleted: true,
      },
    });
    branchOwnerId = branchOwner.id;

    // Create test branch
    const testBranch = await db.branch.create({
      data: {
        name: 'E2E Test Branch',
        description: 'Branch for E2E magic link testing',
        ownerId: branchOwnerId,
      },
    });
    testBranchId = testBranch.id;
  });

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
    invitationToken = invitation.token;

    // Step 2: Simulate clicking magic link from email
    await page.goto(`/api/invitations/${invitationToken}`);

    // Should redirect to magic link processing
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    // Step 3: Verify magic link parameters are present
    await expect(page).toHaveURL(/magic=true/);
    await expect(page).toHaveURL(/auto=true/);
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

    // Step 7: Verify branch membership was created
    const membership = await db.branchMember.findFirst({
      where: {
        userId: createdUser!.id,
        branchId: testBranchId,
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
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
      },
    });
    invitationToken = invitation.token;

    // Step 3: Click magic link
    await page.goto(`/api/invitations/${invitationToken}`);
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });

    // Step 4: Verify parameters
    await expect(page).toHaveURL(/magic=true/);
    await expect(page).toHaveURL(/auto=true/);

    // Step 5: Verify branch membership was created for existing user
    const membership = await db.branchMember.findFirst({
      where: {
        userId: existingUser.id,
        branchId: testBranchId,
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
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        senderId: branchOwnerId,
        branchId: testBranchId,
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

  test('user already member redirects to branch', async ({ page }) => {
    // Create user
    const user = await db.user.create({
      data: {
        email: testInviteeEmail,
        name: 'Already Member User',
        profileCompleted: true,
      },
    });

    // Create existing membership
    await db.branchMember.create({
      data: {
        userId: user.id,
        branchId: testBranchId,
        role: 'member',
        isActive: true,
      },
    });

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'already-member-token-' + Date.now(),
        type: 'branch',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
      },
    });

    // Click magic link
    await page.goto(`/api/invitations/${invitation.token}`);

    // Should redirect to branch page with already_member message
    await page.waitForURL(new RegExp(`/branch/${testBranchId}`), {
      timeout: 10000,
    });
    await expect(page).toHaveURL(/message=already_member/);
  });

  test('already accepted invitation redirects to signin', async ({ page }) => {
    // Create already accepted invitation
    const acceptedInvitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'accepted-token-' + Date.now(),
        type: 'branch',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
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

  test('profile creation flow after magic link authentication', async ({
    page,
  }) => {
    // This test would require actual authentication which is complex in E2E tests
    // For now, we'll test the profile creation page directly with invitation context

    // Create invitation for context
    const invitation = await db.invitation.create({
      data: {
        email: testInviteeEmail,
        token: 'profile-creation-token-' + Date.now(),
        type: 'branch',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: branchOwnerId,
        branchId: testBranchId,
        sentAt: new Date(),
        acceptedAt: new Date(),
      },
    });

    // Navigate directly to profile creation with invitation context
    await page.goto(
      `/profile/create?invitation=${invitation.token}&branch=${testBranchId}`
    );

    // Should show profile creation form
    await expect(page.locator('text=Tell us about yourself')).toBeVisible({
      timeout: 5000,
    });

    // Should show branch context (invitation messaging)
    await expect(page.locator("text=You've been invited")).toBeVisible({
      timeout: 5000,
    });
  });
});

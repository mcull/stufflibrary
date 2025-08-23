import { NextRequest } from 'next/server';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

// Skip all tests if database environment variables are not available (e.g., in CI)
const skipTests = !process.env.DATABASE_URL || !process.env.NEXTAUTH_SECRET;

if (skipTests) {
  describe('Magic Link API Routes', () => {
    it('should skip database tests when environment variables are missing', () => {
      console.log(
        'Skipping magic link API tests - DATABASE_URL or NEXTAUTH_SECRET not available'
      );
      expect(true).toBe(true); // Simple passing test
    });
  });
} else {
  describe('Magic Link API Routes', () => {
    let magicLinkHandler: any;
    let invitationHandler: any;
    let db: any;

    const testBranchOwnerEmail = 'test-owner@example.com';
    const testInviteeEmail = 'test-invitee@example.com';
    const testBranchName = 'Test Branch Unit';

    let branchOwnerId: string;
    let testBranchId: string;

    beforeAll(async () => {
      // Import modules dynamically to avoid environment validation issues
      const magicLinkModule = await import(
        '../../app/api/auth/magic-link/route'
      );
      const invitationModule = await import(
        '../../app/api/invitations/[token]/route'
      );
      const dbModule = await import('../db');

      magicLinkHandler = magicLinkModule.GET;
      invitationHandler = invitationModule.GET;
      db = dbModule.db;
    });

    beforeEach(async () => {
      // Clean up any existing test data
      await cleanupTestData();

      // Create test branch owner
      const branchOwner = await db.user.create({
        data: {
          email: testBranchOwnerEmail,
          name: 'Test Owner',
          emailVerified: new Date(),
          profileCompleted: true,
        },
      });
      branchOwnerId = branchOwner.id;

      // Create test branch
      const branch = await db.branch.create({
        data: {
          name: testBranchName,
          description: 'A test branch for unit testing',
          location: 'Test City',
          ownerId: branchOwnerId,
        },
      });
      testBranchId = branch.id;
    });

    afterEach(async () => {
      await cleanupTestData();
    });

    async function cleanupTestData() {
      try {
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
      } catch {
        // Ignore cleanup errors
      }
    }

    describe('Invitation Route (/api/invitations/[token])', () => {
      it('should redirect to magic link for valid PENDING invitation', async () => {
        // Create test invitation
        const invitation = await db.invitation.create({
          data: {
            email: testInviteeEmail,
            token: 'test-token-pending',
            type: 'branch',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/invitations/${invitation.token}`
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: invitation.token! }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          `/api/auth/magic-link?token=${invitation.token}`
        );
      });

      it('should redirect to magic link for valid SENT invitation', async () => {
        // Create test invitation
        const invitation = await db.invitation.create({
          data: {
            email: testInviteeEmail,
            token: 'test-token-sent',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/invitations/${invitation.token}`
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: invitation.token! }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          `/api/auth/magic-link?token=${invitation.token}`
        );
      });

      it('should redirect to sign-in for ACCEPTED invitation', async () => {
        // Create already accepted invitation
        const invitation = await db.invitation.create({
          data: {
            email: testInviteeEmail,
            token: 'test-token-accepted',
            type: 'branch',
            status: 'ACCEPTED',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
            acceptedAt: new Date(),
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/invitations/${invitation.token}`
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: invitation.token! }),
        });

        expect(response.status).toBe(307);
        const location = response.headers.get('Location');
        expect(location).toContain('/auth/signin');
        expect(location).toContain(`invitation=${invitation.token}`);
        expect(location).toContain(
          `email=${encodeURIComponent(testInviteeEmail)}`
        );
      });

      it('should redirect to error for expired invitation', async () => {
        // Create expired invitation
        const invitation = await db.invitation.create({
          data: {
            email: testInviteeEmail,
            token: 'test-token-expired',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/invitations/${invitation.token}`
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: invitation.token! }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          '/auth/error?error=invitation_expired'
        );

        // Check that invitation was marked as expired
        const updatedInvitation = await db.invitation.findUnique({
          where: { id: invitation.id },
        });
        expect(updatedInvitation?.status).toBe('EXPIRED');
      });

      it('should redirect to error for non-existent invitation', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/invitations/non-existent-token'
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: 'non-existent-token' }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          '/auth/error?error=invitation_not_found'
        );
      });

      it('should redirect to branch for user already member', async () => {
        // Create existing user and add as branch member
        const existingUser = await db.user.create({
          data: {
            email: testInviteeEmail,
            emailVerified: new Date(),
            profileCompleted: true,
          },
        });

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
            token: 'test-token-existing-member',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/invitations/${invitation.token}`
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: invitation.token! }),
        });

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          `/branch/${testBranchId}?message=already_member`
        );
      });
    });

    describe('Magic Link Route (/api/auth/magic-link)', () => {
      let testInvitation: { id: string; token: string | null };

      beforeEach(async () => {
        // Create test invitation for magic link tests
        testInvitation = await db.invitation.create({
          data: {
            email: testInviteeEmail,
            token: 'test-magic-token',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });
      });

      it('should create new user and redirect to sign-in with magic params', async () => {
        const request = new NextRequest(
          `http://localhost:3000/api/auth/magic-link?token=${testInvitation.token!}`
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(307);

        const location = response.headers.get('Location');
        expect(location).toContain('/auth/signin');
        expect(location).toContain('magic=true');
        expect(location).toContain('auto=true');
        expect(location).toContain(`invitation=${testInvitation.token!}`);
        expect(location).toContain(`branch=${testBranchId}`);
        expect(location).toContain(
          `email=${encodeURIComponent(testInviteeEmail)}`
        );

        // Check user was created
        const createdUser = await db.user.findUnique({
          where: { email: testInviteeEmail },
        });

        expect(createdUser).toBeTruthy();
        expect(createdUser!.emailVerified).toBeTruthy();
        expect(createdUser!.profileCompleted).toBe(false);

        // Check branch membership was created
        const membership = await db.branchMember.findFirst({
          where: {
            userId: createdUser!.id,
            branchId: testBranchId,
          },
        });

        expect(membership).toBeTruthy();
        expect(membership!.role).toBe('member');
        expect(membership!.isActive).toBe(true);

        // Check invitation was marked as accepted
        const updatedInvitation = await db.invitation.findUnique({
          where: { id: testInvitation.id },
        });

        expect(updatedInvitation!.status).toBe('ACCEPTED');
        expect(updatedInvitation!.acceptedAt).toBeTruthy();
        expect(updatedInvitation!.receiverId).toBe(createdUser!.id);

        // Check auth code was created
        const authCode = await db.authCode.findUnique({
          where: { email: testInviteeEmail },
        });

        expect(authCode).toBeTruthy();
        expect(authCode!.code).toHaveLength(6);
      });

      it('should handle existing user with incomplete profile', async () => {
        // Create existing user
        const existingUser = await db.user.create({
          data: {
            email: testInviteeEmail,
            emailVerified: null,
            profileCompleted: false,
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/auth/magic-link?token=${testInvitation.token!}`
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(307);

        // Check user was updated
        const updatedUser = await db.user.findUnique({
          where: { id: existingUser.id },
        });

        expect(updatedUser!.emailVerified).toBeTruthy();

        // Check branch membership was created
        const membership = await db.branchMember.findFirst({
          where: {
            userId: existingUser.id,
            branchId: testBranchId,
          },
        });

        expect(membership).toBeTruthy();
        expect(membership!.role).toBe('member');
      });

      it('should handle existing user already member of branch', async () => {
        // Create existing user and membership
        const existingUser = await db.user.create({
          data: {
            email: testInviteeEmail,
            emailVerified: new Date(),
            profileCompleted: true,
          },
        });

        await db.branchMember.create({
          data: {
            userId: existingUser.id,
            branchId: testBranchId,
            role: 'member',
            isActive: true,
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/auth/magic-link?token=${testInvitation.token!}`
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(307);

        // Invitation should still be marked as accepted
        const updatedInvitation = await db.invitation.findUnique({
          where: { id: testInvitation.id },
        });

        expect(updatedInvitation!.status).toBe('ACCEPTED');
      });

      it('should return error for missing token', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/auth/magic-link'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          '/auth/error?error=invalid_invitation'
        );
      });

      it('should return error for non-existent invitation', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/auth/magic-link?token=non-existent'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          '/auth/error?error=invitation_not_found'
        );
      });

      it('should return error for expired invitation', async () => {
        // Create expired invitation with unique token to avoid constraint violation
        const expiredInvitation = await db.invitation.create({
          data: {
            email: 'expired-test@example.com', // Use different email to avoid unique constraint
            token: 'test-expired-magic-token',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new NextRequest(
          `http://localhost:3000/api/auth/magic-link?token=${expiredInvitation.token}`
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(307);
        expect(response.headers.get('Location')).toContain(
          '/auth/error?error=invitation_expired'
        );
      });
    });
  });
}

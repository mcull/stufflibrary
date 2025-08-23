import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

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

    let testBranchId: string;
    let branchOwnerId: string;

    beforeEach(async () => {
      // Clean up test data
      await db.invitation.deleteMany({
        where: {
          email: { contains: 'test-magic-link' },
        },
      });
      await db.user.deleteMany({
        where: {
          email: { contains: 'test-magic-link' },
        },
      });

      // Create test branch owner
      const branchOwner = await db.user.create({
        data: {
          email: 'branch-owner@test.com',
          name: 'Branch Owner',
          profileCompleted: true,
        },
      });
      branchOwnerId = branchOwner.id;

      // Create test branch
      const testBranch = await db.branch.create({
        data: {
          name: 'Test Branch',
          description: 'Test branch for magic link tests',
          ownerId: branchOwnerId,
        },
      });
      testBranchId = testBranch.id;
    });

    describe('Valid magic link flow', () => {
      it('should process valid invitation and create new user', async () => {
        // Create invitation
        const invitation = await db.invitation.create({
          data: {
            email: 'test-magic-link-new@example.com',
            token: 'test-magic-token-valid',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        // Mock request
        const request = new Request(
          'http://localhost/api/auth/magic-link?token=test-magic-token-valid'
        );

        // Call handler
        const response = await magicLinkHandler(request);

        // Should redirect to sign-in with magic link parameters
        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain('/auth/signin');
        expect(location).toContain('magic=true');
        expect(location).toContain('auto=true');
        expect(location).toContain('email=test-magic-link-new%40example.com');

        // Check invitation status updated
        const updatedInvitation = await db.invitation.findUnique({
          where: { id: invitation.id },
        });
        expect(updatedInvitation.status).toBe('ACCEPTED');

        // Check user was created
        const createdUser = await db.user.findUnique({
          where: { email: 'test-magic-link-new@example.com' },
        });
        expect(createdUser).toBeTruthy();
        expect(createdUser.name).toBe('test-magic-link-new@example.com');

        // Check branch membership was created
        const membership = await db.branchMember.findFirst({
          where: {
            userId: createdUser.id,
            branchId: testBranchId,
            isActive: true,
          },
        });
        expect(membership).toBeTruthy();
      });

      it('should handle existing user with magic link', async () => {
        // Create existing user
        const existingUser = await db.user.create({
          data: {
            email: 'test-magic-link-existing@example.com',
            name: 'Existing User',
            profileCompleted: true,
          },
        });

        // Create invitation
        await db.invitation.create({
          data: {
            email: 'test-magic-link-existing@example.com',
            token: 'test-magic-token-existing',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/auth/magic-link?token=test-magic-token-existing'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain('/auth/signin');
        expect(location).toContain('magic=true');
        expect(location).toContain('auto=true');

        // Check branch membership was created for existing user
        const membership = await db.branchMember.findFirst({
          where: {
            userId: existingUser.id,
            branchId: testBranchId,
            isActive: true,
          },
        });
        expect(membership).toBeTruthy();
      });
    });

    describe('Invalid token scenarios', () => {
      it('should handle non-existent token', async () => {
        const request = new Request(
          'http://localhost/api/auth/magic-link?token=non-existent-token'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain('/auth/error?error=invitation_not_found');
      });

      it('should handle missing token', async () => {
        const request = new Request('http://localhost/api/auth/magic-link');
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain('/auth/error?error=invalid_invitation');
      });

      it('should handle expired invitation', async () => {
        // Create expired invitation
        await db.invitation.create({
          data: {
            email: 'test-magic-link-expired@example.com',
            token: 'test-magic-token-expired',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/auth/magic-link?token=test-magic-token-expired'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain('/auth/error?error=invitation_expired');

        // Check invitation status was updated to EXPIRED
        const expiredInvitation = await db.invitation.findFirst({
          where: { token: 'test-magic-token-expired' },
        });
        expect(expiredInvitation?.status).toBe('EXPIRED');
      });

      it('should handle already accepted invitation', async () => {
        // Create already accepted invitation
        await db.invitation.create({
          data: {
            email: 'test-magic-link-accepted@example.com',
            token: 'test-magic-token-accepted',
            type: 'branch',
            status: 'ACCEPTED',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
            acceptedAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/auth/magic-link?token=test-magic-token-accepted'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain(
          '/auth/error?error=invitation_already_accepted'
        );
      });

      it('should handle user already member of branch', async () => {
        // Create user
        const user = await db.user.create({
          data: {
            email: 'test-magic-link-member@example.com',
            name: 'Already Member',
            profileCompleted: true,
          },
        });

        // Create branch membership
        await db.branchMember.create({
          data: {
            userId: user.id,
            branchId: testBranchId,
            role: 'member',
            isActive: true,
          },
        });

        // Create invitation
        await db.invitation.create({
          data: {
            email: 'test-magic-link-member@example.com',
            token: 'test-magic-token-member',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/auth/magic-link?token=test-magic-token-member'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain(
          `/branch/${testBranchId}?message=already_member`
        );
      });
    });

    describe('Invitation route (/api/invitations/[token])', () => {
      it('should redirect valid invitation to magic link endpoint', async () => {
        await db.invitation.create({
          data: {
            email: 'test-invitation-redirect@example.com',
            token: 'test-invitation-token',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/invitations/test-invitation-token'
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: 'test-invitation-token' }),
        });

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain(
          '/api/auth/magic-link?token=test-invitation-token'
        );
      });

      it('should handle invalid invitation token', async () => {
        const request = new Request(
          'http://localhost/api/invitations/invalid-token'
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: 'invalid-token' }),
        });

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain('/auth/error?error=invitation_not_found');
      });

      it('should handle expired invitation in invitation route', async () => {
        await db.invitation.create({
          data: {
            email: 'test-invitation-expired@example.com',
            token: 'test-invitation-expired-token',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() - 1000), // Expired
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/invitations/test-invitation-expired-token'
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: 'test-invitation-expired-token' }),
        });

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain('/auth/error?error=invitation_expired');

        // Check invitation status was updated to EXPIRED
        const expiredInvitation = await db.invitation.findFirst({
          where: { token: 'test-invitation-expired-token' },
        });
        expect(expiredInvitation?.status).toBe('EXPIRED');
      });

      it('should handle already accepted invitation in invitation route', async () => {
        await db.invitation.create({
          data: {
            email: 'test-invitation-accepted@example.com',
            token: 'test-invitation-accepted-token',
            type: 'branch',
            status: 'ACCEPTED',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
            acceptedAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/invitations/test-invitation-accepted-token'
        );
        const response = await invitationHandler(request, {
          params: Promise.resolve({ token: 'test-invitation-accepted-token' }),
        });

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain(
          '/auth/signin?invitation=test-invitation-accepted-token'
        );
      });
    });

    describe('URL encoding fix verification', () => {
      it('should properly encode email addresses in redirect URLs', async () => {
        await db.invitation.create({
          data: {
            email: 'user+test@example.com',
            token: 'test-encoding-token',
            type: 'branch',
            status: 'SENT',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            senderId: branchOwnerId,
            branchId: testBranchId,
            sentAt: new Date(),
          },
        });

        const request = new Request(
          'http://localhost/api/auth/magic-link?token=test-encoding-token'
        );
        const response = await magicLinkHandler(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');

        // Check that email is properly encoded (+ becomes %2B, @ becomes %40)
        expect(location).toContain('email=user%2Btest%40example.com');
        // Ensure we don't have double-encoding
        expect(location).not.toContain('%2540'); // Double-encoded @
      });
    });
  });
}

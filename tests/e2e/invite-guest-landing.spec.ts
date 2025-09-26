import { test, expect } from '@playwright/test';

import { db } from '../../src/lib/db';

test.describe('Invite Guest Landing Flow', () => {
  test.beforeAll(async () => {
    // Ensure we have DB configured and reachable, otherwise skip to avoid hangs
    if (!process.env.DATABASE_URL) {
      test.skip();
    }
    try {
      // Quick connectivity check with short timeout
      await Promise.race([
        db.$queryRaw`SELECT 1` as Promise<unknown>,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('db-timeout')), 2000)
        ),
      ]);
    } catch {
      test.skip();
    }
  });

  const inviteeEmail = `invitee-guest-${Date.now()}@example.com`;
  let libraryId: string;
  let ownerId: string;

  test.beforeEach(async () => {
    // Cleanup any previous artifacts for this email
    await db.invitation.deleteMany({ where: { email: inviteeEmail } });
    await db.user.deleteMany({ where: { email: inviteeEmail } });

    // Create a library owner and a library to invite into
    const owner = await db.user.create({
      data: {
        email: `owner-${Date.now()}@example.com`,
        name: 'E2E Owner',
        profileCompleted: true,
      },
    });
    ownerId = owner.id;

    const lib = await db.collection.create({
      data: {
        name: 'Invite Test Library',
        description: 'Library used to verify invite landing',
        ownerId,
      },
    });
    libraryId = lib.id;
  });

  test('guest invite sets cookies, shows collection, then after auth lands on collection (currently failing)', async ({
    page,
  }) => {
    // Arrange: Create an invitation for the invitee
    const token = `invite-token-${Date.now()}`;
    await db.invitation.create({
      data: {
        email: inviteeEmail,
        token,
        type: 'library',
        status: 'SENT',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        senderId: ownerId,
        libraryId,
        sentAt: new Date(),
      },
    });

    // Act: Open the invite link as a signed-out user; should set httpOnly cookies and redirect to collection in guest mode
    await page.goto(`/invite/${token}`);
    await page.waitForURL(new RegExp(`/collection/${libraryId}.*`), {
      timeout: 15000,
    });
    expect(page.url()).toContain(`/collection/${libraryId}`);

    // Now authenticate as the invitee (to exercise the auth callback path)
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', inviteeEmail);
    await page.click('button[type="submit"]');

    // Should reach code entry; fetch code from DB
    await expect(page.getByText('Enter your code')).toBeVisible();
    const codeRecord = await db.authCode.findUnique({
      where: { email: inviteeEmail },
    });
    expect(codeRecord).toBeTruthy();
    await page.fill('input[name="code"]', codeRecord!.code);
    await page.click('button[type="submit"]');

    // Expectation: After auth, we should be taken back to the invited collection
    // NOTE: This currently fails because the auth callback reads client cookies,
    // but invite cookies are httpOnly and not accessible client-side.
    await page.waitForURL(new RegExp(`/collection/${libraryId}$`), {
      timeout: 20000,
    });
    expect(page.url()).toBe(`http://localhost:3001/collection/${libraryId}`);
  });
});

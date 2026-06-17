import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/admin-auth';

// Deliberately throws so we can verify Sentry capture end-to-end.
// Visit /api/admin/sentry-test as an admin after setting SENTRY_DSN;
// the error should appear in the Sentry project within seconds.
export async function GET() {
  try {
    await requireAdminAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  throw new Error('Sentry verification error (intentional, admin-triggered)');
}

import { getServerSession } from 'next-auth';

import { authOptions } from './auth';

const ADMIN_GITHUB_USERNAMES = ['mcull'];

export async function requireAdminAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Authentication required');
  }

  // In non-production environments (local dev, preview), allow any authenticated user
  // to access admin for testing unless explicitly disabled.
  if (process.env.NODE_ENV !== 'production') {
    return session;
  }

  const githubUsername = (session.user as any).githubUsername;

  if (!githubUsername || !ADMIN_GITHUB_USERNAMES.includes(githubUsername)) {
    throw new Error('Admin access denied');
  }

  return session;
}

export function isAdmin(session: any): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return Boolean(session?.user);
  }
  const githubUsername = (session?.user as any)?.githubUsername;
  return Boolean(
    githubUsername && ADMIN_GITHUB_USERNAMES.includes(githubUsername)
  );
}

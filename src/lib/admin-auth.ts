import { getServerSession } from 'next-auth';

import { authOptions } from './auth';

const ADMIN_GITHUB_USERNAMES = ['mcull'];

export async function requireAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }

  const githubUsername = (session.user as any).githubUsername;
  
  if (!githubUsername || !ADMIN_GITHUB_USERNAMES.includes(githubUsername)) {
    throw new Error('Admin access denied');
  }

  return session;
}

export function isAdmin(session: any): boolean {
  const githubUsername = session?.user?.githubUsername;
  return githubUsername && ADMIN_GITHUB_USERNAMES.includes(githubUsername);
}
import { getServerSession } from 'next-auth';

import { authOptions } from './auth';

const ADMIN_GITHUB_USERNAMES = ['mcull'];

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(session: any): boolean {
  const user = session?.user;
  if (!user) return false;

  const githubUsername = user.githubUsername;
  if (githubUsername && ADMIN_GITHUB_USERNAMES.includes(githubUsername)) {
    return true;
  }

  const email = user.email?.toLowerCase();
  if (email && adminEmails().includes(email)) {
    return true;
  }

  return false;
}

export async function requireAdminAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error('Authentication required');
  }

  if (!isAdmin(session)) {
    throw new Error('Admin access denied');
  }

  return session;
}

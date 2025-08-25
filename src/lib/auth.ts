import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';

import { verifyAuthCode } from './auth-codes';
import { db } from './db';
import { env } from './env';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 90 * 24 * 60 * 60, // 90 days
    updateAge: 7 * 24 * 60 * 60, // Update session if older than 7 days
  },
  providers: [
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      })
    ] : []),
    CredentialsProvider({
      id: 'email-code',
      name: 'Email Code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        try {
          // Verify the auth code
          const isValidCode = await verifyAuthCode(
            credentials.email,
            credentials.code
          );

          if (!isValidCode) {
            return null;
          }

          // Clear rate limit on successful verification
          try {
            const { sendCodeLimiter } = await import('./auth-rate-limit');
            sendCodeLimiter.reset(credentials.email);
          } catch {
            // ignore rate limit reset errors
          }

          // Find or create user
          const user = await db.user.upsert({
            where: { email: credentials.email },
            update: {
              emailVerified: new Date(),
              updatedAt: new Date(),
            },
            create: {
              email: credentials.email,
              emailVerified: new Date(),
              profileCompleted: false,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          };
        } catch {
          console.error('Auth code verification error');
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  callbacks: {
    async signIn() {
      // Always allow sign in - we'll handle redirects elsewhere
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allow same-origin URLs through unchanged (e.g., /auth/callback)
      if (url.startsWith(baseUrl)) {
        return url;
      }
      if (url.startsWith('/')) {
        return new URL(url, baseUrl).toString();
      }

      // Safe fallback to site root
      return baseUrl;
    },
    async session({ token, session }: { token: any; session: any }) {
      if (token && session.user) {
        (session.user as any).id = token.sub!;
        // Add GitHub username for admin access control
        if (token.githubUsername) {
          (session.user as any).githubUsername = token.githubUsername;
        }
      }
      return session;
    },
    async jwt({ user, token, account }) {
      if (user) {
        token.sub = user.id;
        // Store GitHub username for admin access
        if (account?.provider === 'github' && user.email) {
          // Extract GitHub username from GitHub profile
          try {
            const response = await fetch(`https://api.github.com/user`, {
              headers: {
                'Authorization': `token ${account.access_token}`,
                'User-Agent': 'StuffLibrary-Admin'
              }
            });
            if (response.ok) {
              const githubUser = await response.json();
              token.githubUsername = githubUser.login;
            }
          } catch (error) {
            console.warn('Failed to fetch GitHub username:', error);
          }
        }
      }
      return token;
    },
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 90 * 24 * 60 * 60, // 90 days
      },
    },
  },
  events: {
    async signIn() {
      console.log('User signed in - session will persist for 90 days');
    },
  },
  secret: env.NEXTAUTH_SECRET,
};

import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { verifyAuthCode } from './auth-codes';
import { db } from './db';
import { env } from './env';


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  providers: [
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
          const isValidCode = await verifyAuthCode(credentials.email, credentials.code);
          
          if (!isValidCode) {
            return null;
          }

          // Clear rate limit on successful verification
          try {
            const { sendCodeLimiter } = await import('../app/api/auth/send-code/route');
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
      }
      return session;
    },
    async jwt({ user, token }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  secret: env.NEXTAUTH_SECRET,
};

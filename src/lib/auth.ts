import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { Resend } from 'resend';

import { db } from './db';
import { env } from './env';

const resend = new Resend(env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    EmailProvider({
      server: {
        host: 'smtp.resend.com',
        port: 587,
        auth: {
          user: 'resend',
          pass: env.RESEND_API_KEY,
        },
      },
      from: 'StuffLibrary <noreply@stufflibrary.com>',
      async sendVerificationRequest({ identifier, url }) {
        try {
          await resend.emails.send({
            from: 'StuffLibrary <noreply@stufflibrary.com>',
            to: identifier,
            subject: 'Sign in to StuffLibrary',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb; text-align: center;">Welcome to StuffLibrary</h1>
                <p>Click the link below to sign in to your account:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${url}" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Sign in to StuffLibrary
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  If you didn't request this email, you can safely ignore it.
                  This link will expire in 24 hours.
                </p>
              </div>
            `,
          });
        } catch (error) {
          console.error('Error sending verification email:', error);
          throw new Error('Failed to send verification email');
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
    async session({ token, session }) {
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

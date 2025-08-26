import type { Metadata } from 'next';
import { Roboto, Space_Grotesk } from 'next/font/google';
import localFont from 'next/font/local';

import { ClientThemeProvider } from '@/components/ClientThemeProvider';
import { ConditionalFooter } from '@/components/ConditionalFooter';
import { ConditionalHeader } from '@/components/ConditionalHeader';
import { ProfileDraftCleanup } from '@/components/ProfileDraftCleanup';
import NextAuthSessionProvider from '@/components/providers/session-provider';

import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/syne-mono/400.css';
import '@fontsource/special-elite/400.css';
import '@/styles/vintage-fonts.css';
import './globals.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

const spaceGrotesk = Space_Grotesk({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const impactLabel = localFont({
  src: './fonts/ImpactLabel-lVYZ.ttf',
  variable: '--font-impact-label',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StuffLibrary.org',
  description:
    'Share more, buy less. A platform for neighbors to safely share under-used items.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${spaceGrotesk.variable} ${impactLabel.variable}`}
      >
        <NextAuthSessionProvider>
          <ClientThemeProvider>
            <ProfileDraftCleanup />
            <ConditionalHeader />
            {children}
            <ConditionalFooter />
          </ClientThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}

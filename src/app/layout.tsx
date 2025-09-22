import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Roboto_Mono, Merriweather, Inter } from 'next/font/google';
import localFont from 'next/font/local';

import { ClientThemeProvider } from '@/components/ClientThemeProvider';
import { ConditionalFooter } from '@/components/ConditionalFooter';
import { ConditionalHeader } from '@/components/ConditionalHeader';
import { FloatingFeedbackFab } from '@/components/FloatingFeedbackFab';
import { MainContentArea } from '@/components/MainContentArea';
import { ProfileDraftCleanup } from '@/components/ProfileDraftCleanup';
import NextAuthSessionProvider from '@/components/providers/session-provider';

import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/merriweather/300.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/merriweather/900.css';
import '@fontsource/roboto-mono/300.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/500.css';
import '@fontsource/roboto-mono/700.css';
import '@/styles/vintage-fonts.css';
import './globals.css';

const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-merriweather',
});

const robotoMono = Roboto_Mono({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});

const inter = Inter({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-inter',
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
        className={`${merriweather.variable} ${robotoMono.variable} ${inter.variable} ${impactLabel.variable}`}
      >
        <NextAuthSessionProvider>
          <ClientThemeProvider>
            <ProfileDraftCleanup />
            <ConditionalHeader />
            <MainContentArea>
              {children}
              <FloatingFeedbackFab />
            </MainContentArea>
            <ConditionalFooter />
          </ClientThemeProvider>
        </NextAuthSessionProvider>
        <Analytics />
      </body>
    </html>
  );
}

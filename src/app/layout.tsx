import type { Metadata } from 'next';
import { Roboto, Space_Grotesk } from 'next/font/google';
import localFont from 'next/font/local';

import { ClientThemeProvider } from '@/components/ClientThemeProvider';
import { ConditionalFooter } from '@/components/ConditionalFooter';
import { ConditionalHeader } from '@/components/ConditionalHeader';
import NextAuthSessionProvider from '@/components/providers/session-provider';

import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${spaceGrotesk.variable} ${impactLabel.variable}`}>
        <NextAuthSessionProvider>
          <ClientThemeProvider>
            <ConditionalHeader />
            {children}
            <ConditionalFooter />
          </ClientThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}

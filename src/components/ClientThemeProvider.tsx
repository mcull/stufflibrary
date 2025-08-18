'use client';

import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import EmotionRegistry from '@/lib/emotion';
import { theme } from '@/lib/theme';

export function ClientThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EmotionRegistry>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </EmotionRegistry>
  );
}

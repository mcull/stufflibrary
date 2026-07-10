'use client';

import { Box, Container, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { brandColors, spacing } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';

interface CivicPageProps {
  title: string;
  /** Small mono kicker above the title, e.g. "FROM THE REFERENCE DESK". */
  kicker?: string;
  /** Visible freshness line, e.g. "Snapshot: July 2026" (BUILD_SPEC §Freshness). */
  snapshot?: string;
  children: ReactNode;
}

/**
 * Shared frame for the quiet civic pages (docs/content/BUILD_SPEC.md):
 * text-first, fast, styled like a good librarian's handout.
 */
export function CivicPage({
  title,
  kicker,
  snapshot,
  children,
}: CivicPageProps) {
  return (
    <Box
      sx={{
        backgroundColor: brandColors.warmCream,
        minHeight: '100vh',
        py: { xs: spacing.sm, md: spacing.lg },
      }}
    >
      <Container maxWidth="md">
        <Box component="header" sx={{ mb: 5 }}>
          {kicker && (
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '13px',
                letterSpacing: '0.18em',
                color: brandColors.tomatoRed,
                mb: 2,
              }}
            >
              {kicker}
            </Typography>
          )}
          <Typography
            component="h1"
            sx={{
              fontFamily: TYPEWRITER,
              fontSize: { xs: '34px', md: '46px' },
              lineHeight: 1.15,
              color: brandColors.inkBlue,
              m: 0,
            }}
          >
            {title}
          </Typography>
          {snapshot && (
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '13px',
                color: 'rgba(63,52,43,0.6)',
                mt: 2,
              }}
            >
              {snapshot}
            </Typography>
          )}
        </Box>
        {children}
      </Container>
    </Box>
  );
}

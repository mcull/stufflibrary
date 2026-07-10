'use client';

import { Box, Typography } from '@mui/material';

import { CivicMarkdown } from '@/components/civic/CivicMarkdown';
import { CivicPage } from '@/components/civic/CivicPage';
import type { FaqCategory } from '@/data/faq';
import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';

export function FaqContent({ categories }: { categories: FaqCategory[] }) {
  return (
    <CivicPage kicker="ASK A LIBRARIAN" title="Frequently Asked Questions">
      {categories.map((category) => (
        <Box key={category.title} component="section" sx={{ mb: 6 }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: TYPEWRITER,
              fontSize: { xs: '25px', md: '30px' },
              color: brandColors.inkBlue,
              borderBottom: `2px solid ${brandColors.inkBlue}`,
              pb: 1,
              mb: 3,
            }}
          >
            {category.title}
          </Typography>
          {category.entries.map((entry) => (
            <Box key={entry.question} sx={{ mb: 4 }}>
              <Typography
                component="h3"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '17px', md: '18px' },
                  color: brandColors.inkBlue,
                  mb: 1,
                }}
              >
                {entry.question}
              </Typography>
              <CivicMarkdown content={entry.answer} />
            </Box>
          ))}
        </Box>
      ))}
    </CivicPage>
  );
}

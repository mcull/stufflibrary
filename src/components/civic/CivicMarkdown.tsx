'use client';

import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';

/**
 * Renders the civic pages' markdown (src/content/*.md) in the brand voice:
 * generous prose, modest headings, internal links inherit tomato underlines.
 * Styling lives on the wrapper so ReactMarkdown can stay element-plain.
 */
export function CivicMarkdown({ content }: { content: string }) {
  return (
    <Box
      sx={{
        color: 'rgba(63,52,43,0.92)',
        fontSize: { xs: '16px', md: '17px' },
        lineHeight: 1.65,
        '& p': { m: '0 0 1.2em' },
        '& h2': {
          fontFamily: TYPEWRITER,
          fontWeight: 400,
          fontSize: { xs: '25px', md: '30px' },
          color: brandColors.inkBlue,
          m: '1.8em 0 0.6em',
          lineHeight: 1.25,
        },
        '& h3': {
          fontFamily: TYPEWRITER,
          fontWeight: 400,
          fontSize: { xs: '20px', md: '23px' },
          color: brandColors.inkBlue,
          m: '1.6em 0 0.5em',
          lineHeight: 1.3,
        },
        '& a': {
          color: brandColors.inkBlue,
          textDecorationColor: brandColors.mustardYellow,
          textDecorationThickness: '2px',
          textUnderlineOffset: '3px',
          overflowWrap: 'anywhere',
          '&:hover': { color: brandColors.tomatoRed },
        },
        '& ul, & ol': { m: '0 0 1.2em', pl: '1.4em' },
        '& li': { mb: '0.6em' },
        '& hr': {
          border: 'none',
          borderTop: `1px solid rgba(63,52,43,0.2)`,
          m: '2.5em auto',
          width: '60%',
        },
        '& blockquote': {
          m: '0 0 1.2em',
          pl: '1em',
          borderLeft: `3px solid ${brandColors.mustardYellow}`,
          fontStyle: 'italic',
        },
        '& strong': { color: brandColors.inkBlue },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  );
}

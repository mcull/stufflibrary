'use client';

import { Typography, Link, Box } from '@mui/material';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  variant?: 'body1' | 'body2' | 'caption';
  sx?: object;
}

export function ExpandableText({
  text,
  maxLength = 200,
  variant = 'body1',
  sx = {},
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If text is shorter than maxLength, show it all
  if (text.length <= maxLength) {
    return (
      <Typography variant={variant} sx={sx}>
        {text}
      </Typography>
    );
  }

  // Find a good break point (prefer end of sentence or word)
  const findBreakPoint = (str: string, limit: number): number => {
    if (str.length <= limit) return str.length;

    // Look for sentence end within reasonable range
    const sentenceEnd = str.lastIndexOf('.', limit + 30);
    if (sentenceEnd > limit - 50 && sentenceEnd < limit + 30) {
      return sentenceEnd + 1;
    }

    // Look for word boundary
    const spaceIndex = str.lastIndexOf(' ', limit);
    return spaceIndex > limit - 30 ? spaceIndex : limit;
  };

  const breakPoint = findBreakPoint(text, maxLength);
  const truncatedText = text.substring(0, breakPoint).trim();
  const remainingText = text.substring(breakPoint).trim();

  return (
    <Typography variant={variant} sx={sx}>
      {isExpanded ? (
        <Box component="span">
          {text}{' '}
          <Link
            component="button"
            variant="inherit"
            onClick={() => setIsExpanded(false)}
            sx={{
              color: brandColors.inkBlue,
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: 'inherit',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Show less
          </Link>
        </Box>
      ) : (
        <Box component="span">
          {truncatedText}
          {remainingText && '...'}{' '}
          <Link
            component="button"
            variant="inherit"
            onClick={() => setIsExpanded(true)}
            sx={{
              color: brandColors.inkBlue,
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: 'inherit',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Show more
          </Link>
        </Box>
      )}
    </Typography>
  );
}

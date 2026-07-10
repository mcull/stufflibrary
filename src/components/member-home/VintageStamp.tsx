'use client';

import { Box } from '@mui/material';

import { vintageFonts } from './vintageTokens';

interface VintageStampProps {
  label: string;
  ink: string;
  rotation?: number;
  fontSize?: number;
  borderWidth?: number;
  letterSpacing?: string;
}

/** A rubber stamp: bordered, tilted, slightly under-inked. */
export function VintageStamp({
  label,
  ink,
  rotation = -3,
  fontSize = 11.5,
  borderWidth = 2,
  letterSpacing = '0.12em',
}: VintageStampProps) {
  return (
    <Box
      component="span"
      sx={{
        border: `${borderWidth}px solid ${ink}`,
        color: ink,
        fontFamily: vintageFonts.stamp,
        fontSize: `${fontSize}px`,
        letterSpacing,
        padding: '2px 8px',
        borderRadius: '3px',
        display: 'inline-block',
        transform: `rotate(${rotation}deg)`,
        opacity: 0.85,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

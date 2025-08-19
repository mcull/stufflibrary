import { Typography, Box } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

interface WordmarkProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white';
  className?: string;
}

export function Wordmark({
  size = 'medium',
  color = 'primary',
  className,
}: WordmarkProps) {
  const sizeMap = {
    small: 'h5',
    medium: 'h3',
    large: 'h1',
  } as const;

  const colorMap = {
    primary: brandColors.inkBlue,
    white: brandColors.white,
  } as const;

  return (
    <Box className={className} sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography
        variant={sizeMap[size]}
        component="span"
        sx={{
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 700,
          color: colorMap[color],
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        Stuff
      </Typography>
      <Typography
        variant={sizeMap[size]}
        component="span"
        sx={{
          fontFamily: 'var(--font-space-grotesk)',
          fontWeight: 400,
          color: colorMap[color],
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        Library
      </Typography>
    </Box>
  );
}

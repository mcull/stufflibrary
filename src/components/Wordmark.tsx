import { Typography, Box } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

interface WordmarkProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white';
  className?: string;
  showIcon?: boolean;
}

export function Wordmark({
  size = 'medium',
  color = 'primary',
  className,
  showIcon: _showIcon = true,
}: WordmarkProps) {
  const sizeMap = {
    small: 'h5',
    medium: 'h3',
    large: 'h1',
  } as const;

  const colorMap = {
    primary: 'tomato',
    white: brandColors.white,
  } as const;


  return (
    <Box className={className} sx={{ display: 'flex', alignItems: 'center' }}>
      <Typography
        variant={sizeMap[size]}
        component="span"
        sx={{
          fontFamily: 'var(--font-impact-label)',
          fontWeight: 400,
          color: colorMap[color],
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}
      >
        StuffLibrary
      </Typography>
    </Box>
  );
}
